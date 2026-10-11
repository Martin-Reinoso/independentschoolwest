// Application invitations only. OTP, session, signature and meeting lifetimes are separate.
export function invitationHasNoExpiry(invitation) {
  return invitation?.expiryPolicy === "none" && invitation.expiresAt === null;
}

export function invitationExpiryMs(invitation) {
  if (invitationHasNoExpiry(invitation)) return Infinity;
  if (invitation?.expiryPolicy && invitation.expiryPolicy !== "fixed") return 0;
  if (invitation?.expiresAt == null || invitation.expiresAt === "") return 0;
  const numeric = Number(invitation.expiresAt);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(invitation.expiresAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function activeInvitationAccess(invitation, now) {
  return Boolean(invitation?.id && invitation?.tokenHash && invitation.status === "active" && invitationExpiryMs(invitation) > now);
}

export function invitationTtlAttributes(invitation) {
  if (invitationHasNoExpiry(invitation)) return {};
  const expiresAt = invitationExpiryMs(invitation);
  if (!(expiresAt > 0)) throw new Error("Application invitation requires an explicit valid expiry policy.");
  return { ttl: Math.floor(expiresAt / 1000) + 86400 };
}

export function invitationExpiryIso(invitation) {
  const expiresAt = invitationExpiryMs(invitation);
  return Number.isFinite(expiresAt) && expiresAt > 0 ? new Date(expiresAt).toISOString() : "";
}
