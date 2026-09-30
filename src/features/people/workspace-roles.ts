import type { BusinessRole } from "@/features/auth/permissions";

export const STAFF_ROLES = ["PARTNER", "CONTRIBUTOR", "EDITOR", "BDO"] as const;

export const WORKSPACE_ACCESS: Readonly<Record<BusinessRole, string>> = {
  PARTNER: "Only their own listings, their business's stays and food, photos, and publishing requests.",
  CONTRIBUTOR: "Only their own attractions, stays and food listings, photos, and publishing requests.",
  EDITOR: "Editorial destinations, stays, food and corridors, contributor submissions, and review moderation. No account management or platform totals.",
  BDO: "Partner submissions and publishing decisions, and the catalogue. No contributor drafts or account administration.",
  ADMIN: "All workspaces, account management, partners, role assignment, badges, and platform statistics.",
};

export function initialAccountRole(value: unknown): BusinessRole {
  return typeof value === "string" && STAFF_ROLES.some((role) => role === value)
    ? value as (typeof STAFF_ROLES)[number]
    : "PARTNER";
}
