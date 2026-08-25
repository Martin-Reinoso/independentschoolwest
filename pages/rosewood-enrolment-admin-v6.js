(() => {
  "use strict";

  const API_BASE = "https://6zyzo44sdb5zmmx53toktqrnuu0sikyd.lambda-url.ap-southeast-2.on.aws";
  const REMEMBERED_SESSION_KEY = "rosewood-enrolment-staff-v6-session";
  const state = {
    email: "",
    challengeId: "",
    sessionToken: "",
    sessionExpiresAt: 0,
    rememberMe: false,
    dashboard: null,
    currentApplicationDetail: null,
    selectedEoi: null,
    selectedApplication: null,
    resendInvitation: null,
    invitationActionMode: "resend",
    invitationOperationId: "",
    resendTimer: null,
    refreshTimer: null
  };

  const byId = id => document.getElementById(id);
  const accessView = byId("access-view");
  const dashboardView = byId("dashboard-view");
  const headerActions = byId("header-actions");
  const emailForm = byId("email-form");
  const codeForm = byId("code-form");
  const inviteDialog = byId("invite-dialog");
  const confirmDialog = byId("confirm-dialog");
  const detailDialog = byId("detail-dialog");

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function setNotice(id, message = "") {
    const notice = byId(id);
    notice.textContent = message;
    notice.hidden = !message;
    if (message && notice.classList.contains("error-notice")) notice.focus();
  }

  function clearNotices(...ids) {
    ids.forEach(id => setNotice(id));
  }

  function setLoading(button, loading) {
    button.classList.toggle("loading", loading);
    button.disabled = loading;
    button.setAttribute("aria-busy", String(loading));
  }

  function clearRememberedSession() {
    localStorage.removeItem(REMEMBERED_SESSION_KEY);
  }

  function rememberCurrentSession() {
    if (!state.rememberMe || !state.sessionToken) return;
    state.sessionExpiresAt = Date.now() + 2 * 60 * 60_000;
    localStorage.setItem(REMEMBERED_SESSION_KEY, JSON.stringify({ token: state.sessionToken, email: state.email, expiresAt: state.sessionExpiresAt }));
  }

  async function api(path, { method = "GET", body, authenticated = true, headers: extraHeaders = {} } = {}) {
    const headers = { "Content-Type": "application/json", ...extraHeaders };
    if (authenticated && state.sessionToken) headers.Authorization = `Bearer ${state.sessionToken}`;
    const response = await fetch(`${API_BASE}${path}`, { method, headers, cache: "no-store", ...(body ? { body: JSON.stringify(body) } : {}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && authenticated) signOut("Your secure session has expired. Request a new access code.", false);
      const error = new Error(payload.message || "The portal could not complete this request.");
      error.code = payload.error;
      error.details = payload.details;
      throw error;
    }
    if (authenticated) rememberCurrentSession();
    return payload;
  }

  function formatDate(value, includeTime = false) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-AU", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
  }

  function statusLabel(status) {
    return ({ invited: "Invited", in_progress: "In progress", pending_signatures: "Pending signatures", staff_review_required: "Staff review required", submitted: "Submitted" })[status] || String(status || "Unknown").replaceAll("_", " ");
  }

  function stageLabel(stage) {
    const labels = { gateway: "Access gateway", student: "Student", guardian: "Parent / guardian", emergency: "Emergency contacts", documents: "Documents", conditions: "Conditions", review: "Review", signature: "Primary signature", guardian_signatures: "Guardian signatures", complete: "Complete" };
    return labels[stage] || String(stage || "Access gateway").replaceAll("_", " ");
  }

  function beginResendCountdown(seconds = 30) {
    clearInterval(state.resendTimer);
    const button = byId("resend-code-button");
    const timer = byId("resend-timer");
    let remaining = seconds;
    button.disabled = true;
    timer.textContent = `(${remaining}s)`;
    state.resendTimer = setInterval(() => {
      remaining -= 1;
      timer.textContent = remaining > 0 ? `(${remaining}s)` : "";
      if (remaining <= 0) {
        clearInterval(state.resendTimer);
        button.disabled = false;
      }
    }, 1000);
  }

  async function requestCode() {
    clearNotices("access-error", "access-message");
    const email = byId("staff-email").value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setNotice("access-error", "Enter a valid staff email address.");
      byId("staff-email").focus();
      return;
    }
    const button = byId("send-code-button");
    setLoading(button, true);
    try {
      const result = await api("/v6/staff/access/request-code", { method: "POST", body: { email }, authenticated: false });
      state.email = email;
      state.challengeId = result.challengeId;
      emailForm.hidden = true;
      codeForm.hidden = false;
      setNotice("access-message", result.message);
      beginResendCountdown(result.resendAfterSeconds || 30);
      byId("staff-code").value = "";
      byId("staff-code").focus();
    } catch (error) {
      setNotice("access-error", error.message);
    } finally {
      setLoading(button, false);
    }
  }

  async function verifyCode() {
    clearNotices("access-error");
    const code = byId("staff-code").value.trim();
    if (!/^\d{6}$/.test(code)) {
      setNotice("access-error", "Enter the six-digit code from the email.");
      byId("staff-code").focus();
      return;
    }
    const button = byId("verify-code-button");
    setLoading(button, true);
    try {
      state.rememberMe = byId("remember-session").checked;
      const result = await api("/v6/staff/access/verify-code", { method: "POST", body: { email: state.email, challengeId: state.challengeId, code, rememberMe: state.rememberMe }, authenticated: false });
      state.sessionToken = result.sessionToken;
      state.sessionExpiresAt = Date.now() + result.expiresInSeconds * 1000;
      rememberCurrentSession();
      accessView.hidden = true;
      dashboardView.hidden = false;
      headerActions.hidden = false;
      await loadDashboard();
      clearInterval(state.refreshTimer);
      state.refreshTimer = setInterval(() => loadDashboard({ quiet: true }), 60_000);
    } catch (error) {
      setNotice("access-error", error.message);
    } finally {
      setLoading(button, false);
    }
  }

  function resetAccessForm(message = "") {
    state.email = "";
    state.challengeId = "";
    emailForm.hidden = false;
    codeForm.hidden = true;
    byId("staff-code").value = "";
    clearInterval(state.resendTimer);
    clearNotices("access-error", "access-message");
    if (message) setNotice("access-message", message);
    byId("staff-email").focus();
  }

  function signOut(message = "", revoke = true) {
    const token = state.sessionToken;
    if (revoke && token) fetch(`${API_BASE}/v6/session/logout`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: "{}", cache: "no-store" }).catch(() => {});
    clearRememberedSession();
    state.sessionToken = "";
    state.sessionExpiresAt = 0;
    state.dashboard = null;
    state.selectedEoi = null;
    state.selectedApplication = null;
    clearInterval(state.refreshTimer);
    if (inviteDialog.open) inviteDialog.close();
    if (confirmDialog.open) confirmDialog.close();
    if (detailDialog.open) detailDialog.close();
    dashboardView.hidden = true;
    headerActions.hidden = true;
    accessView.hidden = false;
    resetAccessForm(message);
  }

  async function restoreRememberedSession() {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(REMEMBERED_SESSION_KEY) || "null"); } catch { stored = null; }
    if (!stored?.token || Number(stored.expiresAt || 0) <= Date.now()) {
      clearRememberedSession();
      return;
    }
    state.sessionToken = stored.token;
    state.sessionExpiresAt = Number(stored.expiresAt);
    state.email = stored.email || "";
    state.rememberMe = true;
    byId("staff-email").value = state.email;
    byId("remember-session").checked = true;
    accessView.hidden = true;
    dashboardView.hidden = false;
    headerActions.hidden = false;
    try {
      await loadDashboard();
      if (!state.sessionToken) return;
      clearInterval(state.refreshTimer);
      state.refreshTimer = setInterval(() => loadDashboard({ quiet: true }), 60_000);
    } catch {
      signOut("Your remembered staff session has expired. Request a new access code.", false);
    }
  }

  async function loadDashboard({ quiet = false } = {}) {
    if (!state.sessionToken) return;
    const button = byId("refresh-button");
    if (!quiet) setLoading(button, true);
    if (!quiet) clearNotices("dashboard-error");
    try {
      state.dashboard = await api("/v6/staff/dashboard");
      renderDashboard();
    } catch (error) {
      if (state.sessionToken) setNotice("dashboard-error", error.message);
    } finally {
      if (!quiet) setLoading(button, false);
    }
  }

  function renderDashboard() {
    const data = state.dashboard;
    byId("dashboard-updated").textContent = `Updated ${formatDate(data.generatedAt, true)} · signed in as ${data.staff.email} · ${data.staff.role}`;
    byId("metric-eois").textContent = data.stats.expressionsOfInterest;
    byId("metric-active").textContent = data.stats.inProgress;
    byId("metric-signatures").textContent = data.stats.pendingSignatures;
    byId("metric-submitted").textContent = data.stats.submitted;
    byId("nav-app-count").textContent = data.applications.length;
    byId("nav-eoi-count").textContent = data.eois.length;
    byId("nav-email-count").textContent = data.recentEmails.length;
    const canManage = ["admin", "admissions"].includes(data.staff.role);
    byId("open-invite-button").hidden = !canManage;
    renderApplications();
    renderEois();
    renderEmails();
    renderEoiPicker();
  }

  function addRecordCell(card, label, primary, secondary = "") {
    const cell = element("div", "record-cell");
    cell.append(element("span", "cell-label", label), element("strong", "", primary || "Not recorded"));
    if (secondary) cell.append(element("small", "", secondary));
    card.append(cell);
  }

  function statusBadge(status) {
    return element("span", `status-badge status-${["invited", "in_progress", "pending_signatures", "staff_review_required", "submitted"].includes(status) ? status : "default"}`, statusLabel(status));
  }

  function renderApplications() {
    const list = byId("application-list");
    const query = byId("application-search").value.trim().toLowerCase();
    const status = byId("application-status").value;
    const records = (state.dashboard?.applications || []).filter(record => {
      const haystack = [record.studentName, record.recipientEmail, record.reference, record.applicationId].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (status === "all" || record.status === status);
    });
    clear(list);
    records.forEach(record => {
      const card = element("article", "record-card");
      const primary = element("div", "record-primary");
      primary.append(element("strong", "", record.studentName || "Student name not yet provided"), element("small", "", record.recipientEmail));
      card.append(primary);
      addRecordCell(card, "Progress", `${record.percentComplete}% complete`, stageLabel(record.currentStage));
      const progress = document.createElement("progress");
      progress.className = "progress-line";
      progress.max = 100;
      progress.value = record.percentComplete;
      progress.setAttribute("aria-label", `${record.percentComplete}% complete`);
      card.lastElementChild.append(progress);
      addRecordCell(card, "Last activity", formatDate(record.updatedAt, true), record.reference || record.applicationId);
      card.append(statusBadge(record.status));
      const actions = element("div", "record-actions");
      const review = element("button", "small-button", "Review");
      review.type = "button";
      review.addEventListener("click", () => openApplicationDetail(record));
      actions.append(review);
      if (record.canResend && ["admin", "admissions"].includes(state.dashboard.staff.role)) {
        const resend = element("button", "small-button", "Resend");
        resend.type = "button";
        resend.dataset.resendInvitation = record.invitationId;
        resend.addEventListener("click", () => openInvitationAction(record, "resend"));
        actions.append(resend);
      }
      if (record.canRenewAccess && ["admin", "admissions"].includes(state.dashboard.staff.role)) {
        const renew = element("button", "small-button", "Renew access");
        renew.type = "button";
        renew.dataset.renewInvitationAccess = record.applicationId;
        renew.addEventListener("click", () => openInvitationAction(record, "renew"));
        actions.append(renew);
      }
      card.append(actions);
      list.append(card);
    });
    byId("application-empty").hidden = records.length > 0;
  }

  function renderEois() {
    const list = byId("eoi-list");
    const query = byId("eoi-search").value.trim().toLowerCase();
    const records = (state.dashboard?.eois || []).filter(record => [record.contactName, record.studentName, record.email, record.reference].join(" ").toLowerCase().includes(query));
    clear(list);
    records.forEach(record => {
      const card = element("article", "record-card");
      const primary = element("div", "record-primary");
      primary.append(element("strong", "", record.studentName || "Student name not recorded"), element("small", "", `${record.contactName} · ${record.email}`));
      card.append(primary);
      addRecordCell(card, "Entry", [record.entryLevel, record.entryYear].filter(Boolean).join(" · ") || "Not recorded");
      addRecordCell(card, "Submitted", formatDate(record.submittedAt), record.reference);
      card.append(record.linkedApplicationId ? element("span", "linked-tag", "Application linked") : statusBadge(record.status));
      const actions = element("div", "record-actions");
      if (!record.linkedApplicationId && ["admin", "admissions"].includes(state.dashboard.staff.role)) {
        const invite = element("button", "small-button", "Invite to apply");
        invite.type = "button";
        invite.addEventListener("click", () => openInviteFromEoi(record));
        actions.append(invite);
      }
      card.append(actions);
      list.append(card);
    });
    byId("eoi-empty").hidden = records.length > 0;
  }

  function renderEmails() {
    const list = byId("email-list");
    const records = state.dashboard?.recentEmails || [];
    clear(list);
    records.forEach(record => {
      const card = element("article", "record-card email-card");
      const primary = element("div", "record-primary");
      primary.append(element("strong", "", record.messageType.replaceAll("_", " ")), element("small", "", formatDate(record.occurredAt, true)));
      card.append(primary);
      addRecordCell(card, "Recipient", record.recipientEmail || "Not recorded");
      addRecordCell(card, "Record", record.recordId || "Not recorded", record.workflow);
      card.append(statusBadge(record.deliveryStatus || "queued"));
      list.append(card);
    });
    byId("email-empty").hidden = records.length > 0;
  }

  function showPanel(name) {
    document.querySelectorAll("[data-workspace-panel]").forEach(panel => { panel.hidden = panel.id !== `${name}-panel`; });
    document.querySelectorAll(".nav-button").forEach(button => {
      const active = button.dataset.panel === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  function fieldLabel(key) {
    return key
      .replace(/^app_guardian_\d+_/, "")
      .replace(/^emergency_\d+_/, "")
      .replaceAll("_", " ")
      .replace(/\b(ndis|naplan|sms|dob|ip)\b/gi, value => value.toUpperCase())
      .replace(/\b\w/g, value => value.toUpperCase());
  }

  function displayValue(value) {
    if (Array.isArray(value)) return value.join(", ");
    if (value && typeof value === "object") return Object.values(value).join(", ");
    return String(value ?? "");
  }

  function detailSection(title, entries) {
    if (!entries.length) return null;
    const section = element("section", "detail-section");
    section.append(element("h3", "", title));
    const list = element("dl", "detail-grid");
    entries.forEach(([key, value]) => {
      const item = element("div", "detail-item");
      item.append(element("dt", "", fieldLabel(key)), element("dd", "", displayValue(value)));
      list.append(item);
    });
    section.append(list);
    return section;
  }

  function renderRevisionHistory(application) {
    const revisions = application.revisions || [];
    if (!revisions.length) return null;
    const section = element("section", "detail-section revision-history");
    section.append(element("h3", "", "Saved answer history"));
    section.append(element("p", "revision-intro", "Each entry is an immutable server-acknowledged snapshot. Opening a revision is recorded in the audit log."));
    const list = element("div", "revision-list");
    revisions.forEach(revision => {
      const row = element("div", "revision-row");
      const copy = element("div");
      copy.append(
        element("strong", "", `Revision ${revision.revision} · ${fieldLabel(revision.kind || "saved")}`),
        element("small", "", `${formatDate(revision.savedAt, true)} · ${stageLabel(revision.stage)} · ${revision.changedFields?.length || 0} changed field${revision.changedFields?.length === 1 ? "" : "s"}`)
      );
      const button = element("button", "secondary-button compact-button", "View answers");
      button.type = "button";
      button.dataset.revisionKey = revision.revisionKey;
      row.append(copy, button);
      list.append(row);
    });
    const snapshot = element("div", "revision-snapshot");
    snapshot.id = "revision-snapshot";
    snapshot.hidden = true;
    section.append(list, snapshot);
    return section;
  }

  function renderRevisionSnapshot(revision) {
    const snapshot = byId("revision-snapshot");
    if (!snapshot) return;
    clear(snapshot);
    snapshot.append(element("h4", "", `Revision ${revision.revision} answers`));
    snapshot.append(element("p", "revision-intro", `${formatDate(revision.savedAt, true)} · ${fieldLabel(revision.kind || "saved")} · ${revision.formVersion || "Legacy version"}`));
    const entries = Object.entries(revision.values || {}).filter(([, value]) => value !== "" && value != null && (!Array.isArray(value) || value.length));
    const answers = detailSection("Recorded fields", entries);
    if (answers) snapshot.append(answers);
    snapshot.hidden = false;
    snapshot.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function openApplicationRevision(button) {
    const application = state.currentApplicationDetail;
    if (!application) return;
    const previous = button.textContent;
    setLoading(button, true);
    button.querySelector("span")?.remove();
    try {
      const result = await api("/v6/staff/applications/revision", { method: "POST", body: { applicationId: application.applicationId, revisionKey: button.dataset.revisionKey } });
      renderRevisionSnapshot(result.revision);
    } catch (error) {
      setNotice("detail-error", error.message);
    } finally {
      setLoading(button, false);
      button.textContent = previous;
    }
  }

  function renderApplicationDetail(application) {
    state.currentApplicationDetail = application;
    const content = byId("detail-content");
    clear(content);
    const values = Object.entries(application.values || {}).filter(([, value]) => value !== "" && value != null && (!Array.isArray(value) || value.length));
    const guardianGroups = new Map();
    const emergencyGroups = new Map();
    const general = [];
    for (const entry of values) {
      const guardian = entry[0].match(/^app_guardian_(\d+)_/);
      const emergency = entry[0].match(/^emergency_(\d+)_/);
      if (guardian) {
        const group = guardianGroups.get(guardian[1]) || [];
        group.push(entry);
        guardianGroups.set(guardian[1], group);
      } else if (emergency) {
        const group = emergencyGroups.get(emergency[1]) || [];
        group.push(entry);
        emergencyGroups.set(emergency[1], group);
      } else if (!entry[0].startsWith("application_signature_")) {
        general.push(entry);
      }
    }
    const overview = detailSection("Record overview", [
      ["status", statusLabel(application.status)],
      ["reference", application.reference || application.applicationId],
      ["recipient_email", application.recipientEmail],
      ["last_updated", formatDate(application.updatedAt, true)],
      ["submitted_at", formatDate(application.submittedAt, true)],
      ["signatures", `${application.completedSignatureCount} of ${application.requiredSignatureCount}`],
      ["staff_review", application.requiresStaffReview ? "Required" : "Not required"],
      ["one_signature_explanation", application.oneSignatureExplanation || "Not provided"],
      ["form_version", application.formVersion || "Legacy record"],
      ["schema_version", application.schemaVersion || "Legacy record"]
    ]);
    if (overview) content.append(overview);
    const answers = detailSection("Application answers", general);
    if (answers) content.append(answers);
    [...guardianGroups.entries()].sort(([a], [b]) => Number(a) - Number(b)).forEach(([index, entries]) => {
      const section = detailSection(`Parent / guardian ${Number(index) + 1}`, entries);
      if (section) content.append(section);
    });
    [...emergencyGroups.entries()].sort(([a], [b]) => Number(a) - Number(b)).forEach(([index, entries]) => {
      const section = detailSection(`Emergency contact ${Number(index) + 1}`, entries);
      if (section) content.append(section);
    });
    if (application.documents?.length) {
      const section = element("section", "detail-section");
      section.append(element("h3", "", "Documents"));
      const list = element("div", "document-list");
      application.documents.forEach(document => {
        const row = element("div", "document-row");
        const details = element("div");
        const storageLabel = document.storageProvider === "google_drive" ? "Restricted Google Drive" : "Legacy document storage";
        details.append(element("strong", "", document.fileName), element("small", "", `${fieldLabel(document.category)} · ${storageLabel}`));
        row.append(details);
        row.append(element("small", "", "Access through the restricted enrolment Drive"));
        list.append(row);
      });
      section.append(list);
      content.append(section);
    }
    const signatures = detailSection("Signature status", (application.signatures || []).flatMap((signature, index) => [
      [`signer_${index + 1}`, signature.signerName],
      [`signed_at_${index + 1}`, formatDate(signature.signedAt, true)]
    ]));
    if (signatures) content.append(signatures);
    (application.signerControls || []).forEach((control, index) => {
      const previousEmails = (control.previousEmails || []).map(item => `${item.email} (${formatDate(item.changedAt, true)}, requested by ${item.requestedBy || "not recorded"})`).join("; ") || "None";
      const section = detailSection(`Signature request: ${control.name || `Parent / guardian ${index + 1}`}`, [
        ["contact_permission", control.contactPermission],
        ["contact_permission_changed_at", formatDate(control.contactPermissionChangedAt, true)],
        ["contact_permission_changed_by", control.contactPermissionChangedBy || "Not recorded"],
        ["current_application_email", control.currentEmail || "Not provided"],
        ["previous_email_history", previousEmails],
        ["email_corrected_at", formatDate(control.emailCorrectedAt, true)],
        ["correction_requested_by", control.emailCorrectionRequestedBy || "Not recorded"],
        ["signature_required", control.signatureRequired ? "Yes" : "No"],
        ["request_generated", control.requestGenerated ? "Yes" : "No"],
        ["request_sent", control.requestSent ? "Yes" : "No"],
        ["request_status", control.requestStatus],
        ["delivery_status", control.deliveryStatus],
        ["delivery_recorded_at", formatDate(control.deliveryAt, true)],
        ["request_sent_at", formatDate(control.requestSentAt, true)],
        ["request_opened_at", formatDate(control.openedAt, true)],
        ["email_verified_during_signing", formatDate(control.emailVerifiedAt, true)],
        ["signature_status", control.signatureStatus],
        ["signature_completed_at", formatDate(control.completedAt, true)],
        ["signed_document_revision", control.signedDocumentRevision || "Not recorded"],
        ["previous_link_revoked_at", formatDate(control.previousLinkRevokedAt, true)],
        ["active_task_status", control.activeTaskStatus]
      ]);
      if (section && index > 0 && control.signatureStatus !== "Complete" && ["admin", "admissions"].includes(state.dashboard?.staff?.role)) {
        const actions = element("div", "detail-actions");
        const enable = control.contactPermission === "Do not contact";
        const button = element("button", "small-button", enable ? "Authorise contact and send request" : "Set Do not contact");
        button.type = "button";
        button.addEventListener("click", () => changeContactPermission(application, control, enable, button));
        actions.append(button);
        section.append(actions);
      }
      if (section) content.append(section);
    });
    const history = renderRevisionHistory(application);
    if (history) content.append(history);
    byId("detail-loading").hidden = true;
    content.hidden = false;
  }

  async function changeContactPermission(application, control, enable, button) {
    const confirmation = window.prompt('Type exactly: I confirm this authorised contact-permission change');
    if (confirmation !== "I confirm this authorised contact-permission change") {
      setNotice("detail-error", "The contact-permission change was cancelled because the required confirmation was not entered exactly.");
      return;
    }
    setLoading(button, true);
    clearNotices("detail-error");
    try {
      await api("/v6/staff/applications/contact-permission", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: { applicationId: application.applicationId, guardianId: control.guardianId, permission: enable ? "Yes, the school may contact this person" : "No, do not contact this person", confirmation } });
      const result = await api("/v6/staff/applications/detail", { method: "POST", body: { applicationId: application.applicationId } });
      renderApplicationDetail(result.application);
      await loadDashboard({ quiet: true });
    } catch (error) {
      setNotice("detail-error", error.message);
      setLoading(button, false);
    }
  }

  async function openApplicationDetail(record) {
    state.selectedApplication = record;
    state.currentApplicationDetail = null;
    byId("detail-title").textContent = record.studentName || "Application details";
    byId("detail-summary").textContent = `${record.reference || record.applicationId} · ${statusLabel(record.status)}`;
    byId("detail-content").hidden = true;
    byId("detail-loading").hidden = false;
    clearNotices("detail-error");
    detailDialog.showModal();
    try {
      const result = await api("/v6/staff/applications/detail", { method: "POST", body: { applicationId: record.applicationId } });
      renderApplicationDetail(result.application);
    } catch (error) {
      byId("detail-loading").hidden = true;
      setNotice("detail-error", error.message);
    }
  }

  function setInviteMode(mode) {
    const direct = mode === "direct";
    byId("direct-invite-form").hidden = !direct;
    byId("eoi-invite-form").hidden = direct;
    byId("direct-mode-button").classList.toggle("active", direct);
    byId("eoi-mode-button").classList.toggle("active", !direct);
    byId("direct-mode-button").setAttribute("aria-selected", String(direct));
    byId("eoi-mode-button").setAttribute("aria-selected", String(!direct));
    clearNotices("invite-error");
  }

  function openInvite(mode = "direct") {
    byId("direct-invite-form").reset();
    byId("eoi-invite-form").reset();
    state.selectedEoi = null;
    updateSelectedEoi();
    setInviteMode(mode);
    renderEoiPicker();
    inviteDialog.showModal();
    setTimeout(() => (mode === "direct" ? byId("invite-email") : byId("invite-eoi-search")).focus(), 50);
  }

  function openInviteFromEoi(record) {
    openInvite("eoi");
    selectEoi(record);
  }

  function renderEoiPicker() {
    const list = byId("invite-eoi-list");
    if (!list || !state.dashboard) return;
    const query = byId("invite-eoi-search").value.trim().toLowerCase();
    const records = state.dashboard.eois.filter(record => [record.contactName, record.studentName, record.email, record.reference].join(" ").toLowerCase().includes(query)).slice(0, 50);
    clear(list);
    records.forEach(record => {
      const option = element("button", "picker-option");
      option.type = "button";
      option.disabled = Boolean(record.linkedApplicationId);
      const details = element("span");
      details.append(element("strong", "", `${record.studentName || "Student"} · ${record.contactName || "Parent/guardian"}`), element("small", "", `${record.email} · ${record.reference}`));
      option.append(details, element("span", record.linkedApplicationId ? "linked-tag" : "", record.linkedApplicationId ? "Already linked" : "Select"));
      option.addEventListener("click", () => selectEoi(record));
      list.append(option);
    });
    if (!records.length) list.append(element("p", "panel-note", "No matching EOI records."));
  }

  function selectEoi(record) {
    state.selectedEoi = record;
    byId("selected-eoi-id").value = record.eoiId;
    updateSelectedEoi();
  }

  function updateSelectedEoi() {
    const panel = byId("selected-eoi");
    const button = byId("send-eoi-invite");
    clear(panel);
    if (!state.selectedEoi) {
      panel.hidden = true;
      button.disabled = true;
      return;
    }
    panel.hidden = false;
    panel.append(element("strong", "", `${state.selectedEoi.studentName || "Student"} · ${state.selectedEoi.contactName || "Parent/guardian"}`), element("span", "", `Invitation will be sent to ${state.selectedEoi.email}`));
    button.disabled = Boolean(state.selectedEoi.linkedApplicationId);
  }

  async function createInvitation(payload, button) {
    clearNotices("invite-error", "dashboard-message");
    setLoading(button, true);
    try {
      const result = await api("/v6/staff/invitations", { method: "POST", body: payload });
      inviteDialog.close();
      setNotice("dashboard-message", `${result.message} Recipient: ${result.recipientEmail}`);
      await loadDashboard({ quiet: true });
    } catch (error) {
      setNotice("invite-error", error.message);
    } finally {
      setLoading(button, false);
    }
  }

  function newOperationId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  }

  function openInvitationAction(record, mode) {
    state.resendInvitation = record;
    state.invitationActionMode = mode;
    state.invitationOperationId = mode === "renew" ? newOperationId() : "";
    byId("confirm-title").textContent = mode === "renew" ? "Renew access to this application?" : "Resend this invitation?";
    byId("confirm-copy").textContent = mode === "renew"
      ? `A new private link will be sent to ${record.recipientEmail}. The existing application, saved answers and revision history will be preserved; no duplicate application will be created.`
      : `A new private link will be sent to ${record.recipientEmail}. The earlier link will stop working.`;
    byId("confirm-resend-button").querySelector("span").textContent = mode === "renew" ? "Renew access" : "Resend invitation";
    confirmDialog.showModal();
    byId("cancel-resend-button").focus();
  }

  async function confirmResend() {
    if (!state.resendInvitation) return;
    const button = byId("confirm-resend-button");
    setLoading(button, true);
    clearNotices("dashboard-error", "dashboard-message");
    try {
      const renew = state.invitationActionMode === "renew";
      const path = renew ? "/v6/staff/invitations/renew-access" : "/v6/staff/invitations/resend";
      const body = renew
        ? { applicationId: state.resendInvitation.applicationId, invitationId: state.resendInvitation.invitationId, operationId: state.invitationOperationId }
        : { invitationId: state.resendInvitation.invitationId };
      const result = await api(path, { method: "POST", body });
      confirmDialog.close();
      setNotice("dashboard-message", result.message);
      await loadDashboard({ quiet: true });
    } catch (error) {
      confirmDialog.close();
      setNotice("dashboard-error", error.message);
    } finally {
      setLoading(button, false);
      state.resendInvitation = null;
      state.invitationActionMode = "resend";
      state.invitationOperationId = "";
    }
  }

  emailForm.addEventListener("submit", event => { event.preventDefault(); requestCode(); });
  codeForm.addEventListener("submit", event => { event.preventDefault(); verifyCode(); });
  byId("resend-code-button").addEventListener("click", requestCode);
  byId("change-email-button").addEventListener("click", () => resetAccessForm());
  byId("sign-out-button").addEventListener("click", () => signOut());
  byId("refresh-button").addEventListener("click", () => loadDashboard());
  byId("open-invite-button").addEventListener("click", () => openInvite("direct"));
  byId("direct-mode-button").addEventListener("click", () => setInviteMode("direct"));
  byId("eoi-mode-button").addEventListener("click", () => setInviteMode("eoi"));
  byId("application-search").addEventListener("input", renderApplications);
  byId("application-status").addEventListener("change", renderApplications);
  byId("eoi-search").addEventListener("input", renderEois);
  byId("invite-eoi-search").addEventListener("input", renderEoiPicker);
  document.querySelectorAll(".nav-button").forEach(button => button.addEventListener("click", () => showPanel(button.dataset.panel)));
  byId("direct-invite-form").addEventListener("submit", event => {
    event.preventDefault();
    const email = byId("invite-email").value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setNotice("invite-error", "Enter a valid family email address.");
      byId("invite-email").focus();
      return;
    }
    const firstName = byId("invite-first").value.trim();
    if (!firstName) {
      setNotice("invite-error", "Enter the parent or guardian first name.");
      byId("invite-first").focus();
      return;
    }
    createInvitation({ recipientEmail: email, firstName, lastName: byId("invite-last").value.trim() }, byId("send-direct-invite"));
  });
  byId("eoi-invite-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!state.selectedEoi) {
      setNotice("invite-error", "Select an expression of interest first.");
      return;
    }
    createInvitation({ recipientEmail: state.selectedEoi.email, sourceEoiId: state.selectedEoi.eoiId }, byId("send-eoi-invite"));
  });
  byId("cancel-resend-button").addEventListener("click", () => { state.resendInvitation = null; state.invitationActionMode = "resend"; state.invitationOperationId = ""; confirmDialog.close(); });
  byId("confirm-resend-button").addEventListener("click", confirmResend);
  inviteDialog.addEventListener("click", event => { if (event.target === inviteDialog) inviteDialog.close(); });
  confirmDialog.addEventListener("click", event => { if (event.target === confirmDialog) confirmDialog.close(); });
  detailDialog.addEventListener("click", event => { if (event.target === detailDialog) detailDialog.close(); });
  byId("detail-content").addEventListener("click", event => {
    const button = event.target.closest("[data-revision-key]");
    if (button) openApplicationRevision(button);
  });
  restoreRememberedSession();
})();
