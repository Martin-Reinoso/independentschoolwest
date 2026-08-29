(() => {
  "use strict";
  const API = "https://6zyzo44sdb5zmmx53toktqrnuu0sikyd.lambda-url.ap-southeast-2.on.aws";
  const invite = new URLSearchParams(location.search).get("invite") || "";
  let challengeId = "";
  let sessionToken = "";
  const byId = id => document.getElementById(id);
  function notice(message="") { const node=byId("notice"); node.textContent=message; node.hidden=!message; if(message) node.focus(); }
  function step(id) { ["email-step","code-step","slots-step","complete-step"].forEach(name => byId(name).hidden=name!==id); notice(); }
  async function api(path, body, authenticated=false) {
    const response=await fetch(`${API}${path}`,{method:path.endsWith("context")?"GET":"POST",headers:{"Content-Type":"application/json",...(authenticated?{Authorization:`Bearer ${sessionToken}`}:{})},cache:"no-store",...(body?{body:JSON.stringify(body)}:{})});
    const payload=await response.json().catch(()=>({})); if(!response.ok) throw new Error(payload.message||"The booking service could not complete this request."); return payload;
  }
  byId("email-form").addEventListener("submit",async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{const result=await api("/v6/meetings/request-code",{invite,email:byId("email").value.trim().toLowerCase()});challengeId=result.challengeId;step("code-step");byId("code").focus();}catch(error){notice(error.message);}finally{button.disabled=false;}});
  byId("code-form").addEventListener("submit",async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{const verified=await api("/v6/meetings/verify-code",{invite,challengeId,code:byId("code").value.trim()});sessionToken=verified.sessionToken;const context=await api("/v6/meetings/context",null,true);byId("series-title").textContent=context.series.title;byId("meeting-context").textContent=`Meeting for ${context.studentName||"your child"} with ${context.series.hostName} at ${context.series.location}.`;const list=byId("slot-list");list.replaceChildren();context.slots.forEach(slot=>{const label=document.createElement("label");label.className="slot-option";const input=document.createElement("input");input.type="radio";input.name="slot";input.value=slot.id;input.required=true;const text=document.createElement("span");text.textContent=new Intl.DateTimeFormat("en-AU",{dateStyle:"full",timeStyle:"short",timeZone:"Australia/Melbourne"}).format(new Date(slot.startsAt));label.append(input,text);list.append(label);});if(!context.slots.length){const empty=document.createElement("p");empty.textContent="There are no available meeting times at present. Please contact enrolment@ffe.org.au.";list.append(empty);byId("book-button").hidden=true;}step("slots-step");}catch(error){notice(error.message);}finally{button.disabled=false;}});
  byId("slots-form").addEventListener("submit",async event=>{event.preventDefault();const selected=new FormData(event.target).get("slot");if(!selected)return notice("Choose an available meeting time.");const button=event.submitter;button.disabled=true;try{const result=await api("/v6/meetings/book",{slotId:selected},true);const when=new Intl.DateTimeFormat("en-AU",{dateStyle:"full",timeStyle:"short",timeZone:"Australia/Melbourne"}).format(new Date(result.booking.startsAt));byId("confirmation").textContent=`${result.booking.title}: ${when}, ${result.booking.location}.`;step("complete-step");}catch(error){notice(error.message);}finally{button.disabled=false;}});
  if(!invite) notice("This private meeting invitation is missing or incomplete.");
})();
