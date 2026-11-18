/**
 * Phase 12.7 — immutable public profile code (frontend mirror).
 *
 * The raw UUID remains internal. Its first 12 hex characters are the stable
 * public code, so a username change never changes the profile URL.
 */

const PUBLIC_ID_RE = /^[0-9a-f]{12}$/;

export function publicIdFromUserId(id: string): string {
  return id.replace(/-/g, '').toLowerCase().slice(0, 12);
}

export function isValidPublicId(value: string): boolean {
  return PUBLIC_ID_RE.test(value.trim().toLowerCase());
}
