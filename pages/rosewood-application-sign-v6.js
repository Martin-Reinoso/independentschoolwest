(function () {
  "use strict";

  const apiBase = "https://6zyzo44sdb5zmmx53toktqrnuu0sikyd.lambda-url.ap-southeast-2.on.aws";
  const taskToken = new URLSearchParams(location.search).get("task") || "";
  const form = document.querySelector("#signing-form");
  const root = document.querySelector("#signing-root");
  const error = document.querySelector("#signing-error");
  const status = document.querySelector("#signing-status");
  const state = { step: 0, email: "", code: "", challengeId: "", sessionToken: "", context: null, signed: false, resendAt: 0 };
  const labels = ["Verify identity", "Review application", "Sign", "Complete"];

  function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
  function setStatus(title, copy, saved = false) { status.classList.toggle("is-saved", saved); status.querySelector("strong").textContent = title; status.querySelector("small").textContent = copy; }
  function showError(message) { error.querySelector("ul").innerHTML = `<li>${esc(message)}</li>`; error.hidden = false; error.focus(); }
  function clearError() { error.hidden = true; }

  async function api(path, body, authenticated = false) {
    const response = await fetch(`${apiBase}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(authenticated ? { Authorization: `Bearer ${state.sessionToken}` } : {}) }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "The secure signing service could not complete this request.");
    return payload;
  }

  function actions(label, back = true) {
    return `<div class="signing-actions">${back ? '<button type="button" class="button button-secondary" data-back>Back</button>' : "<span></span>"}<button type="submit" class="button button-primary">${label}</button></div>`;
  }

  function identity() {
    if (!taskToken) return `<div class="notice legal-note"><strong>Private signing link required</strong><p>Open the unique link in the Rosewood College signature-request email.</p></div>`;
    if (!state.challengeId) return `<div class="section-intro"><p class="eyebrow">Identity</p><h2>Verify your email</h2><p class="lead">Enter the email address that received this private signing request.</p></div><label class="field"><span>Email <span class="required">*</span></span><input name="email" type="email" autocomplete="email" value="${esc(state.email)}" required></label>${actions("Send verification code", false)}`;
    return `<div class="section-intro"><p class="eyebrow">Identity</p><h2>Enter your code</h2><p class="lead">A six-digit code has been sent to the invited email address and expires after 10 minutes.</p></div><label class="field"><span>Verification code <span class="required">*</span></span><input name="code" inputmode="numeric" maxlength="6" value="${esc(state.code)}" required></label><p class="resend-status" aria-live="polite">Use the most recent code sent by Rosewood College.</p><div class="inline-actions"><button type="button" class="button button-secondary" data-resend>Resend code</button></div>${actions("Verify and continue")}`;
  }

  function review() {
    const context = state.context;
    const conditions = context.review.conditions;
    return `<div class="section-intro"><p class="eyebrow">Read-only review</p><h2>Review the submitted application</h2><p class="lead">You are signing revision ${esc(context.revision)} of the Application for Enrolment. Answers cannot be changed from this signing page.</p></div><div class="signing-review-grid"><article class="review-card"><h3>Student</h3><dl><dt>Name</dt><dd>${esc(context.studentName)}</dd><dt>Application reference</dt><dd>${esc(context.reference)}</dd></dl></article><article class="review-card"><h3>Your signing details</h3><dl><dt>Name</dt><dd>${esc(context.signerName)}</dd><dt>Email</dt><dd>${esc(context.signerEmail)}</dd></dl></article><article class="review-card"><h3>Previous school permission</h3><p>${esc(conditions.previous_school_permission || "Not provided")}</p></article><article class="review-card"><h3>Fee responsibility</h3><p>${esc(conditions.fee_option || "Not provided")}</p></article></div><label class="check-line"><input name="ready" type="checkbox" value="Confirmed" required><span>I have reviewed the submitted application and am ready to proceed to signing. <span class="required">*</span></span></label>${actions("Continue to sign")}`;
  }

  function sign() {
    return `<div class="section-intro"><p class="eyebrow">Electronic signature</p><h2>Sign the application</h2><p class="lead">Both declarations must be accepted before the signature area is enabled.</p></div><div class="signing-declaration"><label class="check-line"><input name="ip" type="checkbox" value="Confirmed" required><span>${esc(state.context.declarations.ip)} <span class="required">*</span></span></label><label class="check-line"><input name="terms" type="checkbox" value="Confirmed" required><span>${esc(state.context.declarations.terms)} <span class="required">*</span></span></label></div><canvas class="signing-canvas" width="960" height="220" aria-label="Signature drawing area" tabindex="0"></canvas><div class="inline-actions"><button type="button" class="button button-secondary" data-clear disabled>Clear signature</button></div><label class="field readonly-field"><span>Date</span><input type="date" value="${new Date().toISOString().slice(0, 10)}" readonly></label>${actions("Submit signature")}`;
  }

  function complete() {
    return `<div class="signing-complete"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">Application for Enrolment</p><h2>Signature recorded</h2><p>Your signature has been securely recorded for ${esc(state.context.studentName)}.</p><div class="status-card"><strong>Reference ${esc(state.context.reference)}</strong><p>${state.submitStatus === "submitted" ? "All required signatures have now been received." : "The application is still waiting for another required signature."}</p></div><p>You can close this page safely.</p></div>`;
  }

  function render() {
    document.querySelector("#signing-steps").innerHTML = labels.map((label, index) => `<li class="${index === state.step ? "is-current" : index < state.step ? "is-complete" : ""}">${index + 1}. ${label}</li>`).join("");
    root.innerHTML = [identity, review, sign, complete][state.step]();
    clearError();
    if (state.step === 2) bindCanvas();
  }

  function bindCanvas() {
    const canvas = root.querySelector("canvas");
    const context = canvas.getContext("2d");
    const clear = root.querySelector("[data-clear]");
    context.lineWidth = 3; context.lineCap = "round"; context.strokeStyle = "#14233d";
    let drawing = false;
    const unlocked = () => root.querySelector('[name="ip"]').checked && root.querySelector('[name="terms"]').checked;
    const point = event => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
    canvas.addEventListener("pointerdown", event => { if (!unlocked()) return showError("Accept both declarations before signing."); drawing = true; canvas.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); });
    canvas.addEventListener("pointermove", event => { if (!drawing) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); state.signed = true; clear.disabled = false; });
    canvas.addEventListener("pointerup", () => { drawing = false; });
    canvas.addEventListener("keydown", event => { if (event.key !== "Enter") return; event.preventDefault(); if (!unlocked()) return showError("Accept both declarations before signing."); context.beginPath(); context.moveTo(130, 140); context.bezierCurveTo(280, 25, 410, 185, 630, 80); context.stroke(); state.signed = true; clear.disabled = false; });
    clear.addEventListener("click", () => { context.clearRect(0, 0, canvas.width, canvas.height); state.signed = false; clear.disabled = true; });
  }

  async function requestCode() {
    const result = await api("/v6/application/signatures/request-code", { taskToken, email: state.email });
    state.challengeId = result.challengeId;
    state.resendAt = Date.now() + result.resendAfterSeconds * 1000;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault(); clearError();
    if (!form.reportValidity()) return;
    const button = root.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      if (state.step === 0 && !state.challengeId) { state.email = form.elements.email.value.trim(); setStatus("Sending code", "Please keep this page open"); await requestCode(); render(); return; }
      if (state.step === 0) { state.code = form.elements.code.value.trim(); setStatus("Verifying", "Secure identity check"); const result = await api("/v6/application/signatures/verify-code", { taskToken, challengeId: state.challengeId, code: state.code }); state.sessionToken = result.sessionToken; state.context = result.context; state.step = 1; setStatus("Verified", state.context.signerName, true); render(); return; }
      if (state.step === 1) { state.step = 2; render(); return; }
      if (state.step === 2) { if (!state.signed) throw new Error("Provide your signature before submitting."); const canvas = root.querySelector("canvas"); setStatus("Submitting", "Please keep this page open"); const result = await api("/v6/application/signatures/submit", { reviewAcknowledged: true, ipAcknowledged: form.elements.ip.checked, termsAcknowledged: form.elements.terms.checked, signatureDataUrl: canvas.toDataURL("image/png") }, true); state.submitStatus = result.status; state.step = 3; setStatus("Signature saved", "Securely recorded", true); render(); }
    } catch (caught) { button.disabled = false; showError(caught.message); setStatus("Action required", "Review the message below"); }
  });

  form.addEventListener("click", async event => {
    if (event.target.closest("[data-back]")) { state.step = Math.max(0, state.step - 1); render(); }
    if (event.target.closest("[data-resend]")) {
      if (Date.now() < state.resendAt) return showError("Please wait before requesting another code.");
      try { await requestCode(); root.querySelector(".resend-status").textContent = "A new code has been sent if the signing request and email match."; } catch (caught) { showError(caught.message); }
    }
  });

  render();
})();
