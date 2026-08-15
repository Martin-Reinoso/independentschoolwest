import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { buildApplicationReview } from "../application-review.mjs";
import { additionalGuardianSignatureRecipients, createService, queueMissingGuardianSignatureInvitations } from "../service.mjs";

function request(body) {
  return {
    rawPath: "/v6/application/signatures/submit",
    requestContext: { http: { method: "POST", sourceIp: "192.0.2.1" } },
    headers: { origin: "https://ffe.org.au", authorization: "Bearer synthetic-session" },
    body: JSON.stringify(body)
  };
}

test("guardian signing requires server-side review acknowledgement", async () => {
  const handler = createService({
    store: {
      getSession: async () => ({
        scope: "application_signature",
        applicationId: "app-synthetic",
        expiresAt: Date.now() + 60_000
      })
    },
    drive: {},
    sheets: {},
    mailer: {},
    env: {
      ALLOWED_ORIGINS: "https://ffe.org.au",
      OTP_HMAC_SECRET: "synthetic-otp-secret",
      NETWORK_HMAC_SECRET: "synthetic-network-secret",
      APPLICATION_SIGNING_PAGE_URL: "https://ffe.org.au/pages/rosewood-application-sign-v6.html"
    }
  });

  const response = await handler(request({
    ipAcknowledged: true,
    termsAcknowledged: true,
    signatureDataUrl: "data:image/png;base64,invalid"
  }));
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.equal(payload.error, "REVIEW_REQUIRED");
});

test("explicit do-not-contact permission suppresses the signature recipient", () => {
  const recipients = additionalGuardianSignatureRecipients({
    app_guardian_1_first: "Taylor",
    app_guardian_1_email: " TAYLOR@EXAMPLE.TEST ",
    app_guardian_1_permission: "No, do not contact this person"
  }, 2, "rosewood-application-2026.6");

  assert.deepEqual(recipients, []);
});

test("explicit contact permission creates a required electronic signer", () => {
  const recipients = additionalGuardianSignatureRecipients({
    app_guardian_1_first: "Taylor",
    app_guardian_1_email: " TAYLOR@EXAMPLE.TEST ",
    app_guardian_1_permission: "Yes, the school may contact this person"
  }, 2, "rosewood-application-2026.6");

  assert.deepEqual(recipients, [{ index: 1, email: "taylor@example.test", firstName: "Taylor", contactPermission: true, signatureRequired: true }]);
});

test("recovery never queues a prohibited guardian signature request", async () => {
  let queued;
  const application = {
    id: "app-synthetic",
    invitationId: "invite-synthetic",
    status: "pending_signatures",
    revision: 8,
    revisionHash: "revision-hash",
    guardianCount: 2,
    guardianIds: ["guardian-primary", "guardian-additional"],
    signatures: [{ guardianId: "guardian-primary" }],
    formVersion: "rosewood-application-2026.6",
    values: {
      student_first: "Avery",
      student_last: "Example",
      app_guardian_1_first: "Taylor",
      app_guardian_1_email: "taylor@example.test",
      app_guardian_1_permission: "No, do not contact this person"
    }
  };
  const store = {
    getApplication: async () => application,
    listSignatureTasksForApplication: async () => [],
    addSignatureTasks: async input => { queued = input; }
  };

  const result = await queueMissingGuardianSignatureInvitations({
    store,
    applicationId: application.id,
    signingPageUrl: "https://ffe.org.au/pages/rosewood-application-sign-v6.html",
    actorId: "synthetic-operator",
    clock: () => Date.parse("2026-08-08T00:00:00.000Z")
  });

  assert.equal(result.queuedSignatureRequests, 0);
  assert.equal(queued, undefined);
  assert.equal(application.values.app_guardian_1_permission, "No, do not contact this person");
});

