import crypto from 'node:crypto';
import { activeInvitationAccess } from './invitation-access.mjs';
import { offerTaskAccess, offerAcceptanceOpen } from './offer-workflow.mjs';
import { offerSignerContactAllowed } from './offer-details.mjs';

const fail = (code = 'FAMILY_ACCESS_DENIED') => Object.assign(new Error('This family record is not available through your verified access. Open your private email link or contact the College.'), { status: code === 'SESSION_EXPIRED' ? 401 : 403, code });
const ids = invitation => [...new Set([invitation?.applicationId, ...(invitation?.applicationIds || [])].filter(Boolean))];
export function portalApplicationAllowed(app, email) {
  if (app?.recipientEmail !== email) return false;
  if (!app.signerControls?.length) return true;
  const current = app.signerControls.filter(person => person.currentEmail === email);
  return current.length > 0 && current.every(person => person.contactPermission === true);
}
const applicationStage = status => ({ invited: ['application_not_started', 'Application not started'], in_progress: ['application_in_progress', 'Application in progress'], pending_signatures: ['application_awaiting_signatures', 'Application awaiting signatures'], staff_review_required: ['application_under_review', 'Application under review'], submitted: ['application_submitted', 'Application submitted — awaiting College review'] })[status] || ['application_unavailable', 'Contact the College'];

// Bridge sessions retain the original verified session as their revocation/expiry anchor.
// Never derive family membership from an email search or permit a secondary guardian to
// acquire an Application scope. Every transition rechecks the explicit invitation graph.
export async function validatePortalAnchor({ store, session, now }) {
  if (!session.portalAnchor) return null;
  const root = await store.getSession(session.portalAnchor);
  if (!root || root.portalAnchor || root.email !== session.email || root.expiresAt <= now || root.absoluteExpiresAt <= now || !['application_family', 'enrolment_offer'].includes(root.scope)) throw fail('SESSION_EXPIRED');
  let invitationId = root.invitationId, primary = root.scope === 'application_family';
  if (root.scope === 'enrolment_offer') {
    const task = await store.getOfferTask(root.taskTokenHash);
    const family = task && await store.getOfferFamily(task.familyId);
    if (!task || task.email !== root.email || task.familyId !== root.familyId || !family || !(await offerTaskAccess(store, task, now)).length) throw fail('SESSION_EXPIRED');
    invitationId = family.invitationId; primary = task.primary === true;
  }
  const invitation = await store.getInvitationById(invitationId);
  if (root.scope === 'application_family' || session.scope !== 'enrolment_offer') {
    if (!primary || !activeInvitationAccess(invitation, now) || invitation.recipientEmail !== session.email || (session.invitationId && session.invitationId !== invitationId)) throw fail('SESSION_EXPIRED');
    if (session.applicationId) {
      const app = await store.getApplication(session.applicationId);
      if (!ids(invitation).includes(app?.id) || app.invitationId !== invitationId || !portalApplicationAllowed(app, session.email)) throw fail('SESSION_EXPIRED');
    }
  }
  return root;
}

