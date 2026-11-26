export const DEFAULT_AVATAR_FALLBACK =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';

/**
 * Builds the staff avatar URL using the active institution's configured avatarBaseUrl.
 * If no institution avatarBaseUrl is set, returns the safe default fallback image.
 */
export function buildStaffImageUrl(staffId: string, avatarBaseUrl?: string): string {
  if (!staffId || !avatarBaseUrl || avatarBaseUrl.trim() === '') {
    return DEFAULT_AVATAR_FALLBACK;
  }
  const cleanId = staffId.trim().toUpperCase();
  const base = avatarBaseUrl.trim().replace(/\/+$/, '');
  return `${base}/${cleanId}.jpg`;
}