test("recovery atomically binds a permitted replacement task to its signer control", async () => {
  let queued;
  const application = {
    id: "app-recovery-synthetic",
    invitationId: "invite-recovery-synthetic",
    status: "pending_signatures",
    revision: 4,
    revisionHash: "recovery-revision-hash",
    formVersion: "rosewood-application-2026.6",
    guardianCount: 2,
    emergencyCount: 2,
    guardianIds: ["guardian-primary", "guardian-additional"],
    requiredSignatureCount: 2,
    signatureControlRevision: 1,
    signatures: [{ guardianId: "guardian-primary" }],
    signerControls: [
      { guardianId: "guardian-primary", guardianIndex: 0, contactPermission: true, signatureRequired: true, signatureStatus: "complete" },
      { guardianId: "guardian-additional", guardianIndex: 1, contactPermission: true, signatureRequired: true, signatureStatus: "pending", requestGeneration: 0 }
    ],
    values: {
      student_first: "Avery",
      student_last: "Example",
      app_guardian_0_first: "Alex",
      app_guardian_0_last: "Applicant",
      app_guardian_1_first: "Taylor",
      app_guardian_1_last: "Guardian",
      app_guardian_1_email: "taylor@example.test",
      app_guardian_1_permission: "Yes, the school may contact this person"
    }
  };
  const store = {
    getApplication: async () => application,
    listSignatureTasksForApplication: async () => [],
    addSignatureTasks: async input => { queued = input; }
  };

  const result = await queueMissingGuardianSignatureInvitations({ store, applicationId: application.id, signingPageUrl: "https://ffe.org.au/pages/rosewood-application-sign-v6.html", clock: () => Date.parse("2026-08-08T00:00:00.000Z") });

  assert.equal(result.queuedSignatureRequests, 1);
  assert.equal(queued.application.signerControls[1].taskTokenHash, queued.signatureTasks[0].tokenHash);
  assert.equal(queued.application.signerControls[1].requestGenerated, true);
  assert.equal(queued.application.signatureControlRevision, 2);
  assert.equal(queued.outboxEvents.filter(event => event.kind === "email").length, 1);
  assert.equal(queued.outboxEvents.find(event => event.kind === "email").payload._tracking.taskTokenHash, queued.signatureTasks[0].tokenHash);
});

