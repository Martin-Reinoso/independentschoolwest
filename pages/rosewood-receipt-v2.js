(() => {
  "use strict";

  const config = window.ROSEWOOD_V2_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const preview = params.get("preview") === "1";
  const apiEndpoint = String(config.apiEndpoint || "").replace(/\/+$/, "");
  const incomingToken = params.get("receipt") || "";
  const storedToken = sessionStorage.getItem("rosewood_v2_receipt") || "";
  let receiptToken = incomingToken || storedToken;
  let sessionToken = sessionStorage.getItem("rosewood_v2_receipt_session") || "";
  let challengeId = "";

  const accessView = document.getElementById("receipt-access-view");
  const receiptView = document.getElementById("receipt-view");
  const emailCard = document.getElementById("receipt-email-card");
  const otpCard = document.getElementById("receipt-otp-card");
  const emailInput = document.getElementById("receipt-email");
  const otpInput = document.getElementById("receipt-otp");
  const verifyButton = document.getElementById("receipt-verify-button");

  if (!preview && incomingToken) {
    if (storedToken && storedToken !== incomingToken) {
      sessionStorage.removeItem("rosewood_v2_receipt_session");
      sessionToken = "";
    }
    sessionStorage.setItem("rosewood_v2_receipt", incomingToken);
    params.delete("receipt");
    const query = params.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function operationId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  function showError(target, message) {
    target.textContent = message || "";
    target.hidden = !message;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "Not recorded";
    return new Intl.DateTimeFormat("en-AU", { dateStyle: "long", timeStyle: "short" }).format(date);
  }

  async function api(path, options = {}) {
    if (preview) throw new Error("Preview mode cannot call the service.");
    if (!apiEndpoint) throw new Error("The V2 secure receipt service has not been connected yet.");
    const response = await fetch(`${apiEndpoint}${path}`, {
      method: options.method || "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "The secure receipt service could not complete this request.");
    return payload;
  }

  function renderReceipt(receipt) {
    const signers = Array.isArray(receipt.signers) ? receipt.signers : [];
    const completeCount = signers.filter((signer) => signer.status === "signed").length;
    document.getElementById("receipt-welcome").textContent = `${receipt.recipientName || "Guardian"}, this is the completion record available to you.`;
    document.getElementById("receipt-reference").textContent = receipt.reference || "Reference unavailable";
    document.getElementById("receipt-student").textContent = receipt.studentName || "Student";
    document.getElementById("receipt-submitted").textContent = formatDate(receipt.submittedAt);
    document.getElementById("receipt-completed").textContent = formatDate(receipt.completedAt);
    document.getElementById("receipt-revision").textContent = String(receipt.revision ?? "Not recorded");
    document.getElementById("receipt-policy").textContent = receipt.policyVersion || "Not recorded";
    document.getElementById("receipt-signature-count").textContent = `${completeCount} of ${signers.length} complete`;
    document.getElementById("receipt-viewed-at").textContent = `Viewed ${formatDate(new Date().toISOString())}`;

    const list = document.getElementById("receipt-signer-list");
    list.replaceChildren(...signers.map((signer, index) => {
      const item = document.createElement("li");
      item.className = signer.status === "signed" ? "is-complete" : "";
      const number = document.createElement("span");
      number.className = "receipt-signer-number";
      number.textContent = signer.status === "signed" ? "✓" : String(index + 1);
      const identity = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = signer.name || "Required guardian";
      const relationship = document.createElement("span");
      relationship.textContent = signer.relationship || "Guardian";
      identity.append(name, relationship);
      const state = document.createElement("div");
      state.className = "receipt-signer-state";
      const status = document.createElement("strong");
      status.textContent = signer.status === "signed" ? "Signature recorded" : "Pending";
      const at = document.createElement("span");
      at.textContent = signer.signedAt ? formatDate(signer.signedAt) : "No completion time";
      state.append(status, at);
      item.append(number, identity, state);
      return item;
    }));

    accessView.hidden = true;
    receiptView.hidden = false;
    document.title = `Receipt ${receipt.reference || ""} | Rosewood College`;
    const title = document.getElementById("receipt-title");
    title.focus({ preventScroll: true });
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    requestAnimationFrame(() => {
      scrollTo(0, 0);
      title.focus({ preventScroll: true });
      requestAnimationFrame(() => { root.style.scrollBehavior = previousScrollBehavior; });
    });
  }

  function syntheticReceipt() {
    return {
      reference: "RW-2026-PREVIEW",
      status: "submitted",
      submittedAt: "2026-08-02T09:18:00.000Z",
      completedAt: "2026-08-02T10:42:00.000Z",
      revision: 4,
      policyVersion: "draft-2026-08-02",
      studentName: "Ava Example",
      recipientName: "Morgan",
      signers: [
        { name: "Morgan Example", relationship: "Parent", status: "signed", signedAt: "2026-08-02T09:18:00.000Z" },
        { name: "Jordan Example", relationship: "Parent", status: "signed", signedAt: "2026-08-02T10:42:00.000Z" }
      ]
    };
  }

  document.getElementById("receipt-request-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    showError(document.getElementById("receipt-access-error"), "");
    if (!emailInput.checkValidity()) return showError(document.getElementById("receipt-access-error"), "Enter the email address that received this receipt link.");
    const button = event.submitter;
    button.disabled = true;
    try {
      const result = await api("/v2/receipts/request-otp", { method: "POST", idempotencyKey: operationId("receipt-otp"), body: { receiptToken, email: emailInput.value.trim() } });
      challengeId = result.challengeId;
      document.getElementById("receipt-masked-email").textContent = result.maskedEmail || "the invited mailbox";
      emailCard.hidden = true;
      otpCard.hidden = false;
      otpInput.focus();
    } catch (error) {
      showError(document.getElementById("receipt-access-error"), error.message);
    } finally {
      button.disabled = false;
    }
  });

  otpInput.addEventListener("input", () => {
    otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
    verifyButton.disabled = otpInput.value.length !== 6;
  });

  document.getElementById("receipt-verify-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    showError(document.getElementById("receipt-otp-error"), "");
    if (!/^\d{6}$/.test(otpInput.value)) return;
    verifyButton.disabled = true;
    try {
      const result = await api("/v2/receipts/verify-otp", { method: "POST", idempotencyKey: operationId("receipt-verify"), body: { receiptToken, challengeId, code: otpInput.value } });
      sessionToken = result.sessionToken;
      sessionStorage.setItem("rosewood_v2_receipt_session", sessionToken);
      sessionStorage.removeItem("rosewood_v2_receipt");
      renderReceipt(result.receipt);
    } catch (error) {
      showError(document.getElementById("receipt-otp-error"), error.message);
    } finally {
      verifyButton.disabled = otpInput.value.length !== 6;
    }
  });

  document.getElementById("receipt-change-email").addEventListener("click", () => {
    challengeId = "";
    otpInput.value = "";
    verifyButton.disabled = true;
    otpCard.hidden = true;
    emailCard.hidden = false;
    emailInput.focus();
  });
  document.getElementById("receipt-preview-entry").addEventListener("click", () => renderReceipt(syntheticReceipt()));
  document.getElementById("receipt-print").addEventListener("click", () => print());

  async function init() {
    if (preview) {
      document.getElementById("receipt-request-form").hidden = true;
      document.getElementById("receipt-preview-entry").hidden = false;
      return;
    }
    if (sessionToken) {
      try {
        renderReceipt(await api("/v2/receipts/context"));
        return;
      } catch {
        sessionStorage.removeItem("rosewood_v2_receipt_session");
        sessionToken = "";
      }
    }
    if (!receiptToken || !apiEndpoint) {
      showError(document.getElementById("receipt-access-error"), !receiptToken ? "Open the private receipt link sent by Rosewood to continue." : "The V2 secure receipt service has not been connected yet. Use synthetic preview while deployment is completed.");
      document.querySelector("#receipt-request-form button").disabled = true;
    }
  }

  init();
})();
