export const USER_ROLES = [
  "student",
  "supporter",
  "mentor",
  "admin",
  "superadmin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS = {
  student: "Öğrenci",
  supporter: "Destekçi",
  mentor: "Mentor",
  admin: "Yönetici",
  superadmin: "Süper Yönetici",
} as const satisfies Record<UserRole, string>;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.some((role) => role === value);
}

export function isAdminRole(role: UserRole): boolean {
  return role === "admin" || role === "superadmin";
}