test("guardian review contains the complete human-readable frozen application without internal storage data", () => {
  const values = {
    student_first: "Avery",
    student_middle: "Middle marker",
    student_last: "Example",
    student_preferred: "Preferred marker",
    student_dob: "2020-01-02",
    student_gender: "Female",
    student_religion: "Other",
    student_religion_other: "Religion marker",
    current_level: "Early Years / Kinder",
    entry_year: "2027",
    entry_level: "Foundation",
    current_school: "Other",
    current_school_other: "School marker",
    student_address_share: "No, keep private",
    care_arrangement: ["Shared Custody", "Other"],
    care_other: "Care marker",
    shared_parenting: "Schedule marker",
    student_address: "Address marker",
    student_suburb: "Suburb marker",
    student_state: "Victoria",
    student_postcode: "3000",
    student_country: "Australia",
    future_siblings: "Yes",
    future_sibling_count: "2",
    residence_country: "Australia",
    birth_country: "Country marker",
    nationality: "Nationality marker",
    ethnicity: "Ethnicity marker",
    arrival_date: "2024-02-03",
    residency_status: "Temporary",
    australian_citizen: "No",
    residency_evidence: "Temporary Resident",
    visa_subclass: "Visa marker",
    visa_expiry: "2028-03-04",
    previous_visa: "Previous visa marker",
    indigenous_status: "Not Applicable",
    main_language: "English",
    other_languages: "Language marker",
    additional_needs: "Yes",
    need_categories: ["Other"],
    need_other: "Need marker",
    professional_categories: ["Other"],
    professional_other: "Professional marker",
    reports_attached: "Yes",
    ndis_support: "No",
    court_orders: "Yes",
    other_relevant_information: "Relevant information marker",
    parish: "Parish marker",
    sacrament_Baptism: "Confirmed",
    sacrament_Baptism_date: "2021-04-05",
    sacrament_Baptism_location: "Sacrament marker",
    medical_conditions: ["Other"],
    other_medical_condition: "Medical marker",
    condition_details: "Condition marker",
    allergy_details: "Allergy marker",
    anaphylaxis_risk: "No",
    anaphylaxis_device: "EpiPen",
    immunisation: "Yes",
    humanitarian_health: "No",
    doctor_name: "Doctor marker",
    doctor_address: "Practice marker",
    doctor_phone: "Phone marker",
    medicare_number: "Medicare marker",
    medicare_expiry: "2029-05-06",
    private_insurance: "Insurance marker",
    ambulance_cover: "Yes",
    healthcare_card: "No",
    app_guardians_complete: "Confirmed",
    previous_school_permission: "Confirmed",
    previous_school_name: "Previous school marker",
    previous_school_address: "Previous address marker",
    previous_school_interstate: "No",
    fee_option: "Percentage split with custodial court order",
    fee_guardian_a: "Guardian A marker",
    fee_guardian_a_percent: "50",
    fee_guardian_b: "Guardian B marker",
    fee_guardian_b_percent: "50",
    fee_split_date: "2026-08-08",
    application_discovery: "Word of Mouth",
    application_influences: ["Reputation", "Location", "Fees"],
    application_gateway_email: "gateway@example.test",
    application_signature_ip: "Confirmed",
    application_signature_terms: "Confirmed",
    application_signature_date: "2026-08-08",
    application_additional_signature_later: "Confirmed",
    application_additional_information: "Additional information marker"
  };
  for (let index = 0; index < 2; index += 1) {
    const prefix = `app_guardian_${index}_`;
    Object.assign(values, {
      [`${prefix}share`]: "Yes, share them",
      [`${prefix}title`]: "Ms",
      [`${prefix}first`]: `Guardian ${index + 1}`,
      [`${prefix}last`]: "Marker",
      [`${prefix}email`]: `guardian${index + 1}@example.test`,
      [`${prefix}mobile`]: `Mobile marker ${index + 1}`,
      [`${prefix}home`]: `Home marker ${index + 1}`,
      [`${prefix}work`]: `Work marker ${index + 1}`,
      [`${prefix}relationship`]: index ? "Mother" : "Father",
      [`${prefix}contact_type`]: index ? "Secondary" : "Primary",
      [`${prefix}marital`]: "Married",
      [`${prefix}religion`]: "Catholic",
      [`${prefix}sms`]: "Yes",
      [`${prefix}healthcare`]: "Yes",
      [`${prefix}healthcare_number`]: `Card marker ${index + 1}`,
      [`${prefix}healthcare_expiry`]: "2028-06-07",
      [`${prefix}address`]: `Guardian address marker ${index + 1}`,
      [`${prefix}suburb`]: "Melton",
      [`${prefix}state`]: "Victoria",
      [`${prefix}postcode`]: "3337",
      [`${prefix}country`]: "Australia",
      [`${prefix}postal_same`]: "No",
      [`${prefix}postal_address`]: `Postal marker ${index + 1}`,
      [`${prefix}postal_suburb`]: "Melton",
      [`${prefix}postal_state`]: "Victoria",
      [`${prefix}postal_postcode`]: "3337",
      [`${prefix}postal_country`]: "Australia",
      [`${prefix}occupation_group`]: "A",
      [`${prefix}occupation`]: `Occupation marker ${index + 1}`,
      [`${prefix}employer`]: `Employer marker ${index + 1}`,
      [`${prefix}school_education`]: "Year 12",
      [`${prefix}further_education`]: "Bachelor degree or above",
      [`${prefix}birth_country`]: "Australia",
      [`${prefix}nationality`]: "Australian",
      [`${prefix}ethnicity`]: `Guardian ethnicity marker ${index + 1}`,
      [`${prefix}languages`]: "English",
      [`${prefix}residency`]: "Temporary Resident",
      [`${prefix}visa_subclass`]: `Guardian visa marker ${index + 1}`,
      [`${prefix}visa_expiry`]: "2029-07-08",
      [`${prefix}indigenous`]: "Not Applicable",
      ...(index ? { [`${prefix}permission`]: "No, do not contact them" } : {})
    });
  }
  for (let index = 0; index < 2; index += 1) {
    const prefix = `emergency_${index}_`;
    Object.assign(values, {
      [`${prefix}first`]: `Emergency ${index + 1}`,
      [`${prefix}last`]: "Marker",
      [`${prefix}relationship`]: "Friend",
      [`${prefix}mobile`]: `Emergency mobile marker ${index + 1}`,
      [`${prefix}home`]: `Emergency home marker ${index + 1}`,
      [`${prefix}work`]: `Emergency work marker ${index + 1}`,
      [`${prefix}email`]: `emergency${index + 1}@example.test`
    });
  }

  const review = buildApplicationReview({
    id: "internal-application-id",
    reference: "APP-SYNTHETIC",
    revision: 4,
    revisionHash: "internal-revision-hash",
    submittedAt: "2026-08-08T01:02:03.000Z",
    guardianCount: 2,
    emergencyCount: 2,
    values,
    documents: { birth_certificate: [{ fileName: "birth-marker.pdf", documentId: "private-drive-id" }] },
    signatures: [{ signerName: "Guardian 1 Marker", signedAt: "2026-08-08T01:02:03.000Z", revision: 4, fileId: "private-signature-id", networkFingerprint: "private-network-fingerprint" }]
  }, 1);

  const serialized = JSON.stringify(review);
  assert.deepEqual(review.sections.map(section => section.title), [
    "Student",
    "Nationality and Citizenship",
    "General / Additional Needs",
    "Sacraments",
    "Medical Details",
    "Parent / Guardian",
    "Emergency Contacts",
    "Documents",
    "Conditions",
    "Signature"
  ]);
  for (const marker of ["Middle marker", "Schedule marker", "Visa marker", "Need marker", "Sacrament marker", "Doctor marker", "Guardian address marker 2", "Emergency mobile marker 2", "gateway@example.test", "birth-marker.pdf", "Previous school marker", "Guardian B marker", "Additional information marker"]) assert.match(serialized, new RegExp(marker));
  assert.equal(review.sections.find(section => section.id === "guardians").groups[1].badge, "You");
  for (const secret of ["internal-application-id", "internal-revision-hash", "private-drive-id", "private-signature-id", "private-network-fingerprint"]) assert.doesNotMatch(serialized, new RegExp(secret));
});

