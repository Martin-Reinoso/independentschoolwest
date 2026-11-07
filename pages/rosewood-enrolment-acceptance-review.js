/* Synthetic, memory-only prototype. No network, storage, OTP or submission. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const steps = ['student', 'guardian', 'conditions', 'signature'];
  const labels = {children:'Your children',student:'Student details',guardian:'Parent/guardian details',conditions:'Conditions of enrolment',signature:'Acceptance and signature',complete:'Preview complete'};
  const guardian = (first, middle, last, mobile, email, relationship) => ({first,middle,last,mobile,email,relationship,contactPermission:'yes'});
  const samples = ['Avery','Jordan'].map((first,index) => ({
    first,middle:'',last:'Example',preferred:first,level:index?'Year 2':'Foundation',year:'2027',acceptPlace:false,confirmed:false,agreed:false,previewed:false,
    guardians:[guardian('Alex','','Example','0400 000 000','alex@example.test','Parent'),guardian('Taylor','','Example','0400 000 001','taylor@example.test','Parent')]
  }));
  let active = 0, started = false, inked = false, drawing = false;
  const fullName = person => [person.first,person.middle,person.last].filter(Boolean).join(' ');
  const child = () => samples[active];
  const studentForm = $('student-form'), guardianForm = $('guardian-form');
  const canvas = $('preview-signature'), ink = canvas.getContext('2d');
  const contract = window.ROSEWOOD_ACCEPTANCE_TERMS_REVIEW;
  $('provisional-offer-title').textContent = contract.introduction.title;
  $('provisional-offer-copy').textContent = contract.introduction.text;
  $('fine-print').innerHTML = contract.sections.map(section => `<section><h4>${esc(section.id)}. ${esc(section.title)}</h4>${section.paragraphs.map(text=>`<p>${esc(text)}</p>`).join('')}</section>`).join('');
  $('review-policies').innerHTML = contract.policies.map(policy=>`<details><summary>${esc(policy.title)}</summary><div class="policy-copy">${esc(policy.text)}</div></details>`).join('');

  function resetSignature() {
    ink.clearRect(0,0,canvas.width,canvas.height); inked=false;
    $('signature-feedback').textContent='No signature entered.';
    $('signature-form').elements.declared.checked=false;
  }
  function capture() {
    if(!started)return;
    const record=child();
    for(const key of ['first','middle','last','preferred'])record[key]=studentForm.elements[key].value.trim();
    record.acceptPlace=studentForm.elements.acceptPlace.checked;
    record.confirmed=guardianForm.elements.confirmed.checked;
    record.agreed=$('conditions-form').elements.agreed.checked;
    guardianForm.querySelectorAll('[data-guardian-field]').forEach(input=>{
      record.guardians[Number(input.dataset.guardian)][input.dataset.guardianField]=input.value.trim();
    });
  }
  const signingGuidance = permission => permission==='yes' ? 'This person will be contacted to sign after submission of this form.' : permission==='no' ? 'Contact is restricted. Please contact the College to arrange this guardian’s signature.' : 'Confirm contact permission below to arrange this guardian’s signing request.';
  function renderGuardians(openIndex = null) {
    const openPanels = new Set([...$('guardian-fields').querySelectorAll('details[open]')].map(panel=>Number(panel.dataset.guardianPanel)));
    $('guardian-fields').innerHTML=child().guardians.map((person,index)=>{
      const field=(key,label,required=true,type='text')=>`<label class="field"><span>${label}${required?' *':''}</span><input name="guardian-${index}-${key}" type="${type}" data-guardian="${index}" data-guardian-field="${key}" value="${esc(person[key])}" ${required?'required':''} maxlength="${type==='email'?254:100}" autocomplete="off"></label>`;
      const select=(key,label,choices)=>`<label class="field"><span>${label} *</span><select name="guardian-${index}-${key}" data-guardian="${index}" data-guardian-field="${key}" required>${choices.map(([value,text])=>`<option value="${value}" ${person[key]===value?'selected':''}>${text}</option>`).join('')}</select></label>`;
      return `<details class="guardian-details" data-guardian-panel="${index}" ${index===0||index===openIndex||openPanels.has(index)?'open':''}><summary>${index===0?'Your details':index===1?'Parent/Guardian: Second Guardian':'Parent/Guardian: Additional Guardian'} · ${esc(fullName(person)||'New guardian')}<small>${index===0?'You will sign first.':signingGuidance(person.contactPermission)}</small></summary><div class="field-grid two">${field('first','Given name(s)')}${field('middle','Middle name(s)',false)}${field('last','Surname')}${field('mobile','Mobile phone',true,'tel')}${select('relationship','Relationship to student',[['','Select relationship'],['Parent','Parent'],['Mother','Mother'],['Father','Father'],['Legal guardian','Legal guardian'],['Other','Other — discuss with the College']])}${person.added?field('email','Signing email',true,'email'):''}</div>${person.added?'<p class="group-note">This guardian will verify their own email before signing. No request is sent in this preview.</p>':`<div class="email-display"><strong>Signing email</strong><span>${esc(person.email)}</span><p class="group-note">From your application. Contact the College if this email needs correcting.</p></div>`}${index?`${select('contactPermission','May the College contact this guardian?',[['','Select an option'],['yes','Yes'],['no','No — do not contact']])}<p class="group-note">Choosing No prevents messages and signing requests to this guardian. Contact the College to confirm the signing arrangement; this does not remove their responsibility to sign.</p><button class="text-action" type="button" data-remove-guardian="${index}">Remove this guardian</button>`:''}</details>`;
    }).join('');
  }
  function changedGuardianList(message) {
    child().confirmed=false;child().agreed=false;child().previewed=false;
    guardianForm.elements.confirmed.checked=false;$('conditions-form').elements.agreed.checked=false;
    resetSignature();$('guardian-change-status').textContent=message;
    $('preview-state').textContent='Changed in this preview';
  }
  $('add-guardian').addEventListener('click',()=>{
    capture();child().guardians.push({...guardian('','','','','',''),added:true,contactPermission:''});
    changedGuardianList('A blank guardian has been added. Complete their details, then confirm the guardian list again.');
    renderGuardians(child().guardians.length-1);
    guardianForm.querySelector(`[name="guardian-${child().guardians.length-1}-first"]`).focus();
  });
  function renderChildren() {
    $('child-list').innerHTML=samples.map((record,index)=>`<article class="child-application-card"><div class="child-application-icon" aria-hidden="true">${esc(record.first[0]||'R')}</div><div class="child-application-main"><h4>${esc(fullName(record))}</h4><dl><div><dt>Offered place</dt><dd>${esc(record.level)} · ${record.year}</dd></div><div><dt>Acceptance</dt><dd>${record.previewed?'Preview completed':'Ready to review'}</dd></div></dl></div><div class="child-application-action"><button class="button button-primary" type="button" data-child="${index}">${record.previewed?'Review again':'Start acceptance'}</button></div></article>`).join('');
  }
  function show(step) {
    capture();
    document.querySelectorAll('#family-form > section').forEach(section=>section.hidden=section.id!==step);
    $('step-title').textContent=labels[step];
    $('review-progress').hidden=!steps.includes(step);
    $('review-progress').dataset.stage=step;
    $('progress-label').textContent=`Step ${steps.indexOf(step)+1} of 4`;
    $('child-caption').textContent=fullName(child());
    document.querySelectorAll('[data-step]').forEach(button=>{
      if(button.dataset.step===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    const record=child(),place=`${record.level} · ${record.year} entry`;
    $('student-place').textContent=place;
    $('conditions-place').textContent=`${fullName(record)} — ${place}`;
    $('agreement-for').textContent=`Enrolment agreement for ${fullName(record)}.`;
    if(step==='signature'){
      $('signature-summary').innerHTML=`<dt>Student</dt><dd>${esc(fullName(record))}</dd><dt>Offered place</dt><dd>${esc(place)}</dd><dt>Signing parent/guardian</dt><dd>${esc(fullName(record.guardians[0]))}</dd>`;
      $('signature-name').value=fullName(record.guardians[0]);
    }
    if(step==='children')renderChildren();
    const heading=$(step).querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
    (steps.includes(step)?$('review-progress'):$('family-form')).scrollIntoView({behavior:'instant',block:'start'});
  }
  $('child-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-child]');if(!button)return;
    capture();active=Number(button.dataset.child);started=false;
    for(const key of ['first','middle','last','preferred'])studentForm.elements[key].value=child()[key];
    studentForm.elements.acceptPlace.checked=child().acceptPlace;
    guardianForm.elements.confirmed.checked=child().confirmed;
    $('conditions-form').elements.agreed.checked=child().agreed;
    $('guardian-change-status').textContent='';$('guardian-fields').replaceChildren();renderGuardians();resetSignature();started=true;show('student');
  });
  document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.step)));
  document.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.back)));
  document.querySelectorAll('[data-children]').forEach(button=>button.addEventListener('click',()=>show('children')));
  guardianForm.addEventListener('invalid',event=>{const panel=event.target.closest('details');if(panel)panel.open=true;},true);
  for(const [id,next] of [['student-form','guardian'],['guardian-form','conditions'],['conditions-form','signature']]){
    $(id).addEventListener('submit',event=>{event.preventDefault();show(next);});
  }
  for(const form of [studentForm,guardianForm])form.addEventListener('input',event=>{
    if(event.target.type!=='checkbox'){
      child().previewed=false;resetSignature();$('conditions-form').elements.agreed.checked=false;
      if(form===guardianForm)guardianForm.elements.confirmed.checked=false;
      $('preview-state').textContent='Changed in this preview';
    }
  });
  $('guardian-fields').addEventListener('change',event=>{
    if(event.target.dataset.guardianField==='contactPermission'){
      capture();event.target.closest('details').querySelector('summary small').textContent=signingGuidance(event.target.value);
    }
  });
  $('guardian-fields').addEventListener('click',event=>{
    const remove=event.target.closest('[data-remove-guardian]');
    if(remove){capture();const index=Number(remove.dataset.removeGuardian);child().guardians.splice(index,1);changedGuardianList('Guardian removed from this preview. Check and confirm the remaining guardian list.');renderGuardians();$('add-guardian').focus();return;}
  });
  $('enlarge-terms').addEventListener('click',()=>{
    const large=$('fine-print').classList.toggle('enlarged');$('enlarge-terms').textContent=large?'Standard text':'Enlarge text';$('enlarge-terms').setAttribute('aria-pressed',String(large));
  });
  $('print-terms').addEventListener('click',()=>{
    const readers=[...$('review-policies').querySelectorAll('details')],previous=readers.map(detail=>detail.open);
    readers.forEach(detail=>detail.open=true);
    window.addEventListener('afterprint',()=>readers.forEach((detail,index)=>detail.open=previous[index]),{once:true});window.print();
  });
  function point(event){const bounds=canvas.getBoundingClientRect();return [(event.clientX-bounds.left)*canvas.width/bounds.width,(event.clientY-bounds.top)*canvas.height/bounds.height];}
  canvas.addEventListener('pointerdown',event=>{drawing=true;canvas.setPointerCapture(event.pointerId);ink.beginPath();ink.moveTo(...point(event));});
  canvas.addEventListener('pointermove',event=>{if(!drawing)return;ink.strokeStyle='#182b45';ink.lineWidth=3;ink.lineCap='round';ink.lineTo(...point(event));ink.stroke();inked=true;$('signature-feedback').textContent='Signature entered for preview only.';});
  canvas.addEventListener('pointerup',()=>drawing=false);canvas.addEventListener('pointercancel',()=>drawing=false);
  $('use-typed').addEventListener('click',()=>{
    if(!$('signature-name').reportValidity())return;
    ink.clearRect(0,0,canvas.width,canvas.height);ink.font='italic 54px Georgia';ink.fillStyle='#182b45';ink.fillText($('signature-name').value.trim(),28,145,840);inked=true;$('signature-feedback').textContent='Typed signature entered for preview only.';
  });
  $('signature-name').addEventListener('input',()=>{ink.clearRect(0,0,canvas.width,canvas.height);inked=false;$('signature-feedback').textContent='Use your updated name or draw again.';});
  $('clear-signature').addEventListener('click',resetSignature);
  $('signature-form').addEventListener('submit',event=>{
    event.preventDefault();capture();
    for(const [step,form] of [['student',studentForm],['guardian',guardianForm],['conditions',$('conditions-form')]]){
      if(!form.checkValidity()){
        show(step);form.querySelectorAll('details').forEach(detail=>{if(detail.querySelector(':invalid'))detail.open=true;});form.reportValidity();return;
      }
    }
    if(!inked){$('signature-feedback').textContent='Draw a signature or select “Use typed signature” to continue.';return;}
    child().previewed=true;$('complete-copy').textContent=`You have previewed your signature for ${fullName(child())}, signing as ${$('signature-name').value.trim()}.`;show('complete');resetSignature();
  });
  renderChildren();
  const requestedStep = new URLSearchParams(location.search).get('step');
  if(steps.includes(requestedStep)){
    $('child-list').querySelector('[data-child="0"]').click();
    show(requestedStep);
  }
})();
