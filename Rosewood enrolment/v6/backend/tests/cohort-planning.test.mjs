import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { createService, staffCohortForecast } from "../service.mjs";

const now = Date.parse("2026-09-02T03:00:00.000Z");
const tokenHash = value => crypto.createHash("sha256").update(value).digest("hex");

function event(route, method = "GET", body, sessionToken = "staff-token") {
  return {
    rawPath: route,
    headers: { origin: "https://ffe.org.au", authorization: `Bearer ${sessionToken}` },
    requestContext: { http: { method, path: route, sourceIp: "192.0.2.44" } },
    ...(body ? { body: JSON.stringify(body) } : {})
  };
}

class PlanningStore {
  constructor(role = "admin") {
    this.sessions = new Map([[tokenHash("staff-token"), { scope: "staff", email: "planner@ffe.org.au", role, expiresAt: now + 3_600_000 }]]);
    this.families = new Map();
    this.children = new Map();
    this.links = new Map();
    this.applications = new Map();
    this.audit = [];
  }
  childKey(familyId, childId) { return `${familyId}:${childId}`; }
  async getSession(hash) { return this.sessions.get(hash) || null; }
  async touchSession(hash) { return this.sessions.get(hash) || null; }
  async recordAudit(value) { this.audit.push(structuredClone(value)); }
  async enqueue() {}
  async listOutbox() { return []; }
  async listOperationalRecords() { return [...this.applications.values()].map(data => ({ entity: "application", data: structuredClone(data) })); }
  async listProspectRecords() {
    return [
      ...[...this.families.values()].map(data => ({ entity: "prospect_family", data: structuredClone(data) })),
      ...[...this.children.values()].map(data => ({ entity: "prospect_child", data: structuredClone(data) }))
    ];
  }
  async listProspectChildren(familyId) { return [...this.children.values()].filter(child => child.familyId === familyId).map(child => structuredClone(child)); }
  async getProspectFamily(id) { return structuredClone(this.families.get(id) || null); }
  async getProspectChild(familyId, childId) { return structuredClone(this.children.get(this.childKey(familyId, childId)) || null); }
  async getProspectApplicationLink(applicationId) { return structuredClone(this.links.get(applicationId) || null); }
  async getApplication(id) { return structuredClone(this.applications.get(id) || null); }
  async saveProspectFamily({ family, children, removedChildIds, expectedRevision, auditEvents }) {
    assert.equal(Number(this.families.get(family.id)?.revision || 0), Number(expectedRevision));
    this.families.set(family.id, structuredClone(family));
    children.forEach(child => this.children.set(this.childKey(family.id, child.id), structuredClone(child)));
    removedChildIds.forEach(childId => this.children.delete(this.childKey(family.id, childId)));
    this.audit.push(...auditEvents.map(item => structuredClone(item)));
  }
  async archiveProspectFamily({ family, expectedRevision, auditEvents }) {
    assert.equal(this.families.get(family.id)?.revision, expectedRevision);
    this.families.set(family.id, structuredClone(family));
    this.audit.push(...auditEvents.map(item => structuredClone(item)));
  }
  async linkProspectApplication({ familyId, child, previousApplicationId, applicationId, expectedChildRevision, auditEvents }) {
    const current = this.children.get(this.childKey(familyId, child.id));
    assert.equal(current.revision, expectedChildRevision);
    if (previousApplicationId) this.links.delete(previousApplicationId);
    if (applicationId) {
      assert.equal(this.links.has(applicationId), false);
      this.links.set(applicationId, { applicationId, familyId, childId: child.id });
    }
    this.children.set(this.childKey(familyId, child.id), structuredClone(child));
    this.audit.push(...auditEvents.map(item => structuredClone(item)));
  }
}

