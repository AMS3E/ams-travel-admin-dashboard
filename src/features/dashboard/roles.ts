import { primaryRole, type BusinessRole } from "@/features/auth/permissions";

/**
 * The five business roles all sign into the same CMS, but they do not do the
 * same job in it, so each one gets its own home screen rather than a shared
 * overview with most of it filtered away. This file holds what a screen is
 * called; `views/` holds what it shows.
 */
export interface RoleProfile {
  /** Names the dashboard in the sidebar and above its heading. */
  readonly title: string;
  /** One line on what this role is answerable for. */
  readonly blurb: string;
}

export const ROLE_PROFILES: Readonly<Record<BusinessRole, RoleProfile>> = {
  PARTNER: {
    title: "Partner dashboard",
    blurb: "Your listings, and where each one stands.",
  },
  CONTRIBUTOR: {
    title: "Contributor dashboard",
    blurb: "Your drafts, and where each one stands.",
  },
  EDITOR: {
    title: "Editor dashboard",
    blurb: "What is waiting to be published, and what is waiting to be moderated.",
  },
  BDO: {
    title: "BDO dashboard",
    blurb: "Partner listings, and the catalogue they join.",
  },
  ADMIN: {
    title: "Admin dashboard",
    blurb: "The whole platform — catalogue, people, and the audit trail.",
  },
};

/**
 * The label on the sidebar's home link. It is named after the role because it
 * is five different screens, and an editor arriving on a partner's screen
 * should be able to tell at a glance that something is wrong.
 */
export function dashboardTitle(roles: readonly string[]): string {
  const role = primaryRole(roles);
  return role ? ROLE_PROFILES[role].title : "Overview";
}
