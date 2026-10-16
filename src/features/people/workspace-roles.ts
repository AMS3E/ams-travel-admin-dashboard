import english from "@locales/en/people.json";
import type { BusinessRole } from "@/features/auth/permissions";

export const STAFF_ROLES = ["PARTNER", "CONTRIBUTOR", "EDITOR", "BDO"] as const;

/* English, for screens not yet translated; translated screens read `people.workspaceAccess`. */
export const WORKSPACE_ACCESS: Readonly<Record<BusinessRole, string>> = english.workspaceAccess;

export function initialAccountRole(value: unknown): BusinessRole {
  return typeof value === "string" && STAFF_ROLES.some((role) => role === value)
    ? value as (typeof STAFF_ROLES)[number]
    : "PARTNER";
}
