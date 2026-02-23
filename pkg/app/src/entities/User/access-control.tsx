import type { User } from './User.type';

export function hasAccessToPaidContent(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }
  return user.planId !== 1 || user.isAdmin;
}
