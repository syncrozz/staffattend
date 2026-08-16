export const DEFAULT_AVATAR_FALLBACK = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';

/**
 * Builds the direct raw GitHub image URL for a staff member based on their staff ID.
 * Pattern: https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/Gambar%20Staff%20KPMBP/{STAFF_ID}.jpg
 *
 * @param staffId - Unique ID of the staff (e.g. ST001, ST002)
 * @returns Direct GitHub raw image URL
 */
export function buildStaffImageUrl(staffId: string): string {
  if (!staffId) return DEFAULT_AVATAR_FALLBACK;
  const cleanId = staffId.trim().toUpperCase();
  return `https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/Gambar%20Staff%20KPMBP/${cleanId}.jpg`;
}