function serviceFor(role = "admin") {
  const store = new PlanningStore(role);
  const sent = [];
  const service = createService({
    store,
    drive: {},
    sheets: { async apply() {} },
    mailer: { async send(message) { sent.push(message); return { messageId: "ses-synthetic" }; } },
    env: {
      ALLOWED_ORIGINS: "https://ffe.org.au",
      STAFF_EMAILS: "planner@ffe.org.au",
      STAFF_ROLES: `planner@ffe.org.au=${role}`,
      OTP_HMAC_SECRET: "synthetic-otp-secret",
      NETWORK_HMAC_SECRET: "synthetic-network-secret",
      APPLICATION_PAGE_URL: "https://ffe.org.au/pages/rosewood-enrolment-v6.html",
      APPLICATION_SIGNING_PAGE_URL: "https://ffe.org.au/pages/rosewood-application-sign-v6.html"
    },
    clock: () => now
  });
  return { service, store, sent };
}

function validProspect(overrides = {}) {
  return {
    expectedRevision: 0,
    contactName: "Synthetic Planning Parent",
    email: "synthetic.planning@example.test",
    phone: "0400000000",
    contactPermission: true,
    planningStatus: "expected_to_apply",
    source: "community_connection",
    relationship: "Synthetic verification record",
    owner: "planner@ffe.org.au",
    nextFollowUp: "2026-09-10",
    notes: "Synthetic planning note only.",
    children: [{ name: "Synthetic Planning Child", entryYear: "2027", entryLevel: "Foundation (Prep)" }],
    ...overrides
  };
}

function application(id, overrides = {}) {
  return {
    id,
    recipientEmail: "sample.family@example.com",
    status: "in_progress",
    createdAt: "2026-09-01T00:00:00.000Z",
    values: { student_first: "Sample", student_last: "Child", app_guardian_0_first: "Sample", app_guardian_0_last: "Parent", entry_year: "2027", entry_level: "Foundation (Prep)" },
    ...overrides
  };
}

test("combined forecast excludes linked prospects and test applications", () => {
  const forecast = staffCohortForecast([
    { applicationId: "app-family", entryYear: "2027", entryLevel: "Foundation (Prep)", recordCategory: "family" },
    { applicationId: "app-test", entryYear: "2027", entryLevel: "Foundation (Prep)", recordCategory: "test" }
  ], [
    { planningStatus: "expected_to_apply", children: [{ entryYear: "2027", entryLevel: "Foundation (Prep)", linkedApplicationId: "app-family" }, { entryYear: "2027", entryLevel: "Year 1" }] },
    { planningStatus: "possible", children: [{ entryYear: "2027", entryLevel: "Foundation (Prep)" }] },
    { planningStatus: "research_needed", children: [{ entryYear: "2028", entryLevel: "Year 2" }] },
    { planningStatus: "not_proceeding", children: [{ entryYear: "2027", entryLevel: "Year 3" }] }
  ]);
  assert.deepEqual(forecast.totals, { applications: 1, expectedProspects: 1, possibleProspects: 1, otherProspects: 1, potentialTotal: 4 });
  assert.equal(forecast.linkedProspectChildren, 1);
  assert.equal(forecast.rows.find(row => row.entryLevel === "Foundation (Prep)").potentialTotal, 2);
});

test("admin creates a separate prospect family without sending email", async () => {
  const { service, store, sent } = serviceFor("admin");
  const response = await service(event("/v6/staff/prospects", "POST", validProspect()));
  assert.equal(response.statusCode, 200);
  const family = JSON.parse(response.body).family;
  assert.equal(family.contactPermission, true);
  assert.equal(family.children.length, 1);
  assert.equal(family.revision, 1);
  assert.equal(sent.length, 0);
  assert.equal(store.audit.at(-1).type, "prospect.family_created");
  assert.equal(JSON.stringify(store.audit).includes("synthetic.planning@example.test"), false);

  const cohort = await service(event("/v6/staff/cohort-planning"));
  assert.equal(cohort.statusCode, 200);
  assert.equal(JSON.parse(cohort.body).forecast.totals.expectedProspects, 1);
});

test("planning editor can write while viewer remains read only", async () => {
  const editor = serviceFor("planning_editor");
  assert.equal((await editor.service(event("/v6/staff/prospects", "POST", validProspect()))).statusCode, 200);
  const viewer = serviceFor("viewer");
  assert.equal((await viewer.service(event("/v6/staff/cohort-planning"))).statusCode, 200);
  const denied = await viewer.service(event("/v6/staff/prospects", "POST", validProspect()));
  assert.equal(denied.statusCode, 403);
  assert.equal(JSON.parse(denied.body).error, "STAFF_ACCESS_DENIED");
});