test("verified signing context returns the complete review and no application identifier", async () => {
  const taskToken = "synthetic-task-token";
  const taskHash = crypto.createHash("sha256").update(taskToken).digest("hex");
  const now = Date.parse("2026-08-08T02:00:00.000Z");
  const application = {
    id: "internal-application-id",
    reference: "APP-SYNTHETIC",
    status: "pending_signatures",
    revision: 3,
    revisionHash: "frozen-revision-hash",
    guardianCount: 2,
    emergencyCount: 2,
    submittedAt: "2026-08-08T01:00:00.000Z",
    documents: {},
    signatures: [{ signerName: "Primary Guardian", signedAt: "2026-08-08T01:00:00.000Z", revision: 3 }],
    values: {
      student_first: "Avery",
      student_last: "Example",
      app_guardian_0_first: "Primary",
      app_guardian_0_last: "Guardian",
      app_guardian_1_first: "Additional",
      app_guardian_1_last: "Guardian",
      app_guardian_1_email: "additional@example.test",
      previous_school_permission: "Confirmed",
      fee_option: "Both Parents / Guardian"
    }
  };
  const handler = createService({
    store: {
      getChallenge: async () => ({ id: "challenge-synthetic", purpose: "application_signature", subjectHash: taskHash, taskGeneration: 1 }),
      getSignatureTask: async () => ({ tokenHash: taskHash, applicationId: application.id, guardianId: "guardian-additional", guardianIndex: 1, email: "additional@example.test", status: "invited", expiresAt: now + 60_000, revisionHash: application.revisionHash }),
      consumeChallenge: async () => true,
      putSession: async () => {},
      getApplication: async () => application
    },
    drive: {},
    sheets: {},
    mailer: {},
    env: {
      ALLOWED_ORIGINS: "https://ffe.org.au",
      OTP_HMAC_SECRET: "synthetic-otp-secret",
      NETWORK_HMAC_SECRET: "synthetic-network-secret"
    },
    clock: () => now
  });
  const response = await handler({
    rawPath: "/v6/application/signatures/verify-code",
    requestContext: { http: { method: "POST", sourceIp: "192.0.2.1" } },
    headers: { origin: "https://ffe.org.au" },
    body: JSON.stringify({ taskToken, challengeId: "challenge-synthetic", code: "123456" })
  });
  const payload = JSON.parse(response.body);
  const serialized = JSON.stringify(payload.context);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.context.review.sections.length, 10);
  assert.equal(payload.context.review.conditions.fee_option, "Both Parents / Guardian");
  assert.equal("applicationId" in payload.context, false);
  assert.doesNotMatch(serialized, /internal-application-id|frozen-revision-hash/);
});

