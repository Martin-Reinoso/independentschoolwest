(() => {
  "use strict";

  const form = document.querySelector("#application-link-form");
  const nameInput = document.querySelector("#requester-name");
  const emailInput = document.querySelector("#requester-email");
  const nameField = document.querySelector("#name-field");
  const emailField = document.querySelector("#email-field");
  const nameError = document.querySelector("#name-error");
  const emailError = document.querySelector("#email-error");
  const summary = document.querySelector("#error-summary");
  const summaryList = summary.querySelector("ul");
  const destination = document.querySelector("#destination");
  const destinationEmail = document.querySelector("#destination-email");
  const editEmail = document.querySelector("#edit-email");
  const requestView = document.querySelector("#request-view");
  const successView = document.querySelector("#success-view");
  const successEmail = document.querySelector("#success-email");
  const resetPreview = document.querySelector("#reset-preview");
  const websiteInput = document.querySelector("#requester-website");
  const submissionError = document.querySelector("#submission-error");
  const submitButton = form.querySelector("button[type='submit']");
  const apiBase = "https://6zyzo44sdb5zmmx53toktqrnuu0sikyd.lambda-url.ap-southeast-2.on.aws";
  const startedAt = Date.now();
  let submissionKey = "";

  function normalizedEmail() {
    return emailInput.value.trim().toLowerCase();
  }

  function emailLooksValid(email) {
    return /^\S+@\S+\.\S+$/.test(email) && email.length <= 254;
  }

  function setError(field, output, input, message) {
    field.classList.toggle("is-invalid", Boolean(message));
    output.textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function updateDestination() {
    const email = normalizedEmail();
    const visible = emailLooksValid(email);
    destination.hidden = !visible;
    destinationEmail.textContent = visible ? email : "";
  }

  function validate() {
    const errors = [];
    const name = nameInput.value.trim();
    const email = normalizedEmail();
    const nameMessage = name.length < 2 ? "Enter the parent or guardian name." : "";
    const emailMessage = emailLooksValid(email) ? "" : "Enter a valid email address.";

    setError(nameField, nameError, nameInput, nameMessage);
    setError(emailField, emailError, emailInput, emailMessage);
    if (nameMessage) errors.push({ message: nameMessage, input: nameInput });
    if (emailMessage) errors.push({ message: emailMessage, input: emailInput });

    summaryList.replaceChildren(...errors.map(error => {
      const item = document.createElement("li");
      item.textContent = error.message;
      return item;
    }));
    summary.hidden = errors.length === 0;
    return errors;
  }

  function newSubmissionKey() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  }

  function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.classList.toggle("is-loading", loading);
    submitButton.setAttribute("aria-busy", String(loading));
  }

  function showSubmissionError(message) {
    submissionError.textContent = message;
    submissionError.hidden = !message;
    if (message) submissionError.focus();
  }

  nameInput.addEventListener("input", () => {
    if (nameField.classList.contains("is-invalid")) validate();
  });
  emailInput.addEventListener("input", () => {
    updateDestination();
    if (emailField.classList.contains("is-invalid")) validate();
  });
  emailInput.addEventListener("blur", updateDestination);
  editEmail.addEventListener("click", () => {
    emailInput.focus();
    emailInput.select();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const errors = validate();
    if (errors.length) {
      summary.focus();
      errors[0].input.focus();
      return;
    }
    showSubmissionError("");
    submissionKey ||= newSubmissionKey();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/v6/application-link-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": submissionKey },
        body: JSON.stringify({ parentGuardianName: nameInput.value.trim(), email: normalizedEmail(), website: websiteInput.value, startedAt })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "The request could not be completed. Please try again.");
      successEmail.textContent = normalizedEmail();
      requestView.hidden = true;
      successView.hidden = false;
      successView.focus();
    } catch (error) {
      showSubmissionError(error.message === "Failed to fetch" ? "We could not connect to the enrolment service. Check your connection and try again." : error.message);
    } finally {
      setLoading(false);
    }
  });

  resetPreview.addEventListener("click", () => {
    form.reset();
    summary.hidden = true;
    showSubmissionError("");
    destination.hidden = true;
    submissionKey = "";
    setError(nameField, nameError, nameInput, "");
    setError(emailField, emailError, emailInput, "");
    successView.hidden = true;
    requestView.hidden = false;
    nameInput.focus();
  });
})();
