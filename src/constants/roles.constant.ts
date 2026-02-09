export const ROLES = ['super', 'admin', 'manager', 'employee'] as const;
export type UserRole = (typeof ROLES)[number];

export const DEFAULT_ROLE: UserRole = 'employee';
export const SUPER_ROLE: UserRole = 'super';

const CREATABLE_ROLES: Record<UserRole, readonly UserRole[]> = {
  super: ROLES,
  admin: ROLES.slice(1),
  manager: ROLES.slice(3),
  employee: ROLES.slice(ROLES.length),
};

export function canCreateRole(creatorRole: UserRole, targetRole: UserRole): boolean {
  return CREATABLE_ROLES[creatorRole].includes(targetRole);
}