test("V8 guardian review omits retired previous education and includes the optional survey", () => {
  const review = buildApplicationReview({
    formVersion: "rosewood-application-2026.8",
    reference: "APP-V8-SYNTHETIC",
    guardianCount: 1,
    emergencyCount: 2,
    values: {
      student_first: "Synthetic",
      current_school: "Synthetic School",
      interrupted_schooling: "No",
      previous_school_attended: "Yes",
      previous_school_name: "Retired historical answer",
      student_address_share: "Yes, share",
      care_arrangement: "Both Parents",
      student_address: "1 Synthetic Street",
      application_student_agreement: ["Confirmed"],
      application_parent_agreement: ["Confirmed"],
      application_agreement_acknowledgement: ["Confirmed"],
      application_special_aptitudes: "Mathematics",
      application_mentoring_value: "A trusted adult relationship"
    },
    documents: {},
    signatures: []
  });
  const student = review.sections.find(section => section.id === "student");
  const conditions = review.sections.find(section => section.id === "conditions");
  const serialized = JSON.stringify(review);
  assert.deepEqual(student.groups.map(group => group.title), ["Student details", "Student primary address", "Family"]);
  assert.match(JSON.stringify(student.groups[0]), /extended absence or interruption/);
  assert.match(JSON.stringify(student.groups[1]), /Share this address|Home care arrangement/);
  assert.doesNotMatch(serialized, /Retired historical answer|Has the student previously attended/);
  assert.equal(conditions.groups.at(-1).title, "Student and family survey");
  assert.match(JSON.stringify(conditions.groups.at(-1)), /Mathematics|trusted adult relationship/);
});

test("V15 guardian review uses the clearer family wording without rewriting V14 reviews", () => {
  const values = { future_siblings: "Yes", future_sibling_count: "2" };
  const v14 = buildApplicationReview({ formVersion: "rosewood-application-2026.14", guardianCount: 1, emergencyCount: 2, values, documents: {}, signatures: [] });
  const v15 = buildApplicationReview({ formVersion: "rosewood-application-2026.15", guardianCount: 1, emergencyCount: 2, values, documents: {}, signatures: [] });
  const familyFields = review => review.sections.find(section => section.id === "student").groups.find(group => group.title === "Family").items;

  assert.deepEqual(familyFields(v14).map(field => field.label), ["Do you have any other children that may attend our school?", "How many other children?"]);
  assert.deepEqual(familyFields(v15).map(field => field.label), ["Do you have any other children, apart from this child, who may apply to Rosewood College in the future?", "How many other children may apply?"]);
});
