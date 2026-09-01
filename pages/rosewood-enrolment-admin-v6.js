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
    ,meetings: []
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
  const documentPreviewDialog = byId("document-preview-dialog");

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

  function planningStageLabel(stage) {
    return ({ not_started: "Not started", in_progress: "In progress", awaiting_signatures: "Awaiting signatures", staff_review: "Staff review", complete: "Application complete" })[stage] || String(stage || "Unknown").replaceAll("_", " ");
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
    byId("metric-requests").textContent = data.stats.applicationLinkRequests || 0;
    byId("metric-active").textContent = data.stats.inProgress;
    byId("metric-signatures").textContent = data.stats.pendingSignatures;
    byId("metric-submitted").textContent = data.stats.submitted;
    byId("nav-overview-count").textContent = data.planningSummary?.attention?.total || 0;
    byId("nav-planning-count").textContent = data.applications.length;
    byId("nav-app-count").textContent = data.applications.length;
    byId("nav-request-count").textContent = (data.applicationRequests || []).length;
    byId("nav-eoi-count").textContent = data.eois.length;
    byId("nav-email-count").textContent = data.recentEmails.length;
    const canManage = ["admin", "admissions"].includes(data.staff.role);
    byId("open-invite-button").hidden = !canManage;
    syncOverviewFilters();
    renderOverview();
    syncPlanningFilters();
    renderPlanning();
    renderApplications();
    renderApplicationRequests();
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

  function invitationSourceLabel(source) {
    return ({ public_application_request: "Public link request", staff_eoi_linked: "EOI-linked invitation", staff_direct: "Direct staff invitation" })[source] || "Direct invitation";
  }

  function syncOverviewSelect(id, values, allLabel, missingLabel) {
    const select = byId(id);
    const current = select.value;
    const options = [{ value: "all", label: allLabel }, ...values.map(value => ({ value, label: value }))];
    if ((state.dashboard?.applications || []).some(record => !record[id === "overview-year" ? "entryYear" : "entryLevel"])) options.push({ value: "missing", label: missingLabel });
    clear(select);
    options.forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    });
    select.value = options.some(option => option.value === current) ? current : "all";
  }

  function syncOverviewFilters() {
    const applications = state.dashboard?.applications || [];
    const years = [...new Set(applications.map(record => record.entryYear).filter(Boolean))].sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
    const levels = [...new Set(applications.map(record => record.entryLevel).filter(Boolean))].sort((left, right) => left.localeCompare(right));
    syncOverviewSelect("overview-year", years, "All entry years", "Year not provided");
    syncOverviewSelect("overview-level", levels, "All entry levels", "Level not provided");
  }

  function filteredOverviewApplications() {
    const query = byId("overview-search").value.trim().toLowerCase();
    const year = byId("overview-year").value;
    const level = byId("overview-level").value;
    const stage = byId("overview-stage").value;
    const matchesValue = (actual, expected) => expected === "all" || (expected === "missing" ? !actual : actual === expected);
    return (state.dashboard?.applications || []).filter(record => {
      const haystack = [record.studentName, record.reference, record.entryYear, record.entryLevel, planningStageLabel(record.planningStage)].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && matchesValue(record.entryYear, year) && matchesValue(record.entryLevel, level) && (stage === "all" || record.planningStage === stage);
    });
  }

  function overviewStageDefinitions() {
    return state.dashboard?.planningSummary?.stages || [
      { id: "not_started", label: "Not started" },
      { id: "in_progress", label: "In progress" },
      { id: "awaiting_signatures", label: "Awaiting signatures" },
      { id: "staff_review", label: "Staff review" },
      { id: "complete", label: "Application complete" }
    ];
  }

  function renderOverviewStageCards(records) {
    const container = byId("overview-stage-grid");
    const selectedStage = byId("overview-stage").value;
    const counts = records.reduce((result, record) => result.set(record.planningStage, (result.get(record.planningStage) || 0) + 1), new Map());
    clear(container);
    overviewStageDefinitions().forEach(stage => {
      const count = counts.get(stage.id) || 0;
      const card = element("button", `overview-stage-card overview-stage-${stage.id}`);
      card.type = "button";
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-pressed", String(selectedStage === stage.id));
      card.setAttribute("aria-label", `${stage.label}: ${count} application${count === 1 ? "" : "s"}. ${selectedStage === stage.id ? "Clear this stage filter" : "Filter to this stage"}.`);
      card.append(element("span", "", stage.label), element("strong", "", String(count)), element("small", "", count === 1 ? "student application" : "student applications"));
      card.addEventListener("click", () => {
        byId("overview-stage").value = selectedStage === stage.id ? "all" : stage.id;
        renderOverview();
      });
      container.append(card);
    });
  }

  function renderStageDistribution(records) {
    const list = byId("stage-distribution-list");
    const counts = records.reduce((result, record) => result.set(record.planningStage, (result.get(record.planningStage) || 0) + 1), new Map());
    clear(list);
    overviewStageDefinitions().forEach(stage => {
      const count = counts.get(stage.id) || 0;
      const row = element("div", "distribution-row");
      row.setAttribute("role", "listitem");
      const heading = element("div", "distribution-label");
      heading.append(element("span", "", stage.label), element("strong", "", String(count)));
      const progress = document.createElement("progress");
      progress.max = Math.max(records.length, 1);
      progress.value = count;
      progress.setAttribute("aria-label", `${stage.label}: ${count} of ${records.length} applications`);
      row.append(heading, progress);
      list.append(row);
    });
    byId("stage-distribution-total").textContent = `${records.length} application${records.length === 1 ? "" : "s"}`;
  }

  function renderEntryMix(records) {
    const list = byId("entry-mix-list");
    const counts = records.reduce((result, record) => {
      const key = `${record.entryYear || "missing"}\u0000${record.entryLevel || "missing"}`;
      result.set(key, (result.get(key) || 0) + 1);
      return result;
    }, new Map());
    const combinations = [...counts.entries()].map(([key, count]) => {
      const [year, level] = key.split("\u0000");
      return { year, level, count };
    }).sort((left, right) => (left.year === "missing" ? 1 : right.year === "missing" ? -1 : left.year.localeCompare(right.year, "en", { numeric: true })) || left.level.localeCompare(right.level));
    clear(list);
    combinations.forEach(item => {
      const row = element("div", "entry-mix-row");
      row.setAttribute("role", "listitem");
      const label = item.year === "missing" && item.level === "missing" ? "Entry details not provided" : `${item.year === "missing" ? "Year not provided" : item.year} · ${item.level === "missing" ? "Level not provided" : item.level}`;
      const heading = element("div", "entry-mix-label");
      heading.append(element("span", "", label), element("strong", "", String(item.count)));
      const progress = document.createElement("progress");
      progress.max = Math.max(records.length, 1);
      progress.value = item.count;
      progress.setAttribute("aria-label", `${label}: ${item.count} of ${records.length} applications`);
      row.append(heading, progress);
      list.append(row);
    });
    if (!combinations.length) list.append(element("p", "overview-empty-copy", "No entry information in this view."));
    byId("entry-mix-total").textContent = `${records.length} application${records.length === 1 ? "" : "s"}`;
  }

  function renderAttentionQueue(records) {
    const attentionRecords = records.filter(record => record.attention?.length).sort((left, right) => {
      const rank = reason => ({ critical: 0, warning: 1, notice: 2 })[reason.severity] ?? 3;
      return Math.min(...left.attention.map(rank)) - Math.min(...right.attention.map(rank)) || String(left.updatedAt || "").localeCompare(String(right.updatedAt || ""));
    });
    const list = byId("attention-list");
    clear(list);
    attentionRecords.forEach(record => {
      const card = element("article", "attention-card");
      const primary = element("div", "attention-primary");
      primary.append(element("strong", "", record.studentName || "Student name not yet provided"), element("small", "", record.reference || "Reference not yet assigned"));
      const reasons = element("div", "attention-reasons");
      record.attention.forEach(reason => {
        const badge = element("span", `attention-reason attention-${reason.severity}`, reason.label);
        badge.title = reason.detail;
        reasons.append(badge);
      });
      primary.append(reasons);
      card.append(primary);
      addRecordCell(card, "Entry", [record.entryLevel, record.entryYear].filter(Boolean).join(" · ") || "Not provided yet");
      addRecordCell(card, "Last activity", formatDate(record.updatedAt, true));
      card.append(element("span", `overview-stage-badge overview-stage-${record.planningStage}`, planningStageLabel(record.planningStage)));
      const actions = element("div", "record-actions");
      const review = element("button", "small-button", "Review");
      review.type = "button";
      review.addEventListener("click", () => openApplicationDetail(record));
      actions.append(review);
      card.append(actions);
      list.append(card);
    });
    byId("attention-count").textContent = String(attentionRecords.length);
    byId("attention-empty").hidden = attentionRecords.length > 0;
  }

  function renderOverview() {
    const records = filteredOverviewApplications();
    const total = state.dashboard?.applications?.length || 0;
    const attentionCount = records.filter(record => record.attention?.length).length;
    byId("overview-summary").textContent = `Showing ${records.length} of ${total} student application${total === 1 ? "" : "s"}. ${attentionCount} in this view ${attentionCount === 1 ? "needs" : "need"} staff attention.`;
    renderOverviewStageCards(records);
    renderStageDistribution(records);
    renderEntryMix(records);
    renderAttentionQueue(records);
  }

  function syncPlanningSelect(id, values, allLabel, missingLabel) {
    const select = byId(id);
    const current = select.value;
    const options = [{ value: "all", label: allLabel }, ...values.map(value => ({ value, label: value }))];
    if ((state.dashboard?.applications || []).some(record => !record[id === "planning-year" ? "entryYear" : "entryLevel"])) {
      options.push({ value: "missing", label: missingLabel });
    }
    clear(select);
    options.forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    });
    select.value = options.some(option => option.value === current) ? current : "all";
  }

  function syncPlanningFilters() {
    const applications = state.dashboard?.applications || [];
    const years = [...new Set(applications.map(record => record.entryYear).filter(Boolean))].sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
    const levels = [...new Set(applications.map(record => record.entryLevel).filter(Boolean))].sort((left, right) => left.localeCompare(right));
    syncPlanningSelect("planning-year", years, "All entry years", "Year not provided");
    syncPlanningSelect("planning-level", levels, "All entry levels", "Level not provided");
  }

  function planningSignatureLabel(record) {
    if (["invited", "in_progress"].includes(record.status)) return "Not requested yet";
    const required = Number(record.requiredSignatures || 0);
    const completed = Number(record.completedSignatures || 0);
    if (record.status === "submitted") return "Complete";
    return required > 0 ? `${completed} of ${required} complete` : "Staff follow-up";
  }

  function renderPlanningYearSummary(applications) {
    const summary = byId("planning-year-summary");
    clear(summary);
    const counts = applications.reduce((result, record) => {
      const year = record.entryYear || "missing";
      result.set(year, (result.get(year) || 0) + 1);
      return result;
    }, new Map());
    [...counts.entries()].sort(([left], [right]) => left === "missing" ? 1 : right === "missing" ? -1 : left.localeCompare(right, "en", { numeric: true })).forEach(([year, count]) => {
      const button = element("button", "planning-year-chip");
      button.type = "button";
      button.setAttribute("aria-label", `${year === "missing" ? "Entry year not provided" : `Entry year ${year}`}: ${count} application${count === 1 ? "" : "s"}`);
      button.append(element("span", "", year === "missing" ? "Year not provided" : year), element("strong", "", String(count)));
      button.addEventListener("click", () => {
        byId("planning-year").value = year;
        renderPlanning();
      });
      summary.append(button);
    });
  }

  function renderPlanning() {
    const allApplications = state.dashboard?.applications || [];
    const query = byId("planning-search").value.trim().toLowerCase();
    const year = byId("planning-year").value;
    const level = byId("planning-level").value;
    const status = byId("planning-status").value;
    const category = byId("planning-category").value;
    const sort = byId("planning-sort").value;
    const matchesValue = (actual, expected) => expected === "all" || (expected === "missing" ? !actual : actual === expected);
    const categoryApplications = allApplications.filter(record => category === "all" || (record.recordCategory || "family") === category);
    const compareIdentity = (left, right) => String(left.studentName || left.parentGuardianName || left.recipientEmail || "").localeCompare(String(right.studentName || right.parentGuardianName || right.recipientEmail || ""));
    const compareCreated = (left, right, direction) => {
      if (!left.createdAt && !right.createdAt) return compareIdentity(left, right);
      if (!left.createdAt) return 1;
      if (!right.createdAt) return -1;
      return direction * String(left.createdAt).localeCompare(String(right.createdAt)) || compareIdentity(left, right);
    };
    const records = categoryApplications
      .filter(record => {
        const haystack = [record.studentName, record.parentGuardianName, record.recipientEmail, record.reference, record.entryYear, record.entryLevel, statusLabel(record.status)].join(" ").toLowerCase();
        return (!query || haystack.includes(query)) && matchesValue(record.entryYear, year) && matchesValue(record.entryLevel, level) && (status === "all" || record.status === status);
      })
      .sort((left, right) => sort === "created_desc"
        ? compareCreated(left, right, -1)
        : sort === "created_asc"
          ? compareCreated(left, right, 1)
          : String(left.entryYear || "9999").localeCompare(String(right.entryYear || "9999"), "en", { numeric: true }) || String(left.entryLevel || "").localeCompare(String(right.entryLevel || "")) || compareIdentity(left, right));

    const missingPlanning = categoryApplications.filter(record => !record.entryYear || !record.entryLevel).length;
    const categoryLabel = category === "family" ? "family application" : category === "test" ? "test application" : "application";
    const hiddenTests = category === "family" ? allApplications.filter(record => record.recordCategory === "test").length : 0;
    byId("planning-summary").textContent = `Showing ${records.length} of ${categoryApplications.length} ${categoryLabel}${categoryApplications.length === 1 ? "" : "s"}. ${missingPlanning} ${missingPlanning === 1 ? "record is" : "records are"} still awaiting complete entry details.${hiddenTests ? ` ${hiddenTests} test ${hiddenTests === 1 ? "record is" : "records are"} hidden.` : ""}`;
    renderPlanningYearSummary(categoryApplications);

    const list = byId("planning-list");
    clear(list);
    records.forEach(record => {
      const card = element("article", "record-card planning-card");
      const primary = element("div", "record-primary");
      const parentGuardianName = record.parentGuardianName || "Parent/guardian name not provided";
      const primaryTitle = record.studentName || record.parentGuardianName || record.recipientEmail || "Family details not yet provided";
      primary.append(element("strong", "", primaryTitle));
      primary.append(element("small", "planning-family-context", record.studentName ? `Parent/guardian: ${parentGuardianName}` : "Parent/guardian · child details not started"));
      primary.append(element("small", "planning-contact-email", record.recipientEmail || "Email address not provided"));
      if (record.reference) primary.append(element("small", "planning-reference", record.reference));
      primary.append(element("small", "planning-created-at", record.createdAt ? `Application created ${formatDate(record.createdAt, true)}` : "Application date not available"));
      if (record.recordCategory === "test") primary.append(element("span", "planning-test-label", "Test record"));
      if (record.requiresStaffReview) primary.append(element("span", "planning-alert", "Staff review required"));
      card.append(primary);
      addRecordCell(card, "Entry year", record.entryYear || "Not provided yet");
      addRecordCell(card, "Entry level", record.entryLevel || "Not provided yet");
      addRecordCell(card, "Signatures", planningSignatureLabel(record), `Last activity ${formatDate(record.updatedAt, true)}`);
      card.append(statusBadge(record.status));
      const actions = element("div", "record-actions");
      const review = element("button", "small-button", "Review");
      review.type = "button";
      review.addEventListener("click", () => openApplicationDetail(record));
      actions.append(review);
      card.append(actions);
      list.append(card);
    });
    byId("planning-empty").hidden = records.length > 0;
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
      primary.append(element("strong", "", record.studentName || "Student name not yet provided"), element("small", "", `${record.recipientEmail} · ${invitationSourceLabel(record.invitationSource)}`));
      card.append(primary);
      addRecordCell(card, "Progress", `${record.percentComplete}% complete`, stageLabel(record.currentStage));
      const progress = document.createElement("progress");
      progress.className = "progress-line";
      progress.max = 100;
      const percentComplete = Number.isFinite(Number(record.percentComplete)) ? Math.max(0, Math.min(100, Number(record.percentComplete))) : 0;
      progress.value = percentComplete;
      progress.setAttribute("aria-label", `${percentComplete}% complete`);
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

  function renderApplicationRequests() {
    const list = byId("request-list");
    const query = byId("request-search").value.trim().toLowerCase();
    const records = (state.dashboard?.applicationRequests || []).filter(record => [record.parentGuardianName, record.recipientEmail, record.requestId].join(" ").toLowerCase().includes(query));
    clear(list);
    records.forEach(record => {
      const card = element("article", "record-card request-record-card");
      const primary = element("div", "record-primary");
      primary.append(element("strong", "", record.parentGuardianName || "Parent/guardian"), element("small", "", record.recipientEmail));
      card.append(primary);
      addRecordCell(card, "Requested", formatDate(record.requestedAt, true));
      addRecordCell(card, "Invitation", record.outcome === "reissued" ? "Existing family link reissued" : "New family invitation", record.invitationId);
      card.append(element("span", "status-badge status-invited", record.status === "invitation_queued" ? "Invitation queued" : statusLabel(record.status)));
      const actions = element("div", "record-actions");
      const linkedApplication = (state.dashboard?.applications || []).find(application => application.applicationId === record.applicationId);
      if (linkedApplication) {
        const review = element("button", "small-button", "Open application");
        review.type = "button";
        review.addEventListener("click", () => openApplicationDetail(linkedApplication));
        actions.append(review);
      }
      card.append(actions);
      list.append(card);
    });
    byId("request-empty").hidden = records.length > 0;
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

  async function loadMeetings() {
    try {
      const result = await api("/v6/staff/meetings");
      state.meetings = result.series || [];
      byId("nav-meeting-count").textContent = state.meetings.length;
      const select = byId("meeting-slot-series");
      const selected = select.value;
      clear(select); select.add(new Option("Select a schedule", ""));
      state.meetings.filter(item => item.status === "open").forEach(item => select.add(new Option(item.title, item.id, false, item.id === selected)));
      renderMeetings();
    } catch (error) { setNotice("meeting-error", error.message); }
  }

  function renderMeetings() {
    const list = byId("meeting-series-list"); clear(list);
    state.meetings.forEach(series => {
      const card = element("article", "meeting-series-card");
      card.append(element("h3", "", series.title), element("p", "", `${series.hostName} · ${series.location} · ${series.durationMinutes} minutes`));
      const slots = element("div", "slot-list");
      (series.slots || []).forEach(slot => slots.append(element("span", `slot-chip ${slot.status}`, `${formatDate(slot.startsAt, true)} · ${fieldLabel(slot.status)}`)));
      if (!slots.children.length) slots.append(element("span", "panel-note", "No times added yet."));
      card.append(slots); list.append(card);
    });
    if (!state.meetings.length) list.append(element("p", "panel-note", "No principal meeting schedules have been created."));
  }

  function showPanel(name) {
    document.querySelectorAll("[data-workspace-panel]").forEach(panel => { panel.hidden = panel.id !== `${name}-panel`; });
    document.querySelectorAll(".nav-button").forEach(button => {
      const active = button.dataset.panel === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    if (name === "meetings") loadMeetings();
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

  function clearCaseSectionHash() {
    if (!window.location.hash.startsWith("#case-section-")) return;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
  }

  function scrollToCaseSection(sectionId) {
    const target = byId(`case-section-${sectionId}`);
    if (!target) return;
    const navigation = target.parentElement?.querySelector(".case-section-nav");
    const top = detailDialog.scrollTop + target.getBoundingClientRect().top - detailDialog.getBoundingClientRect().top - (navigation?.offsetHeight || 0) - 16;
    detailDialog.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function resetDocumentPreview() {
    byId("document-preview-frame").removeAttribute("src");
    byId("document-preview-image").removeAttribute("src");
    byId("document-download-link").removeAttribute("href");
    byId("document-preview-frame").hidden = true;
    byId("document-preview-image").hidden = true;
    byId("document-preview-content").hidden = true;
    byId("document-preview-actions").hidden = true;
    byId("document-preview-loading").hidden = false;
    clearNotices("document-preview-error");
  }

  async function openDocumentPreview(application, documentRecord, button) {
    resetDocumentPreview();
    byId("document-preview-title").textContent = documentRecord.fileName || "Application document";
    byId("document-preview-summary").textContent = `${fieldLabel(documentRecord.category)} · Preparing a short-lived staff preview...`;
    documentPreviewDialog.showModal();
    setLoading(button, true);
    try {
      const result = await api("/v6/staff/applications/documents/preview", { method: "POST", body: { applicationId: application.applicationId, documentId: documentRecord.documentId } });
      const isPdf = result.mimeType === "application/pdf";
      const preview = isPdf ? byId("document-preview-frame") : byId("document-preview-image");
      preview.src = result.previewUrl;
      preview.hidden = false;
      if (!isPdf) preview.alt = `Preview of ${result.fileName}`;
      byId("document-download-link").href = result.downloadUrl;
      byId("document-preview-summary").textContent = `${result.fileName} · ${fieldLabel(documentRecord.category)}`;
      byId("document-preview-loading").hidden = true;
      byId("document-preview-content").hidden = false;
      byId("document-preview-actions").hidden = false;
    } catch (error) {
      byId("document-preview-loading").hidden = true;
      setNotice("document-preview-error", error.message);
    } finally {
      setLoading(button, false);
    }
  }

  function renderApplicationDetail(application, { resetScroll = false } = {}) {
    const previousScrollTop = detailDialog.scrollTop;
    state.currentApplicationDetail = application;
    const content = byId("detail-content");
    clear(content);
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
    const review = application.review;
    if (review?.sections?.length) {
      const navigation = element("nav", "case-section-nav");
      navigation.setAttribute("aria-label", "Application sections");
      review.sections.forEach(section => {
        const button = element("button", "", section.title);
        button.type = "button";
        button.addEventListener("click", () => scrollToCaseSection(section.id));
        navigation.append(button);
      });
      content.append(navigation);
      review.sections.forEach(section => {
        const wrapper = element("section", "detail-section readable-section");
        wrapper.id = `case-section-${section.id}`;
        wrapper.append(element("h3", "", section.title));
        if (section.note) wrapper.append(element("p", "section-note", section.note));
        (section.groups || []).forEach(group => {
          const groupElement = element("div", "review-group");
          const heading = element("h4", "", group.title || section.title);
          groupElement.append(heading);
          const list = element("dl", "detail-grid");
          (group.items || []).forEach(item => {
            const value = displayValue(item.value);
            if (!value) return;
            const row = element("div", "detail-item");
            row.append(element("dt", "", item.label), element("dd", "", value));
            list.append(row);
          });
          groupElement.append(list);
          wrapper.append(groupElement);
        });
        content.append(wrapper);
      });
    } else {
      const fallback = detailSection("Recorded application answers", Object.entries(application.values || {}).filter(([, value]) => value !== "" && value != null));
      if (fallback) content.append(fallback);
    }
    if (application.documents?.length) {
      const section = element("section", "detail-section");
      section.append(element("h3", "", "Documents"));
      const list = element("div", "document-list");
      application.documents.forEach(document => {
        const row = element("div", "document-row");
        const details = element("div");
        const storageLabel = ["google_drive", "google_drive_via_s3"].includes(document.storageProvider) ? "Restricted enrolment storage" : "Legacy document storage";
        details.append(element("strong", "", document.fileName), element("small", "", `${fieldLabel(document.category)} · ${storageLabel}`));
        row.append(details);
        const previewButton = element("button", "secondary-button compact-button", "Preview");
        previewButton.type = "button";
        previewButton.setAttribute("aria-label", `Preview ${document.fileName}`);
        previewButton.addEventListener("click", () => openDocumentPreview(application, document, previewButton));
        row.append(previewButton);
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
    if (["admin", "admissions"].includes(state.dashboard?.staff?.role)) {
      content.append(renderCaseReviewControls(application), renderCaseEmailComposer(application), renderMeetingInvitation(application));
    }
    content.append(renderCaseTimeline(application));
    byId("detail-loading").hidden = true;
    content.hidden = false;
    requestAnimationFrame(() => { detailDialog.scrollTop = resetScroll ? 0 : previousScrollTop; });
  }

  function formField(label, control) {
    const wrapper = element("label", "staff-tool-field");
    wrapper.append(element("span", "", label), control);
    return wrapper;
  }

  function renderCaseReviewControls(application) {
    const current = application.caseReview || { status: "not_started", checklist: {}, note: "", version: 0 };
    const section = element("section", "detail-section staff-tool-section");
    section.append(element("h3", "", "Staff review"));
    const form = element("form", "staff-tool-form");
    const status = document.createElement("select");
    [["not_started", "Not started"], ["in_progress", "In progress"], ["further_information_required", "Further information required"], ["ready_for_principal", "Ready for principal"], ["on_hold", "On hold"], ["review_complete", "Review complete"]].forEach(([value, label]) => { const option = new Option(label, value, false, current.status === value); status.add(option); });
    const checks = element("div", "review-checklist");
    [["identity_reviewed", "Identity and family details reviewed"], ["documents_reviewed", "Documents reviewed"], ["signatures_reviewed", "Signatures reviewed"], ["follow_up_resolved", "Follow-up resolved"]].forEach(([key, label]) => {
      const input = document.createElement("input"); input.type = "checkbox"; input.checked = current.checklist?.[key] === true;
      const item = element("label", "check-row"); item.append(input, element("span", "", label)); checks.append(item); input.dataset.checkKey = key;
    });
    const note = document.createElement("textarea"); note.rows = 4; note.value = current.note || ""; note.placeholder = "Internal review note (staff only)";
    const button = element("button", "primary-button", "Save review"); button.type = "submit";
    form.append(formField("Review status", status), checks, formField("Internal note", note), button);
    form.addEventListener("submit", async event => {
      event.preventDefault(); setLoading(button, true); clearNotices("detail-error");
      try {
        const checklist = Object.fromEntries([...checks.querySelectorAll("input")].map(input => [input.dataset.checkKey, input.checked]));
        const result = await api("/v6/staff/applications/review", { method: "POST", body: { applicationId: application.applicationId, expectedVersion: current.version || 0, status: status.value, checklist, note: note.value } });
        application.caseReview = result.review; renderApplicationDetail(application);
      } catch (error) { setNotice("detail-error", error.message); setLoading(button, false); }
    });
    section.append(form); return section;
  }

  function caseRecipients(application) {
    const values = [{ email: application.recipientEmail, name: "Submitting applicant" }];
    (application.signerControls || []).forEach(control => { if (control.contactPermission === "Contact permitted" && control.currentEmail && !values.some(item => item.email === control.currentEmail)) values.push({ email: control.currentEmail, name: control.name || "Parent/guardian" }); });
    return values;
  }

  function renderCaseEmailComposer(application) {
    const section = element("section", "detail-section staff-tool-section"); section.append(element("h3", "", "Write to the family"));
    const form = element("form", "staff-tool-form");
    const recipient = document.createElement("select"); caseRecipients(application).forEach(item => recipient.add(new Option(`${item.name} · ${item.email}`, item.email)));
    const purpose = document.createElement("select"); [["missing_document", "Missing document"], ["replacement_document", "Replacement document"], ["clarification", "Question about the application"], ["additional_information", "Additional information"], ["principal_meeting", "Principal meeting"], ["general_update", "General update"]].forEach(([value, label]) => purpose.add(new Option(label, value)));
    const subject = document.createElement("input"); subject.maxLength = 180;
    const body = document.createElement("textarea"); body.rows = 9; body.maxLength = 20000;
    const actions = element("div", "composer-actions");
    const save = element("button", "secondary-button", "Save draft"); save.type = "button";
    const test = element("button", "secondary-button", "Send test to me"); test.type = "button";
    const send = element("button", "primary-button", "Send reviewed email"); send.type = "button"; send.disabled = true;
    let messageId = "";
    async function saveDraft() {
      const result = await api("/v6/staff/applications/messages/draft", { method: "POST", body: { applicationId: application.applicationId, messageId, recipientEmail: recipient.value, purpose: purpose.value, subject: subject.value, body: body.value } });
      messageId = result.message.id; send.disabled = false; return result.message;
    }
    save.addEventListener("click", async () => { setLoading(save, true); try { await saveDraft(); setNotice("dashboard-message", "Email draft saved. Nothing has been sent."); } catch (error) { setNotice("detail-error", error.message); } finally { setLoading(save, false); } });
    test.addEventListener("click", async () => { setLoading(test, true); try { await api("/v6/staff/applications/messages/test", { method: "POST", body: { applicationId: application.applicationId, subject: subject.value, body: body.value } }); setNotice("dashboard-message", "Test email sent to your staff address."); } catch (error) { setNotice("detail-error", error.message); } finally { setLoading(test, false); } });
    send.addEventListener("click", async () => {
      if (!window.confirm("Send this reviewed email to the selected family recipient?")) return;
      setLoading(send, true);
      try { if (!messageId) await saveDraft(); await api("/v6/staff/applications/messages/send", { method: "POST", body: { applicationId: application.applicationId, messageId, confirmation: "Send reviewed email" } }); const result = await api("/v6/staff/applications/detail", { method: "POST", body: { applicationId: application.applicationId } }); renderApplicationDetail(result.application); }
      catch (error) { setNotice("detail-error", error.message); setLoading(send, false); }
    });
    actions.append(save, test, send); form.append(element("p", "panel-note", "Every message is written and reviewed by staff. Choosing a purpose never sends an email."), formField("Recipient", recipient), formField("Purpose", purpose), formField("Subject", subject), formField("Message", body), actions); section.append(form); return section;
  }

  function renderCaseTimeline(application) {
    const section = element("section", "detail-section staff-tool-section"); section.append(element("h3", "", "Communication history"));
    const list = element("div", "case-timeline");
    (application.communications || []).forEach(message => { const item = element("article", "timeline-item"); item.append(element("strong", "", message.subject), element("span", "", `${fieldLabel(message.purpose)} · ${message.status === "draft" ? "Draft, not sent" : fieldLabel(message.deliveryStatus)} · ${formatDate(message.updatedAt, true)}`), element("p", "", message.body)); list.append(item); });
    if (!list.children.length) list.append(element("p", "panel-note", "No case correspondence has been recorded.")); section.append(list); return section;
  }

  function renderMeetingInvitation(application) {
    const section = element("section", "detail-section staff-tool-section"); section.append(element("h3", "", "Invite to a principal meeting"));
    const form = element("form", "staff-tool-form");
    const schedule = document.createElement("select"); schedule.add(new Option("Select a meeting schedule", "")); state.meetings.forEach(item => schedule.add(new Option(item.title, item.id)));
    const recipient = document.createElement("select"); caseRecipients(application).forEach(item => recipient.add(new Option(`${item.name} · ${item.email}`, item.email)));
    const button = element("button", "primary-button", "Send private booking invitation"); button.type = "submit";
    form.append(element("p", "panel-note", "The family will verify their invited email before seeing available times."), formField("Schedule", schedule), formField("Recipient", recipient), button);
    form.addEventListener("submit", async event => { event.preventDefault(); if (!schedule.value) return setNotice("detail-error", "Select a meeting schedule."); if (!window.confirm("Send this private meeting invitation?")) return; setLoading(button, true); try { await api("/v6/staff/applications/meeting-invitations", { method: "POST", body: { applicationId: application.applicationId, seriesId: schedule.value, recipientEmail: recipient.value, confirmation: "Send meeting invitation" } }); setNotice("dashboard-message", "Private meeting invitation queued."); } catch (error) { setNotice("detail-error", error.message); } finally { setLoading(button, false); } });
    section.append(form); return section;
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
    clearCaseSectionHash();
    detailDialog.scrollTop = 0;
    detailDialog.showModal();
    try {
      if (!state.meetings.length) await loadMeetings();
      const result = await api("/v6/staff/applications/detail", { method: "POST", body: { applicationId: record.applicationId } });
      renderApplicationDetail(result.application, { resetScroll: true });
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
  byId("overview-search").addEventListener("input", renderOverview);
  byId("overview-year").addEventListener("change", renderOverview);
  byId("overview-level").addEventListener("change", renderOverview);
  byId("overview-stage").addEventListener("change", renderOverview);
  byId("application-search").addEventListener("input", renderApplications);
  byId("planning-search").addEventListener("input", renderPlanning);
  byId("planning-year").addEventListener("change", renderPlanning);
  byId("planning-level").addEventListener("change", renderPlanning);
  byId("planning-status").addEventListener("change", renderPlanning);
  byId("planning-category").addEventListener("change", renderPlanning);
  byId("planning-sort").addEventListener("change", renderPlanning);
  byId("request-search").addEventListener("input", renderApplicationRequests);
  byId("application-status").addEventListener("change", renderApplications);
  byId("eoi-search").addEventListener("input", renderEois);
  byId("invite-eoi-search").addEventListener("input", renderEoiPicker);
  document.querySelectorAll(".nav-button").forEach(button => button.addEventListener("click", () => showPanel(button.dataset.panel)));
  byId("meeting-series-form").addEventListener("submit", async event => {
    event.preventDefault(); clearNotices("meeting-error", "meeting-message");
    const button = event.submitter; setLoading(button, true);
    try {
      await api("/v6/staff/meetings/series", { method: "POST", body: { title: byId("meeting-series-title").value, hostName: byId("meeting-series-host").value, location: byId("meeting-series-location").value, durationMinutes: Number(byId("meeting-series-duration").value) } });
      event.target.reset(); byId("meeting-series-duration").value = "30"; setNotice("meeting-message", "Meeting schedule created."); await loadMeetings();
    } catch (error) { setNotice("meeting-error", error.message); } finally { setLoading(button, false); }
  });
  byId("meeting-slot-form").addEventListener("submit", async event => {
    event.preventDefault(); clearNotices("meeting-error", "meeting-message");
    const button = event.submitter; setLoading(button, true);
    try {
      await api("/v6/staff/meetings/slots", { method: "POST", body: { seriesId: byId("meeting-slot-series").value, startsAt: new Date(byId("meeting-slot-start").value).toISOString() } });
      byId("meeting-slot-start").value = ""; setNotice("meeting-message", "Available meeting time added."); await loadMeetings();
    } catch (error) { setNotice("meeting-error", error.message); } finally { setLoading(button, false); }
  });
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
  documentPreviewDialog.addEventListener("click", event => { if (event.target === documentPreviewDialog) documentPreviewDialog.close(); });
  documentPreviewDialog.addEventListener("close", resetDocumentPreview);
  byId("detail-content").addEventListener("click", event => {
    const button = event.target.closest("[data-revision-key]");
    if (button) openApplicationRevision(button);
  });
  restoreRememberedSession();
})();
