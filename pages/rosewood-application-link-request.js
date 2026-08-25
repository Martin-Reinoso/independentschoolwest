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

  form.addEventListener("submit", event => {
    event.preventDefault();
    const errors = validate();
    if (errors.length) {
      summary.focus();
      errors[0].input.focus();
      return;
    }
    successEmail.textContent = normalizedEmail();
    requestView.hidden = true;
    successView.hidden = false;
    successView.focus();
  });

  resetPreview.addEventListener("click", () => {
    form.reset();
    summary.hidden = true;
    destination.hidden = true;
    setError(nameField, nameError, nameInput, "");
    setError(emailField, emailError, emailInput, "");
    successView.hidden = true;
    requestView.hidden = false;
    nameInput.focus();
  });
})();
