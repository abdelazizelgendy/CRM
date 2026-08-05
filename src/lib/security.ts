import { createHash } from "node:crypto";

export const INVITATION_TTL_HOURS = 72;
export function hashInvitationToken(token: string) {
  if (token.length < 20) throw new Error("Invitation token is too short");
  return createHash("sha256").update(token).digest("hex");
}
export function isPasswordAcceptable(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}
export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
