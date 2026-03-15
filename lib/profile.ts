import type { User } from '@/shared/types';

/** Default display name assigned to new users: "User " + address.slice(0, 8). */
const DEFAULT_NAME_PATTERN = /^User\s+0x[a-fA-F0-9]+$/;

/** True when the user has not set a real name or business name (still on default or empty). */
export function isProfileIncomplete(user: User | null): boolean {
  if (!user?.display_name) return true;
  const name = user.display_name.trim();
  if (!name) return true;
  return DEFAULT_NAME_PATTERN.test(name);
}
