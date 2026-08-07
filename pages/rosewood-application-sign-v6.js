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

  function reviewGroup(group) {
    const items = Array.isArray(group?.items) ? group.items : [];
    return `<article class="application-review-group"><header><h4>${esc(group?.title || "Application information")}</h4>${group?.badge ? `<span class="review-badge">${esc(group.badge)}</span>` : ""}</header><dl>${items.map(item => `<div class="review-answer"><dt>${esc(item?.label || "Answer")}</dt><dd>${esc(item?.value || "Not provided")}</dd></div>`).join("")}</dl></article>`;
  }

  function reviewSection(section, index) {
    const groups = Array.isArray(section?.groups) ? section.groups : [];
    const headingId = `review-section-${index}`;
    return `<section class="application-review-section" aria-labelledby="${headingId}"><header class="application-review-heading"><span>${String(index + 1).padStart(2, "0")}</span><h3 id="${headingId}">${esc(section?.title || "Application section")}</h3></header>${section?.note ? `<p class="application-review-note">${esc(section.note)}</p>` : ""}<div class="application-review-groups">${groups.map(reviewGroup).join("")}</div></section>`;
  }

  function review() {
    const context = state.context;
    const application = context.review || {};
    const sections = Array.isArray(application.sections) ? application.sections : [];
    if (!sections.length) return `<div class="section-intro"><p class="eyebrow">Read-only review</p><h2>The submitted application is not available to review</h2><p class="lead">Do not proceed to signing without the complete application. Return to verification and try again, or contact Rosewood College for assistance.</p></div><div class="notice legal-note"><strong>Review required</strong><p>The complete frozen application could not be loaded. No signature has been recorded.</p></div><div class="signing-actions"><button type="button" class="button button-secondary" data-back>Back to verification</button></div>`;
    return `<div class="section-intro"><p class="eyebrow">Read-only review</p><h2>Review the complete submitted application</h2><p class="lead">Review every section below before signing. The submitted Application for Enrolment cannot be changed from this page.</p></div><p class="review-record-line"><span><strong>Student:</strong> ${esc(context.studentName)}</span><span><strong>Application reference:</strong> ${esc(context.reference)}</span><span><strong>Submitted:</strong> ${esc(application.submittedAt || "Recorded")}</span><span><strong>Signing as:</strong> ${esc(context.signerName)} (${esc(context.signerEmail)})</span></p><div class="application-review">${sections.map(reviewSection).join("")}</div><label class="check-line review-confirmation"><input name="ready" type="checkbox" value="Confirmed" required><span>I have reviewed the complete submitted application and am ready to proceed to signing. <span class="required">*</span></span></label>${actions("Continue to sign")}`;
  }

  function sign() {
    return `<div class="section-intro"><p class="eyebrow">Electronic signature</p><h2>Sign the application</h2><p class="lead">Both declarations must be accepted before the signature area is enabled.</p></div><div class="signing-declaration"><label class="check-line"><input name="ip" type="checkbox" value="Confirmed" required><span>${esc(state.context.declarations.ip)} <span class="required">*</span></span></label><label class="check-line"><input name="terms" type="checkbox" value="Confirmed" required><span>${esc(state.context.declarations.terms)} <span class="required">*</span></span></label></div><canvas class="signing-canvas" width="960" height="220" aria-label="Signature drawing area" tabindex="0"></canvas><div class="inline-actions"><button type="button" class="button button-secondary" data-clear disabled>Clear signature</button></div><label class="field readonly-field"><span>Date</span><input type="date" value="${new Date().toISOString().slice(0, 10)}" readonly></label>${actions("Submit signature")}`;
  }

  function complete() {
    const statusMessage = state.submitStatus === "submitted" ? "All required signatures have now been received." : state.submitStatus === "staff_review_required" ? "Rosewood College will review the remaining consent requirements." : "The application is still waiting for another required signature.";
    return `<div class="signing-complete"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">Application for Enrolment</p><h2>Signature recorded</h2><p>Your signature has been securely recorded for ${esc(state.context.studentName)}.</p><div class="status-card"><strong>Reference ${esc(state.context.reference)}</strong><p>${statusMessage}</p></div><p>You can close this page safely.</p></div>`;
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

  if (taskToken) api("/v6/application/signatures/opened", { taskToken }).catch(() => {});
  render();
})();
