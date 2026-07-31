document.querySelectorAll('[data-static-form]').forEach((form) => {
  const feedback = form.querySelector('.static-feedback');
  const submit = form.querySelector('[type="submit"]');
  const email = form.querySelector('input[type="email"]');
  const code = form.querySelector('[name="verification-code"]');
  const studentNames = form.querySelectorAll('[name^="student-"]');

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

  if (studentNames.length && submit) {
    const updateButton = () => {
      submit.disabled = Array.from(studentNames).some((input) => input.value.trim().length === 0);
    };
    studentNames.forEach((input) => input.addEventListener('input', updateButton));
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

document.querySelectorAll('[data-print]').forEach((button) => {
  button.addEventListener('click', () => window.print());
});

document.querySelectorAll('[data-loading-link]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const loader = document.querySelector('[data-route-loader]');
    if (loader) loader.hidden = false;
    window.setTimeout(() => {
      window.location.href = link.href;
    }, 650);
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

document.querySelectorAll('[data-editable-reference]').forEach((form) => {
  const steps = Array.from(document.querySelectorAll('[data-step-target]'));
  const panels = Array.from(form.querySelectorAll('[data-step-panel]'));
  const back = form.querySelector('[data-step-back]');
  const next = form.querySelector('[data-step-next]');
  const feedback = form.querySelector('.static-feedback');
  let activeIndex = 0;

  const isFilled = (field) => {
    if (field.type === 'checkbox') return field.checked;
    if (field.type === 'radio') return Boolean(form.querySelector(`input[name="${field.name}"]:checked`));
    return field.value.trim().length > 0;
  };

  const panelIncomplete = (panel) => {
    const visibleRequired = Array.from(panel.querySelectorAll('[data-required]')).filter((field) => !field.closest('[hidden]'));
    const requiredUploads = panel.querySelectorAll('[data-required-upload]:not(.has-reference-file)');
    const emptyMinimumGroup = Array.from(panel.querySelectorAll('[data-min-one]')).some((group) => !group.closest('[hidden]') && !group.querySelector('input:checked'));
    return visibleRequired.some((field) => !isFilled(field)) || requiredUploads.length > 0 || emptyMinimumGroup;
  };

  const markStep = (index) => {
    const incomplete = panelIncomplete(panels[index]);
    steps[index].classList.toggle('has-error', incomplete);
    steps[index].querySelector('small').textContent = incomplete ? 'Missing required fields.' : '';
  };

  const showStep = (index, markCurrent = true) => {
    if (markCurrent && index !== activeIndex) markStep(activeIndex);
    activeIndex = index;
    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === index;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    steps.forEach((step, stepIndex) => {
      const active = stepIndex === index;
      step.classList.toggle('is-current', active);
      if (active) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
    });
    back.disabled = index === 0;
    next.hidden = index === panels.length - 1;
    if (feedback) feedback.hidden = true;
    window.scrollTo({ top: form.offsetTop - 165, behavior: 'smooth' });
  };

  steps.forEach((step, index) => step.addEventListener('click', () => showStep(index)));
  back.addEventListener('click', () => showStep(Math.max(0, activeIndex - 1)));
  next.addEventListener('click', () => showStep(Math.min(panels.length - 1, activeIndex + 1)));
  form.addEventListener('submit', (event) => event.preventDefault());

  form.querySelectorAll('[data-toggle-group]').forEach((group) => {
    group.addEventListener('change', (event) => {
      const expected = group.dataset.showValue || 'yes';
      const target = form.querySelector(`[data-conditional="${group.dataset.toggleTarget}"]`);
      if (target) target.hidden = event.target.value !== expected;
    });
  });

  form.querySelectorAll('[data-other-toggle]').forEach((control) => {
    control.addEventListener('change', () => {
      const target = form.querySelector(`[data-conditional="${control.dataset.otherToggle}"]`);
      if (target) target.hidden = !control.checked;
    });
  });

  form.querySelectorAll('[data-min-one]').forEach((group) => {
    const message = group.nextElementSibling?.classList.contains('minimum-message') ? group.nextElementSibling : null;
    const update = () => message?.classList.toggle('is-satisfied', Boolean(group.querySelector('input:checked')));
    group.addEventListener('change', update);
    update();
  });

  const additionalGuardian = form.querySelector('[data-additional-guardian]');
  const signatureReason = form.querySelector('[data-single-signature-reason]');
  const signatureFlow = form.querySelector('[data-signature-flow-note]');
  const updateGuardianSignature = (shown) => {
    additionalGuardian.hidden = !shown;
    signatureReason.hidden = shown;
    signatureFlow.hidden = !shown;
  };
  form.querySelector('[data-add-guardian]')?.addEventListener('click', () => updateGuardianSignature(true));
  form.querySelector('[data-remove-guardian]')?.addEventListener('click', () => updateGuardianSignature(false));

  form.querySelectorAll('[data-simulate-upload]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('article');
      card.classList.add('has-reference-file');
      card.querySelector('small').textContent = 'Synthetic reference file selected (not read or uploaded)';
      if (feedback) {
        feedback.textContent = 'Reference state only. No file picker opened and no data was read or uploaded.';
        feedback.hidden = false;
      }
    });
  });

  form.querySelectorAll('.editable-documents button:not([data-simulate-upload])').forEach((button) => {
    button.addEventListener('click', () => {
      if (feedback) {
        feedback.textContent = 'Reference only. No file picker or upload is connected.';
        feedback.hidden = false;
      }
    });
  });

  const canvas = form.querySelector('[data-signature-pad]');
  if (canvas) {
    const context = canvas.getContext('2d');
    context.strokeStyle = '#4f5963';
    context.lineWidth = 2;
    context.lineCap = 'round';
    let drawing = false;
    const point = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
    };
    canvas.addEventListener('pointerdown', (event) => {
      drawing = true;
      const p = point(event);
      context.beginPath();
      context.moveTo(p.x, p.y);
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!drawing) return;
      const p = point(event);
      context.lineTo(p.x, p.y);
      context.stroke();
    });
    canvas.addEventListener('pointerup', () => { drawing = false; });
    form.querySelector('[data-clear-signature]')?.addEventListener('click', () => context.clearRect(0, 0, canvas.width, canvas.height));
  }

  if (window.location.hash === '#signature') showStep(4, false);
});
