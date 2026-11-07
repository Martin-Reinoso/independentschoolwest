/* Render complete frozen policy text using the existing Application reader styles. */
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const headings = new Set(`Purpose|Scope|Policy|Procedure|Implementation|Review|Related Documents|Parent partnership principles|Respectful communication|Communication with staff|Child safety and student wellbeing|Respect for staff roles and professional judgement|Student collection and handover|Separated parents and family disputes|Raising concerns and complaints|Privacy and confidentiality|Use of College grounds and events|Volunteering and parent participation|Managing breaches of this policy|Student conduct principles|Respect for others|Safety and child safety|Toilets and privacy|Learning and participation|Property and the College environment|Technology and online conduct|Conduct outside the classroom|Response to student conduct concerns|Child Safety Commitment|Required Standards of Conduct|Professional Boundaries|Acceptable Conduct|Unacceptable Conduct|Physical Contact|One-to-One Interactions|Electronic Communication and Online Conduct|Transporting Students|Reporting Obligations|Breaches of This Policy|Meaning of ICT and devices|Agreement principles|Student responsibilities|Personal devices|Bluetooth-enabled devices|SIM-enabled devices|Cyber safety and online harm|Privacy and personal information|Artificial intelligence and digital tools|Parent and guardian responsibilities|Staff responsibilities|Breaches of this Agreement|Records|Behavioural Expectations and Formation|Positive Behaviour and Preventative Approach|Behaviour Management Principles|Prohibition of Corporal Punishment|Fair and Consistent Management of Behaviour|Procedural Fairness|Investigation and Response|Disciplinary Action|Roles and Responsibilities|Relationship to Other Policies and Procedures|Communication to the School Community|Identification and Initial Response|Consideration of Disciplinary Action|Decision-Making|Outcomes|Communication of Decision|Re-Entry Following Suspension|Records and Registers|Responsibility for Implementation|Staff Responsibilities|Documentation and Record Management|Monitoring and Compliance|Legal and Regulatory Context|Complaint Pathways and Contact Points|Commitment to Fair and Safe Complaint Handling|Definition of Complaint|Definition of Grievance|Complaints from Students|Complaints Involving Child Safety|Confidentiality and Privacy|No Victimisation or Retaliation|Accessible Complaint Handling|Early Resolution|Withdrawal of Complaints|Joint or Repeated Complaints|Formal Complaint Handling|Internal Review and Escalation|External Agencies and Referral|Complaints About the Principal|Complaints About the Governing Authority|Anonymous Complaints|Unreasonable Complainant Conduct|Records and Continuous Improvement`.split('|'));

  function renderText(text) {
    const lines = String(text || '').split(/\r?\n/), contents = [], output = [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index].trim();
      if (!line) continue;
      if (/^\[TABLE \d+\]$/.test(line)) {
        const rows = [];
        while (lines[index + 1]?.includes('|')) rows.push(lines[++index].split('|').map(cell => cell.trim()));
        output.push(`<div class="policy-table-wrap"><table><caption>${escape(line.slice(1,-1))}</caption><tbody>${rows.map(row => `<tr>${row.map((cell,i) => `<${i?'td':'th'}${i?'':' scope="row"'}>${escape(cell)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      } else if (/^#{1,6}\s/.test(line) || headings.has(line)) {
        const title = line.replace(/^#{1,6}\s+/, ''), id = `offer-policy-heading-${contents.length}`;
        contents.push({ id, title });
        output.push(`<h3 id="${id}" tabindex="-1">${escape(title)}</h3>`);
      } else if (/^[a-z]/.test(line) && !/[.!?]$/.test(line)) {
        const items = [line];
        while (lines[index+1] && /^[a-z]/.test(lines[index+1]) && !/[.!?]$/.test(lines[index+1])) items.push(lines[++index].trim());
        output.push(`<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`);
      } else output.push(`<p>${escape(line)}</p>`);
    }
    return { html: output.join(''), contents };
  }

  function renderPolicy(policy) {
    if (!Array.isArray(policy.sourceStructure)) return renderText(policy.text);
    const lines=String(policy.text||'').split(/\r?\n/), output=[], contents=[];
    let listDepth=-1;
    const closeList=()=>{if(listDepth>=0)output.push('</li></ul>'.repeat(listDepth+1));listDepth=-1;};
    for(const [kind,start,count,level,number] of policy.sourceStructure){
      if(kind==='figure'){
        const figure=policy.sourceFigures?.[level];
        if(!Number.isInteger(start)||start<0||start>lines.length||count!==0||!Number.isInteger(level)||!figure||!/^Files\/Policies\/offer-snapshots\/[a-z0-9-]+-[a-f0-9]{64}\.png$/.test(figure.assetPath)||!/^[a-f0-9]{64}$/.test(figure.sha256)||!figure.assetPath.endsWith('-'+figure.sha256+'.png')||![figure.width,figure.height].every(n=>Number.isInteger(n)&&n>0&&n<=4096))throw Error('Invalid frozen policy figure.');
        closeList();
        const url='../'+figure.assetPath;
        output.push(`<figure class="policy-source-figure"><a href="${escape(url)}" target="_blank" rel="noopener noreferrer"><img src="${escape(url)}" width="${figure.width}" height="${figure.height}" alt="${escape(figure.alt)}"></a><figcaption>${escape(figure.caption)} · <a href="${escape(url)}" target="_blank" rel="noopener noreferrer">Open map full size</a></figcaption></figure>`);
        continue;
      }
      if(!Number.isInteger(start)||!Number.isInteger(count)||start<0||count<1||start+count>lines.length)throw Error('Invalid frozen policy structure.');
      const text=lines.slice(start,start+count).join('\n');
      if(kind==='li'){
        if(![0,1].includes(level))throw Error('Invalid policy list level.');
        if(listDepth<0){output.push('<ul><li>');listDepth=0;}
        else if(level>listDepth){output.push('<ul><li>');listDepth=level;}
        else if(level===listDepth)output.push('</li><li>');
        else{output.push('</li></ul>'.repeat(listDepth-level),'</li><li>');listDepth=level;}
        output.push(escape(text));continue;
      }
      closeList();
      if(kind==='h'){
        if(![1,2].includes(level)||!/^\d+(?:\.\d+)?$/.test(number))throw Error('Invalid policy heading.');
        const title=`${number}. ${text}`,id=`offer-policy-heading-${contents.length}`,tag=level===1?'h3':'h4';
        contents.push({id,title});output.push(`<${tag} id="${id}" tabindex="-1">${escape(title)}</${tag}>`);
      }else if(kind==='table'){
        if(!/^\[TABLE \d+\]$/.test(lines[start])||start+count>=lines.length)throw Error('Invalid policy table.');
        const rows=lines.slice(start+1,start+1+count).map(line=>line.split('|').map(cell=>cell.trim()));
        output.push(`<div class="policy-table-wrap policy-register-wrap"><table class="policy-register"><caption>Document register</caption><tbody>${rows.map(row=>`<tr>${row.map((cell,i)=>`<${i?'td':'th'}${i?'':' scope="row"'}>${escape(cell)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      }else if(kind==='title')output.push(`<p><strong>${escape(text.replace(/^## /,''))}</strong></p>`);
      else if(kind==='p')output.push(`<p>${escape(text)}</p>`);
      else throw Error('Invalid frozen policy block.');
    }
    closeList();
    return {html:output.join(''),contents};
  }

  function create({ root, onOpen, onClose }) {
    let policies = [], active = null, returnFocus = null, returnScroll = 0;
    function render(index) {
      const policy = policies[index];
      if (!policy?.text) throw Error('This policy is unavailable. Please email enrolment@ffe.org.au before signing.');
      const body = renderPolicy(policy);
      root.innerHTML = `<article class="policy-reader" aria-labelledby="policy-reader-title"><div class="policy-reader-toolbar"><button class="policy-return" type="button" data-policy-return>← Return to offer acceptance</button><nav class="policy-tabs" aria-label="Choose a policy">${policies.map((p,i)=>`<button type="button" class="text-action" data-policy-index="${i}" ${i===index?'aria-current="page"':''}>${escape(p.title)}</button>`).join('')}</nav><label class="policy-mobile-selector"><span>Choose policy</span><select data-policy-select>${policies.map((p,i)=>`<option value="${i}" ${i===index?'selected':''}>${escape(p.title)}</option>`).join('')}</select></label></div><header class="policy-reader-heading"><p class="eyebrow">Rosewood College policy</p><h2 id="policy-reader-title" tabindex="-1">${escape(policy.title)}</h2><p>Reading this policy does not accept the offer or submit your signature.</p></header><div class="policy-reader-utilities"><details class="policy-contents"><summary>Contents</summary><ol>${body.contents.map(h=>`<li><a href="#${h.id}" data-policy-heading="${h.id}">${escape(h.title)}</a></li>`).join('')}</ol></details></div><div class="policy-document">${body.html}</div><footer class="policy-reader-footer"><button class="button button-secondary" type="button" data-policy-return>← Return to offer acceptance</button></footer></article>`;
      onOpen();
      root.querySelector('h2').focus({ preventScroll: true });
      root.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    function open(index, fromHistory=false) {
      if (!policies[index]) return;
      const wasClosed = active === null;
      if (wasClosed) { returnFocus=document.activeElement; returnScroll=window.scrollY; }
      active=index;
      if (!fromHistory) { const url=new URL(location.href);url.hash=`offer-policy/${index}`;history[wasClosed?'pushState':'replaceState']({},'',url); }
      render(index);
    }
    function restore() {
      if (active===null) return;
      active=null;root.replaceChildren();onClose();
      if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
      window.scrollTo({top:returnScroll,behavior:'instant'});
    }
    root.addEventListener('click', event => {
      const target=event.target.closest('[data-policy-return],[data-policy-index],[data-policy-heading]');
      if(!target)return;event.preventDefault();
      if(target.hasAttribute('data-policy-return'))history.back();
      else if(target.dataset.policyIndex!==undefined)open(Number(target.dataset.policyIndex));
      else { const heading=document.getElementById(target.dataset.policyHeading);heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start'}); }
    });
    root.addEventListener('change', event=>{if(event.target.matches('[data-policy-select]'))open(Number(event.target.value));});
    window.addEventListener('popstate',()=>{const match=location.hash.match(/^#offer-policy\/(\d+)$/);if(match&&policies.length)open(Number(match[1]),true);else restore();});
    return { open, setPolicies(value) { policies=value||[]; }, clear() { active=null;policies=[];returnFocus=null;root.replaceChildren();if(location.hash.startsWith('#offer-policy/')){const url=new URL(location.href);url.hash='';history.replaceState({},'',url);} } };
  }
  window.ROSEWOOD_OFFER_POLICY_READER = { create, renderText, renderPolicy };
})();