export function createFamilyPortal({ store, env, clock, requireSession, parseBody }) {
  async function resolve(event) {
    const actor = await requireSession(event, ['application_family', 'enrolment_offer']);
    let invitationId = actor.invitationId, primary = actor.scope === 'application_family';
    if (!primary) {
      if (env.ENROLMENT_OFFERS_ENABLED !== 'true') throw fail();
      const task = await store.getOfferTask(actor.taskTokenHash);
      const family = task && await store.getOfferFamily(task.familyId);
      if (!task || task.email !== actor.email || task.familyId !== actor.familyId || !family || !(await offerTaskAccess(store, task, clock())).length) throw fail();
      invitationId = family.invitationId; primary = task.primary === true;
    }
    const invitation = await store.getInvitationById(invitationId);
    if (!invitation || invitation.id !== invitationId) throw fail();
    const canUseApplications = primary && activeInvitationAccess(invitation, clock()) && invitation.recipientEmail === actor.email;
    if (actor.scope === 'application_family' && !canUseApplications) throw fail();
    const rows = [];
    for (const applicationId of ids(invitation)) {
      const app = await store.getApplication(applicationId);
      if (!app || app.invitationId !== invitationId) continue;
      const canUseApplication = canUseApplications && portalApplicationAllowed(app, actor.email);
      let accessible, offer, unavailableStage;
      if (env.ENROLMENT_OFFERS_ENABLED === 'true') {
        const candidate = await store.getOfferByApplication(app.id);
        const family = candidate && await store.getOfferFamily(candidate.familyId);
        const account = family?.invitationId === invitationId && family.accounts.find(person => person.email === actor.email && person.children.some(child => child.offerId === candidate.id));
        const task = account?.tokenHash && await store.getOfferTask(account.tokenHash);
        if (task?.email === actor.email && task.familyId === family.id) {
          accessible = (await offerTaskAccess(store, task, clock())).find(child => child.offer.id === candidate.id);
          if (accessible) {
            const o = accessible.offer;
            offer = { offerId: o.id, status: o.status, signed: o.signatures.length, required: o.signers.length, alreadySigned: Boolean(accessible.signed), reviewRequired: o.correction?.status === 'open' || o.signers.some(person => !offerSignerContactAllowed(o, app, person)) };
            accessible.task = task;
          } else if (canUseApplication && candidate.status === 'withdrawn') {
            unavailableStage = ['offer_withdrawn', 'Offer withdrawn — contact the College'];
          } else if (canUseApplication && candidate.status === 'awaiting_signatures' && !offerAcceptanceOpen(candidate, clock())) {
            unavailableStage = ['offer_deadline_passed', 'Offer acceptance deadline passed — contact the College'];
          }
        }
      }
      if (!canUseApplication && !accessible) continue;
      let [stage, statusLabel] = applicationStage(app.status || 'invited');
      if (unavailableStage) [stage, statusLabel] = unavailableStage;
      if (offer) [stage, statusLabel] = offer.status === 'signed_conditional' ? ['acceptance_complete', 'Provisional offer acceptance complete'] : offer.reviewRequired ? ['offer_under_review', 'Offer under College review'] : offer.signed ? ['offer_awaiting_signatures', 'Offer awaiting signatures'] : ['offer_ready', 'Provisional offer ready to accept'];
      rows.push({ app, accessible, view: {
        applicationId: app.id, studentName: accessible?.offer.packet.studentName || [app.values?.student_first, app.values?.student_last].filter(Boolean).join(' '),
        entryYear: accessible?.offer.packet.entryYear || app.values?.entry_year || '', entryLevel: accessible?.offer.packet.entryLevel || app.values?.entry_level || '',
        applicationStatus: app.status || 'invited', stage, statusLabel,
        applicationAction: canUseApplication ? (['invited', 'in_progress'].includes(app.status || 'invited') ? 'continue' : ['submitted', 'pending_signatures', 'staff_review_required'].includes(app.status) ? 'status' : '') : '',
        ...(offer ? { offer } : {})
      } });
    }
    return { actor, invitation, rows, canUseApplications };
  }
  async function context(event) {
    const { actor, rows, canUseApplications } = await resolve(event);
    return { children: rows.map(row => row.view), canUseApplications, expiresAt: actor.expiresAt, absoluteExpiresAt: actor.absoluteExpiresAt };
  }
  async function open(event) {
    const { actor, invitation, rows, canUseApplications } = await resolve(event), body = parseBody(event, 5000);
    const row = rows.find(item => item.app.id === body.applicationId);
    if (!row || !['application', 'offer'].includes(body.target)) throw fail();
    const now = clock(), token = crypto.randomBytes(32).toString('base64url');
    const absoluteExpiresAt = actor.absoluteExpiresAt, expiresAt = Math.min(now + 5400000, absoluteExpiresAt);
    const session = { tokenHash: crypto.createHash('sha256').update(token).digest('hex'), email: actor.email, createdAt: now, lastActivityAt: now, expiresAt, absoluteExpiresAt, ttl: Math.floor((absoluteExpiresAt + 86400000) / 1000), portalAnchor: actor.portalAnchor || actor.tokenHash };
    if (body.target === 'application') {
      if (!canUseApplications || !row.view.applicationAction) throw fail();
      Object.assign(session, { scope: 'application_family', invitationId: invitation.id });
    } else {
      if (!row.accessible || row.accessible.offer.id !== body.offerId) throw fail();
      Object.assign(session, { scope: 'enrolment_offer', familyId: row.accessible.task.familyId, taskTokenHash: row.accessible.task.tokenHash, verifiedAt: actor.verifiedAt || new Date(actor.createdAt).toISOString() });
    }
    await store.putSession(session);
    return { target: body.target, sessionToken: token, applicationId: row.app.id, ...(body.target === 'offer' ? { offerId: row.accessible.offer.id } : { applicationAction: row.view.applicationAction }), email: actor.email, expiresAt, absoluteExpiresAt };
  }
  return { context, open };
}
