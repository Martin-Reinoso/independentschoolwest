(() => {
  "use strict";

  const API_BASE = "https://6zyzo44sdb5zmmx53toktqrnuu0sikyd.lambda-url.ap-southeast-2.on.aws";
  const state = {
    email: "",
    challengeId: "",
    sessionToken: "",
    sessionExpiresAt: 0,
    dashboard: null,
    selectedEoi: null,
    selectedApplication: null,
    resendInvitation: null,
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

  async function api(path, { method = "GET", body, authenticated = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (authenticated && state.sessionToken) headers.Authorization = `Bearer ${state.sessionToken}`;
    const response = await fetch(`${API_BASE}${path}`, { method, headers, cache: "no-store", ...(body ? { body: JSON.stringify(body) } : {}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && authenticated) signOut("Your secure session has expired. Request a new access code.");
      const error = new Error(payload.message || "The portal could not complete this request.");
      error.code = payload.error;
      error.details = payload.details;
      throw error;
    }
    return payload;
  }

  function formatDate(value, includeTime = false) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-AU", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
  }

  function statusLabel(status) {
    return ({ invited: "Invited", in_progress: "In progress", pending_signatures: "Pending signatures", submitted: "Submitted" })[status] || String(status || "Unknown").replaceAll("_", " ");
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
      const result = await api("/v6/staff/access/verify-code", { method: "POST", body: { email: state.email, challengeId: state.challengeId, code }, authenticated: false });
      state.sessionToken = result.sessionToken;
      state.sessionExpiresAt = Date.now() + result.expiresInSeconds * 1000;
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

  function signOut(message = "") {
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

  async function loadDashboard({ quiet = false } = {}) {
    if (!state.sessionToken) return;
    const button = byId("refresh-button");
    if (!quiet) setLoading(button, true);
    clearNotices("dashboard-error");
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
    return element("span", `status-badge status-${["invited", "in_progress", "pending_signatures", "submitted"].includes(status) ? status : "default"}`, statusLabel(status));
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
        resend.addEventListener("click", () => openResend(record));
        actions.append(resend);
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

  async function prepareDocumentDownload(applicationId, document, button) {
    setLoading(button, true);
    clearNotices("detail-error");
    try {
      const result = await api("/v6/staff/documents/download", { method: "POST", body: { applicationId, documentId: document.documentId } });
      const link = element("a", "download-link", "Open document");
      link.href = result.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.title = `Link expires in ${result.expiresInSeconds} seconds`;
      button.replaceWith(link);
      link.focus();
    } catch (error) {
      setNotice("detail-error", error.message);
      setLoading(button, false);
    }
  }

  function renderApplicationDetail(application) {
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
      ["signatures", `${application.completedSignatureCount} of ${application.requiredSignatureCount}`]
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
        details.append(element("strong", "", document.fileName), element("small", "", `${fieldLabel(document.category)} · ${document.malwareScanStatus || "Scan status unavailable"}`));
        row.append(details);
        if (document.downloadable) {
          const button = element("button", "small-button", "Prepare download");
          button.type = "button";
          button.addEventListener("click", () => prepareDocumentDownload(application.applicationId, document, button));
          row.append(button);
        } else {
          row.append(element("small", "", document.malwareScanStatus === "no_threats_found" ? "Viewer role: no download" : "Not available"));
        }
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
    byId("detail-loading").hidden = true;
    content.hidden = false;
  }

  async function openApplicationDetail(record) {
    state.selectedApplication = record;
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

  function openResend(record) {
    state.resendInvitation = record;
    byId("confirm-copy").textContent = `A new private link will be sent to ${record.recipientEmail}. The earlier link will stop working.`;
    confirmDialog.showModal();
    byId("cancel-resend-button").focus();
  }

  async function confirmResend() {
    if (!state.resendInvitation) return;
    const button = byId("confirm-resend-button");
    setLoading(button, true);
    clearNotices("dashboard-error", "dashboard-message");
    try {
      const result = await api("/v6/staff/invitations/resend", { method: "POST", body: { invitationId: state.resendInvitation.invitationId } });
      confirmDialog.close();
      setNotice("dashboard-message", result.message);
      await loadDashboard({ quiet: true });
    } catch (error) {
      confirmDialog.close();
      setNotice("dashboard-error", error.message);
    } finally {
      setLoading(button, false);
      state.resendInvitation = null;
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
    createInvitation({ recipientEmail: email, firstName: byId("invite-first").value.trim(), lastName: byId("invite-last").value.trim(), studentFirstName: byId("invite-student-first").value.trim(), studentLastName: byId("invite-student-last").value.trim() }, byId("send-direct-invite"));
  });
  byId("eoi-invite-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!state.selectedEoi) {
      setNotice("invite-error", "Select an expression of interest first.");
      return;
    }
    createInvitation({ recipientEmail: state.selectedEoi.email, sourceEoiId: state.selectedEoi.eoiId }, byId("send-eoi-invite"));
  });
  byId("cancel-resend-button").addEventListener("click", () => { state.resendInvitation = null; confirmDialog.close(); });
  byId("confirm-resend-button").addEventListener("click", confirmResend);
  inviteDialog.addEventListener("click", event => { if (event.target === inviteDialog) inviteDialog.close(); });
  confirmDialog.addEventListener("click", event => { if (event.target === confirmDialog) confirmDialog.close(); });
  detailDialog.addEventListener("click", event => { if (event.target === detailDialog) detailDialog.close(); });
})();