test("prospect validation requires explicit permission, email and a child cohort", async () => {
  const { service } = serviceFor();
  for (const [overrides, code] of [
    [{ contactPermission: null }, "CONTACT_PERMISSION_REQUIRED"],
    [{ email: "not-an-email" }, "INVALID_EMAIL"],
    [{ children: [] }, "PROSPECT_CHILD_REQUIRED"],
    [{ children: [{ entryYear: "2027", entryLevel: "Year 6" }] }, "INVALID_ENTRY_LEVEL"]
  ]) {
    const response = await service(event("/v6/staff/prospects", "POST", validProspect(overrides)));
    assert.equal(response.statusCode, 422);
    assert.equal(JSON.parse(response.body).error, code);
  }
});

test("an active prospective-family email cannot be duplicated", async () => {
  const { service } = serviceFor();
  assert.equal((await service(event("/v6/staff/prospects", "POST", validProspect()))).statusCode, 200);
  const duplicate = await service(event("/v6/staff/prospects", "POST", validProspect({ contactName: "Another Synthetic Parent" })));
  assert.equal(duplicate.statusCode, 409);
  assert.equal(JSON.parse(duplicate.body).error, "PROSPECT_EMAIL_EXISTS");
});

test("application linking is deliberate, unique, reversible and does not alter the application", async () => {
  const { service, store, sent } = serviceFor();
  store.applications.set("app-one", application("app-one"));
  const createdOne = JSON.parse((await service(event("/v6/staff/prospects", "POST", validProspect()))).body).family;
  const createdTwo = JSON.parse((await service(event("/v6/staff/prospects", "POST", validProspect({ email: "second.synthetic@example.test", contactName: "Second Synthetic Parent" })))).body).family;
  const originalApplication = structuredClone(store.applications.get("app-one"));

  const linked = await service(event("/v6/staff/prospects/application-link", "POST", { familyId: createdOne.id, childId: createdOne.children[0].id, expectedChildRevision: 1, applicationId: "app-one", confirmation: "Confirm application link" }));
  assert.equal(linked.statusCode, 200);
  assert.equal(JSON.parse(linked.body).child.linkedApplicationId, "app-one");
  assert.deepEqual(store.applications.get("app-one"), originalApplication);

  const duplicate = await service(event("/v6/staff/prospects/application-link", "POST", { familyId: createdTwo.id, childId: createdTwo.children[0].id, expectedChildRevision: 1, applicationId: "app-one", confirmation: "Confirm application link" }));
  assert.equal(duplicate.statusCode, 409);
  assert.equal(JSON.parse(duplicate.body).error, "APPLICATION_ALREADY_LINKED");

  const unlinked = await service(event("/v6/staff/prospects/application-link", "POST", { familyId: createdOne.id, childId: createdOne.children[0].id, expectedChildRevision: 2, applicationId: "", confirmation: "Confirm application link" }));
  assert.equal(unlinked.statusCode, 200);
  assert.equal(JSON.parse(unlinked.body).child.linkedApplicationId, "");
  assert.equal(store.links.has("app-one"), false);
  assert.equal(sent.length, 0);
});

test("archiving preserves the record and removes it from active forecasting", async () => {
  const { service, store } = serviceFor();
  const created = JSON.parse((await service(event("/v6/staff/prospects", "POST", validProspect()))).body).family;
  const archived = await service(event("/v6/staff/prospects/archive", "POST", { familyId: created.id, expectedRevision: 1, confirmation: "Archive prospective family" }));
  assert.equal(archived.statusCode, 200);
  assert.ok(JSON.parse(archived.body).family.archivedAt);
  assert.ok(store.families.has(created.id));
  const cohortResponse = await service(event("/v6/staff/cohort-planning"));
  const cohort = JSON.parse(cohortResponse.body);
  assert.equal(cohort.forecast.totals.potentialTotal, 0);
});
