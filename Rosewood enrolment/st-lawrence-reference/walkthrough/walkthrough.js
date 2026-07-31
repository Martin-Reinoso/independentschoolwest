document.querySelectorAll('[data-static-form]').forEach((form) => {
  const feedback = form.querySelector('.static-feedback');
  const submit = form.querySelector('[type="submit"]');
  const email = form.querySelector('input[type="email"]');
  const code = form.querySelector('[name="verification-code"]');

  if (email && submit?.classList.contains('gateway-next')) {
    const updateButton = () => {
      submit.disabled = !email.validity.valid || email.value.length === 0;
    };
    email.addEventListener('input', updateButton);
    updateButton();
  }

  if (code && submit?.classList.contains('otp-verify')) {
    const updateButton = () => {
      submit.disabled = code.value.trim().length === 0;
    };
    code.addEventListener('input', updateButton);
    updateButton();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (form.dataset.next) {
      window.location.href = form.dataset.next;
      return;
    }
    if (feedback) {
      feedback.textContent = form.dataset.message;
      feedback.hidden = false;
    }
  });
});

document.querySelectorAll('[data-static-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const form = button.closest('form');
    const feedback = form?.querySelector('.static-feedback');
    if (feedback) {
      feedback.textContent = button.dataset.staticAction;
      feedback.hidden = false;
    }
  });
});

document.querySelectorAll('[data-conditional-group]').forEach((group) => {
  const form = group.closest('form');
  const field = form?.querySelector('[data-conditional-field]');
  const select = field?.querySelector('select');
  group.addEventListener('change', (event) => {
    const show = event.target.value === 'yes';
    if (field) field.hidden = !show;
    if (select) select.required = show;
  });
});
