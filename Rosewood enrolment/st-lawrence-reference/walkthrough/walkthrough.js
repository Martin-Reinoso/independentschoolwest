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

document.querySelectorAll('[data-guardian-confirmation]').forEach((confirmation) => {
  const checkbox = confirmation.querySelector('input[type="checkbox"]');
  const saveState = document.querySelector('.save-state');
  const saveLabel = saveState?.querySelector('[data-save-label]');
  let saveTimer;
  const update = () => confirmation.classList.toggle('is-confirmed', checkbox.checked);
  checkbox.addEventListener('change', () => {
    update();
    if (!saveState || !saveLabel) return;
    window.clearTimeout(saveTimer);
    saveState.classList.add('is-unsaved');
    saveLabel.textContent = 'Unsaved Changes';
    saveTimer = window.setTimeout(() => {
      saveState.classList.remove('is-unsaved');
      saveLabel.textContent = 'Saved';
    }, 1200);
  });
  update();
});

document.querySelectorAll('[data-static-action="Reference only. An additional guardian panel would be added."]').forEach((button) => {
  const guardianPanel = button.closest('[data-step-panel="guardian"]');
  const actions = button.closest('.guardian-actions');
  const saveState = document.querySelector('.save-state');
  const saveLabel = saveState?.querySelector('[data-save-label]');
  let saveTimer;
  const ordinal = (number) => {
    const remainder = number % 100;
    if (remainder >= 11 && remainder <= 13) return `${number}th`;
    return `${number}${({ 1: 'st', 2: 'nd', 3: 'rd' })[number % 10] || 'th'}`;
  };

  button.addEventListener('click', () => {
    if (!guardianPanel || !actions) return;
    const contactNumber = guardianPanel.querySelectorAll('.guardian-card').length + 1;
    const contact = document.createElement('details');
    contact.className = 'guardian-card agreement-contact-card new-contact';
    contact.open = true;
    contact.innerHTML = `
      <summary><span>${ordinal(contactNumber)} Contact Details</span></summary>
      <fieldset><legend>Primary Information</legend>
        <div class="app-choice new-contact-share"><span>Share these details? <b>*</b><small>Show the contact details with other people associated with the student on this form.</small></span><label><input type="radio" name="added-share-${contactNumber}" data-required> Yes, share them</label><label><input type="radio" name="added-share-${contactNumber}"> No, keep them private</label></div>
        <div class="app-grid three"><label>First Name <span>*</span><input data-required></label><label>Last Name <span>*</span><input data-required></label><label>Email <span>*</span><input type="email" data-required></label><label>Mobile Phone <span>*</span><input type="tel" data-required></label><label>Relationship to Student <span>*</span><select data-required><option value="">Relationship to Student</option><option>Father</option><option>Mother</option><option>Guardian</option></select></label><label>Contact Type <span>*</span><select data-required><option value="">Contact Type</option><option>Primary</option><option>Secondary</option></select></label></div>
        <p class="communication-notice">By providing your email address and/or mobile phone number, you agree to receive messages of both promotional and informational nature. Message frequency varies. Msg &amp; data rates may apply. You can opt out of promotional communications at any time by using the unsubscribe link in our emails and/or by replying STOP to our text messages.</p>
        <div class="contact-permission"><strong>Can the school contact this person about the student on this form? <span>*</span></strong><p>If No, the school will not communicate with this person, nor send any email requesting a signature. Not sure? Please contact our office before submitting.</p><div class="app-choice"><label><input type="radio" name="added-permission-${contactNumber}" data-required checked> Yes</label><label><input type="radio" name="added-permission-${contactNumber}"> No, do not contact them</label></div></div>
      </fieldset>
      <button type="button" class="remove-contact">Remove</button>`;
    actions.before(contact);
    contact.querySelector('.remove-contact').addEventListener('click', () => {
      const feedback = guardianPanel.closest('form')?.querySelector('.static-feedback');
      if (feedback) {
        feedback.textContent = 'Reference only. Removal behavior has not been tested.';
        feedback.hidden = false;
      }
    });
    contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!saveState || !saveLabel) return;
    window.clearTimeout(saveTimer);
    saveState.classList.add('is-unsaved');
    saveLabel.textContent = 'Unsaved Changes';
    saveTimer = window.setTimeout(() => {
      saveState.classList.remove('is-unsaved');
      saveLabel.textContent = 'Saved';
    }, 1200);
  });
});

document.querySelectorAll('[data-static-action]').forEach((button) => {
  if (button.dataset.staticAction === 'Reference only. An additional guardian panel would be added.') return;
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
