(() => {
  "use strict";
  const config = window.ROSEWOOD_V2_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const preview = params.get("preview") === "1";
  const apiEndpoint = String(config.apiEndpoint || "").replace(/\/+$/, "");
  const incomingTaskToken = params.get("task") || "";
  const storedTaskToken = sessionStorage.getItem("rosewood_v2_task") || "";
  const taskToken = incomingTaskToken || storedTaskToken;
  let sessionToken = sessionStorage.getItem("rosewood_v2_sign_session") || "";
  let challengeId = "";
  let context = null;
  let stage = 0;
  let signed = false;
  let drawing = false;
  let lastPoint = null;
  const form = document.getElementById("sign-form");
  const errors = document.getElementById("sign-errors");
  const syntheticReviewGroups = [
    { title: "Student", items: [
      { label: "Legal name", value: "Ava Grace Example" },
      { label: "Preferred name", value: "Ava" },
      { label: "Date of birth", value: "4 March 2021" },
      { label: "Proposed entry", value: "Prep in 2027" },
      { label: "Current setting", value: "Example Early Learning Centre" },
      { label: "Residential address", value: "1 Example Lane, Melton VIC 3337" },
      { label: "Residency", value: "Australian citizen" },
      { label: "Home language", value: "English" },
      { label: "Faith and parish", value: "Catholic - St Catherine of Siena Parish" }
    ] },
    { title: "Family and authority", items: [
      { label: "Guardian 1", value: "Morgan Example - Mother - primary contact - required signer" },
      { label: "Guardian 1 contact", value: "guardian@example.test - 0400 000 000" },
      { label: "Guardian 1 authority", value: "Lives with student - legal responsibility" },
      { label: "Guardian 2", value: "Jordan Example - Father - secondary contact - required signer" },
      { label: "Guardian 2 contact", value: "second.guardian@example.test - 0411 111 111" },
      { label: "Guardian 2 authority", value: "Lives with student - legal responsibility - contact permitted" },
      { label: "Care arrangement", value: "Shared care across households - regular week-about schedule" },
      { label: "Other household address", value: "2 Sample Court, Melton South VIC 3338" },
      { label: "Court or parenting orders", value: "No" },
      { label: "Emergency contact", value: "Taylor Example - Aunt - 0422 222 222" },
      { label: "All guardians included", value: "Yes" }
    ] },
    { title: "Learning, wellbeing and health", items: [
      { label: "Strengths", value: "Curious, imaginative and enjoys books, drawing and collaborative play." },
      { label: "Current support", value: "Communication and language; social and emotional" },
      { label: "Support details", value: "Benefits from advance notice of transitions and a calm introduction to unfamiliar groups." },
      { label: "Medical or allergy information", value: "Synthetic example: mild asthma triggered by cold weather." },
      { label: "Medication and instructions", value: "Synthetic example: reliever inhaler used according to the current medical plan." },
      { label: "Health professional contact permission", value: "Yes" },
      { label: "Anaphylaxis", value: "No" },
      { label: "Immunisation", value: "Up to date and available" },
      { label: "Doctor or practice", value: "Example Family Medical Centre - 03 9000 0000" }
    ] },
    { title: "Permissions and responsibilities", items: [
      { label: "Previous setting permission", value: "Yes" },
      { label: "Media permissions", value: "Internal learning and school publications; public school website" },
      { label: "Student name permission", value: "First name only" },
      { label: "Community updates", value: "Not selected" },
      { label: "Fee responsibility", value: "Joint" },
      { label: "Decision factors", value: "Faith and character; academic approach; parent partnership" }
    ] },
    { title: "Documents", items: [
      { label: "Uploaded files", value: "synthetic-birth-certificate.pdf; synthetic-immunisation-statement.pdf" },
      { label: "Required evidence pending", value: "Yes" },
      { label: "Pending explanation", value: "An updated proof of address will be supplied before commencement." }
    ] },
    { title: "Primary declaration and signature", items: [
      { label: "Information complete and accurate", value: "Yes" },
      { label: "Privacy notice acknowledged", value: "Yes" },
      { label: "Authority declared", value: "Yes" },
      { label: "Signature audit acknowledged", value: "Yes" },
      { label: "Intent to sign and submit", value: "Yes" },
      { label: "Primary signer", value: "Morgan Example" },
      { label: "Final comments", value: "The family would welcome a transition conversation before commencement." }
    ] }
  ];

  if (!preview && incomingTaskToken) {
    if (storedTaskToken && storedTaskToken !== incomingTaskToken) {
      sessionStorage.removeItem("rosewood_v2_sign_session");
      sessionToken = "";
    }
    sessionStorage.setItem("rosewood_v2_task", incomingTaskToken);
    params.delete("task");
    const query = params.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function showError(target, message) { target.textContent = message; target.hidden = !message; }
  function toast(message) { const item=document.createElement("div"); item.className="toast"; item.textContent=message; document.getElementById("toast-region").append(item); setTimeout(()=>item.remove(),4000); }
  function operationId(prefix) { return `${prefix}-${crypto.randomUUID()}`; }
  function maskEmail(email) { const [a,b]=String(email||"").split("@"); return b?`${a.slice(0,2)}••••@${b}`:"your email"; }
  async function api(path, options={}) {
    if (preview) throw new Error("Preview mode cannot call the service.");
    if (!apiEndpoint) throw new Error("The V2 signature service is not configured yet.");
    const response=await fetch(`${apiEndpoint}${path}`,{method:options.method||"GET",cache:"no-store",headers:{"Content-Type":"application/json",...(sessionToken?{Authorization:`Bearer ${sessionToken}`}:{ }),...(options.idempotencyKey?{"Idempotency-Key":options.idempotencyKey}:{})},body:options.body===undefined?undefined:JSON.stringify(options.body)});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(payload.message||"The signature service could not complete this request.");
    return payload;
  }
  function setStage(next) {
    stage=Math.max(0,Math.min(3,next));
    document.querySelectorAll("[data-sign-panel]").forEach(panel=>panel.hidden=Number(panel.dataset.signPanel)!==stage);
    document.querySelectorAll("[data-sign-stage]").forEach(button=>button.setAttribute("aria-current",Number(button.dataset.signStage)===stage?"step":"false"));
    const names=["Your details","Review","Sign","Complete"];
    document.getElementById("sign-mobile-name").textContent=names[stage];
    document.getElementById("sign-mobile-count").textContent=`${stage+1} of 4`;
    document.getElementById("sign-mobile-bar").style.width=`${(stage+1)*25}%`;
    scrollTo({top:0,behavior:"smooth"});
    const heading=document.querySelector(`[data-sign-panel="${stage}"] h1, [data-sign-panel="${stage}"] h2`);
    if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  }
  function validateStage(index) {
    const panel=document.querySelector(`[data-sign-panel="${index}"]`); const list=[]; let first=null;
    panel.querySelectorAll("input,select,textarea").forEach(control=>{ if(control.disabled||control.checkValidity())return; if((control.type==="radio"||control.type==="checkbox")&&panel.querySelector(`[name="${CSS.escape(control.name)}"]:checked`))return; list.push(`${control.closest("label")?.querySelector("span")?.textContent?.replace("*","").trim()||"A required field"} needs attention.`); first||=control; });
    if(index===2&&!signed){list.push("Draw your signature before submitting."); first||=document.getElementById("remote-signature-canvas"); document.getElementById("remote-signature-box").classList.add("is-invalid"); document.getElementById("remote-signature-error").hidden=false;}
    errors.querySelector("ul").replaceChildren(...list.map(text=>{const li=document.createElement("li");li.textContent=text;return li;})); errors.hidden=!list.length; if(list.length){errors.focus();setTimeout(()=>first?.focus(),80);} return !list.length;
  }
  function renderReview() {
    const root=document.getElementById("sign-review-content"); root.replaceChildren();
    const groups=context.reviewGroups||[];
    groups.forEach(group=>{const section=document.createElement("section");section.className="form-card review-section";const h=document.createElement("h3");h.textContent=group.title;const dl=document.createElement("dl");dl.className="review-list";(group.items||[]).forEach(item=>{const dt=document.createElement("dt");dt.textContent=item.label;const dd=document.createElement("dd");dd.textContent=item.value||"Not provided";dl.append(dt,dd);});section.append(h,dl);root.append(section);});
    if(!groups.length) root.innerHTML='<div class="form-card"><h3>Application summary</h3><p>The synthetic student, guardian, care, permission and document summary is frozen at revision 4.</p></div>';
  }
  function prefill() { form.elements.firstName.value=context.signer?.firstName||"";form.elements.lastName.value=context.signer?.lastName||"";form.elements.email.value=context.signer?.email||"";form.elements.mobile.value=context.signer?.mobile||"";form.elements.relationship.value=context.signer?.relationship||"";document.getElementById("sign-student-label").textContent=`${context.studentName||"Student"} · revision ${context.revision||1}`;document.getElementById("sign-policy-version").textContent=context.policyVersion||"Not provided";renderReview(); }
  async function openTask(initial=null) { context=initial||(preview?{studentName:"Ava Example",revision:4,policyVersion:"draft-2026-08-02",reviewGroups:syntheticReviewGroups,signer:{firstName:"Morgan",lastName:"Example",email:"guardian@example.test",mobile:"0400 000 000",relationship:"Mother"}}:await api("/v2/signatures/context"));prefill();document.getElementById("sign-access-view").hidden=true;document.getElementById("sign-application-view").hidden=false;setStage(0); }
  function updateLock(){const enabled=document.getElementById("remote-audit").checked&&document.getElementById("remote-intent").checked;document.getElementById("remote-signature-overlay").hidden=enabled;document.getElementById("remote-signature-canvas").setAttribute("aria-disabled",String(!enabled));}
  function point(event){const canvas=event.currentTarget,rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*(canvas.width/rect.width),y:(event.clientY-rect.top)*(canvas.height/rect.height)};}
  function start(event){if(!document.getElementById("remote-signature-overlay").hidden)return;drawing=true;lastPoint=point(event);event.currentTarget.setPointerCapture(event.pointerId);}
  function draw(event){if(!drawing)return;const next=point(event),ctx=event.currentTarget.getContext("2d");ctx.strokeStyle="#1f3f63";ctx.lineWidth=3.4;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(lastPoint.x,lastPoint.y);ctx.lineTo(next.x,next.y);ctx.stroke();lastPoint=next;signed=true;document.getElementById("remote-clear-signature").disabled=false;document.getElementById("remote-signature-box").classList.remove("is-invalid");document.getElementById("remote-signature-error").hidden=true;document.getElementById("remote-signature-date").textContent=`Signing date: ${new Date().toLocaleDateString("en-AU")} (server confirmed on submission).`;}
  function stop(event){drawing=false;lastPoint=null;try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{}}
  function clear(){const canvas=document.getElementById("remote-signature-canvas");canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);signed=false;document.getElementById("remote-clear-signature").disabled=true;document.getElementById("remote-signature-date").textContent="The server will set the signing date.";}
  document.getElementById("sign-request-form").addEventListener("submit",async event=>{event.preventDefault();const email=document.getElementById("sign-email");if(!email.checkValidity())return showError(document.getElementById("sign-access-error"),"Enter the email that received this request.");const button=event.currentTarget.querySelector("button");button.disabled=true;try{const result=await api("/v2/signatures/request-otp",{method:"POST",idempotencyKey:operationId("sign-otp"),body:{taskToken,email:email.value.trim()}});challengeId=result.challengeId;document.getElementById("sign-masked-email").textContent=result.maskedEmail||maskEmail(email.value);document.getElementById("sign-email-card").hidden=true;document.getElementById("sign-otp-card").hidden=false;document.getElementById("sign-otp").focus();}catch(error){showError(document.getElementById("sign-access-error"),error.message);}finally{button.disabled=false;}});
  document.getElementById("sign-otp").addEventListener("input",event=>{event.target.value=event.target.value.replace(/\D/g,"").slice(0,6);document.getElementById("sign-verify-button").disabled=event.target.value.length!==6;});
  document.getElementById("sign-verify-form").addEventListener("submit",async event=>{event.preventDefault();const code=document.getElementById("sign-otp").value;if(!/^\d{6}$/.test(code))return;const button=document.getElementById("sign-verify-button");button.disabled=true;try{const result=await api("/v2/signatures/verify-otp",{method:"POST",idempotencyKey:operationId("sign-verify"),body:{taskToken,challengeId,code}});sessionToken=result.sessionToken;sessionStorage.setItem("rosewood_v2_sign_session",sessionToken);sessionStorage.setItem("rosewood_v2_task",taskToken);await openTask(result.context);}catch(error){showError(document.getElementById("sign-otp-error"),error.message);}finally{button.disabled=false;}});
  document.querySelectorAll("[data-sign-next]").forEach(button=>button.addEventListener("click",async()=>{if(!validateStage(stage))return;if(stage===0&&!preview){button.disabled=true;try{context=await api("/v2/signatures/details",{method:"PATCH",idempotencyKey:operationId("sign-details"),body:{firstName:form.elements.firstName.value,lastName:form.elements.lastName.value,email:form.elements.email.value,mobile:form.elements.mobile.value,detailsConfirmed:true}});renderReview();}catch(error){toast(error.message);return;}finally{button.disabled=false;}}setStage(stage+1);}));
  document.querySelectorAll("[data-sign-back]").forEach(button=>button.addEventListener("click",()=>setStage(stage-1)));
  document.querySelectorAll("[data-sign-stage]").forEach(button=>button.addEventListener("click",()=>{const target=Number(button.dataset.signStage);if(target<=stage)setStage(target);}));
  form.addEventListener("change",updateLock);
  const canvas=document.getElementById("remote-signature-canvas");canvas.addEventListener("pointerdown",start);canvas.addEventListener("pointermove",draw);canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);document.getElementById("remote-clear-signature").addEventListener("click",clear);
  document.getElementById("print-signature-confirmation").addEventListener("click",()=>print());
  form.addEventListener("submit",async event=>{event.preventDefault();if(!validateStage(2))return;const button=event.submitter;button.disabled=true;try{let result={status:"pending_signatures"};if(preview){await new Promise(resolve=>setTimeout(resolve,500));document.getElementById("sign-complete-lead").textContent="Synthetic preview complete. No signature or information was saved or sent.";}else{result=await api("/v2/signatures/submit",{method:"POST",idempotencyKey:operationId("signature"),body:{revision:context.revision,signerName:form.elements.signerName.value,auditDeclaration:true,intentDeclaration:true,comments:form.elements.comments.value,signatureDataUrl:canvas.toDataURL("image/png")}});sessionStorage.removeItem("rosewood_v2_sign_session");sessionStorage.removeItem("rosewood_v2_task");}if(result.status==="submitted")document.getElementById("aggregate-sign-status").classList.add("is-complete");setStage(3);}catch(error){toast(error.message);}finally{button.disabled=false;}});
  document.getElementById("sign-preview-entry").addEventListener("click",()=>openTask());
  async function init(){updateLock();if(preview){document.getElementById("sign-preview-entry").hidden=false;document.getElementById("sign-request-form").hidden=true;return;}if(!taskToken||!apiEndpoint){showError(document.getElementById("sign-access-error"),!taskToken?"This page requires the private signature link sent by Rosewood.":"The V2 secure service has not been connected yet. Use synthetic preview while deployment is completed.");document.querySelector("#sign-request-form button").disabled=true;return;}if(sessionToken){try{await openTask();}catch{sessionStorage.removeItem("rosewood_v2_sign_session");sessionToken="";}}}
  init();
})();
