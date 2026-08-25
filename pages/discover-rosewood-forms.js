(() => {
  "use strict";

  const apiBase = "https://6zyzo44sdb5zmmx53toktqrnuu0sikyd.lambda-url.ap-southeast-2.on.aws";
  const emailPattern = /^\S+@\S+\.\S+$/;

  function requestKey(prefix) {
    const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}:${value}`;
  }

  async function post(path, payload, idempotencyKey) {
    let response;
    try {
      response = await fetch(`${apiBase}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new Error("The service could not be reached. Check your connection and try again.");
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "The service could not complete this request. Please try again.");
    return result;
  }

  function setFieldError(field, output, input, message) {
    field.classList.toggle("is-invalid", Boolean(message));
    output.textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function showSummary(summary, list, errors) {
    list.replaceChildren(...errors.map(({ message }) => {
      const item = document.createElement("li");
      item.textContent = message;
      return item;
    }));
    summary.hidden = errors.length === 0;
  }

  function applicationLinkForm() {
    const form = document.querySelector("#application-link-form");
    if (!form) return;
    const nameInput = form.querySelector("#requester-name");
    const emailInput = form.querySelector("#requester-email");
    const websiteInput = form.querySelector("#requester-website");
    const nameField = form.querySelector("#name-field");
    const emailField = form.querySelector("#email-field");
    const nameError = form.querySelector("#name-error");
    const emailError = form.querySelector("#email-error");
    const summary = document.querySelector("#error-summary");
    const summaryList = summary.querySelector("ul");
    const destination = form.querySelector("#destination");
    const destinationEmail = form.querySelector("#destination-email");
    const editEmail = form.querySelector("#edit-email");
    const submitError = form.querySelector("#submission-error");
    const button = form.querySelector('button[type="submit"]');
    const requestView = document.querySelector("#request-view");
    const successView = document.querySelector("#success-view");
    const successEmail = document.querySelector("#success-email");
    const reset = document.querySelector("#reset-preview");
    let startedAt = Date.now();
    let idempotencyKey = requestKey("application-link");

    const normalizedEmail = () => emailInput.value.trim().toLowerCase();
    const validEmail = email => email.length <= 254 && emailPattern.test(email);

    function updateDestination() {
      const email = normalizedEmail();
      const visible = validEmail(email);
      destination.hidden = !visible;
      destinationEmail.textContent = visible ? email : "";
    }

    function validate() {
      const errors = [];
      const nameMessage = nameInput.value.trim().length < 2 ? "Enter the parent or guardian name." : "";
      const emailMessage = validEmail(normalizedEmail()) ? "" : "Enter a valid email address.";
      setFieldError(nameField, nameError, nameInput, nameMessage);
      setFieldError(emailField, emailError, emailInput, emailMessage);
      if (nameMessage) errors.push({ message: nameMessage, input: nameInput });
      if (emailMessage) errors.push({ message: emailMessage, input: emailInput });
      showSummary(summary, summaryList, errors);
      return errors;
    }

    nameInput.addEventListener("input", () => { if (nameField.classList.contains("is-invalid")) validate(); });
    emailInput.addEventListener("input", () => { updateDestination(); if (emailField.classList.contains("is-invalid")) validate(); });
    emailInput.addEventListener("blur", updateDestination);
    editEmail.addEventListener("click", () => { emailInput.focus(); emailInput.select(); });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const errors = validate();
      if (errors.length) {
        summary.focus();
        errors[0].input.focus();
        return;
      }
      submitError.hidden = true;
      button.disabled = true;
      button.classList.add("is-loading");
      try {
        await post("/v6/application-link-requests", {
          parentGuardianName: nameInput.value.trim(),
          email: normalizedEmail(),
          website: websiteInput.value,
          startedAt
        }, idempotencyKey);
        successEmail.textContent = normalizedEmail();
        requestView.hidden = true;
        successView.hidden = false;
        successView.focus();
      } catch (error) {
        submitError.textContent = error.message;
        submitError.hidden = false;
        submitError.focus();
      } finally {
        button.disabled = false;
        button.classList.remove("is-loading");
      }
    });

    reset.addEventListener("click", () => {
      form.reset();
      startedAt = Date.now();
      idempotencyKey = requestKey("application-link");
      summary.hidden = true;
      submitError.hidden = true;
      destination.hidden = true;
      setFieldError(nameField, nameError, nameInput, "");
      setFieldError(emailField, emailError, emailInput, "");
      successView.hidden = true;
      requestView.hidden = false;
      nameInput.focus();
    });
  }

  function communityEnquiryForm() {
    const form = document.querySelector("#community-contact-form");
    if (!form) return;
    const nameInput = form.querySelector("#community-contact-name");
    const emailInput = form.querySelector("#community-contact-email");
    const interestInput = form.querySelector("#community-contact-interest");
    const messageInput = form.querySelector("#community-contact-message");
    const websiteInput = form.querySelector("#community-contact-website");
    const nameField = form.querySelector("#community-name-field");
    const emailField = form.querySelector("#community-email-field");
    const interestField = form.querySelector("#community-interest-field");
    const nameError = form.querySelector("#community-name-error");
    const emailError = form.querySelector("#community-email-error");
    const interestError = form.querySelector("#community-interest-error");
    const summary = document.querySelector("#community-contact-errors");
    const summaryList = summary.querySelector("ul");
    const submitError = form.querySelector("#community-contact-submit-error");
    const button = form.querySelector('button[type="submit"]');
    const success = document.querySelector("#community-contact-success");
    const reset = document.querySelector("#community-contact-reset");
    let startedAt = Date.now();
    let idempotencyKey = requestKey("community-enquiry");

    function validate() {
      const errors = [];
      const email = emailInput.value.trim().toLowerCase();
      const nameMessage = nameInput.value.trim().length < 2 ? "Enter your name." : "";
      const emailMessage = email.length <= 254 && emailPattern.test(email) ? "" : "Enter a valid email address.";
      const interestMessage = interestInput.value ? "" : "Choose why you are getting in touch.";
      setFieldError(nameField, nameError, nameInput, nameMessage);
      setFieldError(emailField, emailError, emailInput, emailMessage);
      setFieldError(interestField, interestError, interestInput, interestMessage);
      if (nameMessage) errors.push({ message: nameMessage, input: nameInput });
      if (emailMessage) errors.push({ message: emailMessage, input: emailInput });
      if (interestMessage) errors.push({ message: interestMessage, input: interestInput });
      showSummary(summary, summaryList, errors);
      return errors;
    }

    [nameInput, emailInput, interestInput].forEach(input => input.addEventListener("input", () => {
      if (input.closest(".community-form-field").classList.contains("is-invalid")) validate();
    }));

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const errors = validate();
      if (errors.length) {
        summary.focus();
        errors[0].input.focus();
        return;
      }
      submitError.hidden = true;
      button.disabled = true;
      button.classList.add("is-loading");
      try {
        await post("/v6/community-enquiries", {
          name: nameInput.value.trim(),
          email: emailInput.value.trim().toLowerCase(),
          interest: interestInput.value,
          message: messageInput.value.trim(),
          website: websiteInput.value,
          startedAt
        }, idempotencyKey);
        form.hidden = true;
        summary.hidden = true;
        success.hidden = false;
        success.focus();
      } catch (error) {
        submitError.textContent = `${error.message} You can also email info@ffe.org.au.`;
        submitError.hidden = false;
        submitError.focus();
      } finally {
        button.disabled = false;
        button.classList.remove("is-loading");
      }
    });

    reset.addEventListener("click", () => {
      form.reset();
      startedAt = Date.now();
      idempotencyKey = requestKey("community-enquiry");
      summary.hidden = true;
      submitError.hidden = true;
      setFieldError(nameField, nameError, nameInput, "");
      setFieldError(emailField, emailError, emailInput, "");
      setFieldError(interestField, interestError, interestInput, "");
      success.hidden = true;
      form.hidden = false;
      nameInput.focus();
    });
  }

  applicationLinkForm();
  communityEnquiryForm();
})();
