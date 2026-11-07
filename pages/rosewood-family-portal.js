/* Shared family overview; only opaque session handoffs are kept in tab storage. */
(() => {
  'use strict';
  const key = 'rosewood-family-portal-handoff';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function cards(children) {
    return children.map(child => {
      const offer = child.offer;
      const button = (target, label, primary=false) => `<button type="button" class="button ${primary?'button-primary':'button-secondary'}" data-family-target="${target}" data-family-application="${escape(child.applicationId)}" ${target==='offer'?`data-child="${escape(offer.offerId)}"`:''}>${label}</button>`;
      const offerAction = offer ? button('offer', offer.alreadySigned ? 'View acceptance record' : offer.reviewRequired ? 'Review offer' : 'Accept provisional offer', true) : '';
      const appAction = child.applicationAction ? button('application', child.applicationAction === 'continue' ? 'Continue application' : 'View application status', !offer) : '';
      return `<article class="child-application-card child-card"><div class="child-application-icon" aria-hidden="true">${escape((child.studentName||'R')[0])}</div><div class="child-application-main"><h4>${escape(child.studentName||'New child application')}</h4><dl><div><dt>Entry</dt><dd>${escape([child.entryLevel,child.entryYear].filter(Boolean).join(' · ')||'Not yet entered')}</dd></div><div><dt>Status</dt><dd>${escape(child.statusLabel)}</dd></div>${offer?`<div><dt>Offer signatures</dt><dd>${offer.signed} of ${offer.required} recorded${offer.alreadySigned?' — your signature is recorded':''}</dd></div>`:''}</dl></div><div class="child-application-action">${offerAction}${appAction}</div></article>`;
    }).join('');
  }
  function navigate(value) {
    if (!['application','offer'].includes(value.target) || !value.sessionToken || value.expiresAt<=Date.now() || value.absoluteExpiresAt<=Date.now()) throw Error('Your secure access has expired. Open your private email link again.');
    sessionStorage.setItem(key,JSON.stringify({...value,createdAt:Date.now()}));
    location.assign(value.target==='offer'?'rosewood-enrolment-offer-v1.html?portal=1':'rosewood-enrolment-v6.html?workflow=application&portal=1');
  }
  function consume(target) {
    let value;try{value=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
    if(!value || value.target!==target)return null;
    sessionStorage.removeItem(key);
    if(typeof value.sessionToken!=='string'||value.createdAt>Date.now()||Date.now()-value.createdAt>60000||value.expiresAt<=Date.now()||value.absoluteExpiresAt<=Date.now())return null;
    return value;
  }
  window.ROSEWOOD_FAMILY_PORTAL={cards,navigate,consume};
})();
