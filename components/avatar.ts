/**
 * DiceBear Lorelei avatar URLs (https://www.dicebear.com/styles/lorelei/).
 *
 * The HTTP API is deterministic: the same `seed` always returns the same
 * avatar, so seeding by a stable identifier (e.g. the Better Auth user id)
 * gives every user a consistent avatar across pages and sessions.
 */
const DICEBEAR_BASE_URL = "https://api.dicebear.com/10.x/lorelei/svg";

export function getAvatarUrl(seed: string): string {
  return `${DICEBEAR_BASE_URL}?seed=${encodeURIComponent(seed)}`;
}
