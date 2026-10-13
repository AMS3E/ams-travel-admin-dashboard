import type { ResourceKey } from "@/features/catalog/resource";
import type { PublishDesk } from "@/features/publishing/api/contracts";

export const BUSINESS_ROLES = [
  "PARTNER",
  "CONTRIBUTOR",
  "EDITOR",
  "BDO",
  "ADMIN",
] as const;

const DESTINATION_PERMISSIONS = new Set([
  "PERM_LISTING_EDIT_OWN",
  "PERM_DESTINATION_DRAFT_CREATE",
  "PERM_DESTINATION_DRAFT_EDIT_OWN",
  "PERM_DESTINATION_EDIT_ANY",
  "PERM_PARTNER_LISTING_EDIT",
]);

/** Rows that hang off a destination and are edited by whoever edits any destination. */
const DESTINATION_CONTENT: ReadonlySet<ResourceKey> = new Set([
  "destination-media",
]);

/**
 * Stays and foods (and a food's photos): the editors', and a partner
 * member's for their own partner's rows — which rows those are is the API's
 * to decide. Only an editor publishes one.
 */
const LISTINGS: ReadonlySet<ResourceKey> = new Set([
  "stays",
  "stay-media",
  "stay-rooms",
  "foods",
  "food-media",
]);

/**
 * Tourism regions and the taxonomy: an editor's and a BDO's to create and
 * edit. Deleting a row other rows point at stays with full control.
 */
const TAXONOMY: ReadonlySet<ResourceKey> = new Set([
  "regions",
  "provinces",
  "interests",
  "categories",
  "tags",
  "amenities",
]);

/**
 * A destination's own content — its photographs — is written by whoever may
 * edit the destination itself, exactly as the API's gallery rules say. Which
 * destinations those are — their
 * own, their desk's, any — is the API's to decide, as it is for the
 * destination: a partner fills in their own listing's gallery, a contributor
 * their own draft's.
 */
const DESTINATION_WRITERS = new Set([
  "PERM_LISTING_EDIT_OWN",
  "PERM_DESTINATION_DRAFT_EDIT_OWN",
  "PERM_DESTINATION_EDIT_ANY",
  "PERM_PARTNER_LISTING_EDIT",
]);

/*
 * Badge definitions, badge periods and seasons need full control, which every
 * check grants first — so none of them is named below.
 */

export function hasBackofficeAccess(roles: readonly string[]): boolean {
  return BUSINESS_ROLES.some((role) => roles.includes(role));
}

export function canManageResource(
  roles: readonly string[],
  resource: ResourceKey,
): boolean {
  if (hasPermission(roles, "PERM_FULL_CONTROL")) return true;
  if (resource === "destinations") {
    return roles.some((role) => DESTINATION_PERMISSIONS.has(role));
  }
  if (resource === "corridors") return roles.includes("PERM_CORRIDOR_CURATE");
  if (DESTINATION_CONTENT.has(resource)) return roles.includes("PERM_DESTINATION_EDIT_ANY");
  if (LISTINGS.has(resource)) {
    return roles.includes("PERM_DESTINATION_EDIT_ANY") || roles.includes("PERM_LISTING_EDIT_OWN");
  }
  if (TAXONOMY.has(resource)) {
    return roles.includes("PERM_TAXONOMY_MANAGE");
  }
  return false;
}

/**
 * Whether this account records verification decisions at all. Which
 * destinations it may decide — a BDO partner listings, an editor contributor
 * drafts, full control everything — is the API's: the queue it hands back is
 * already scoped to the caller's desks.
 */
export function canVerifyDestinations(roles: readonly string[]): boolean {
  return hasPermission(roles, "PERM_VERIFIED_BADGE_SET");
}

export type BusinessRole = (typeof BUSINESS_ROLES)[number];

/**
 * Which of the five dashboards is home, for a token that carries several roles.
 *
 * Keycloak expands composites, so an administrator's `realm_access.roles` also
 * lists PARTNER, CONTRIBUTOR, EDITOR and BDO — holding a role is therefore not
 * enough to decide what to render. The first match down this list wins, and the
 * list runs from the widest remit to the narrowest.
 */
const DASHBOARD_PRECEDENCE: readonly BusinessRole[] = [
  "ADMIN",
  "EDITOR",
  "BDO",
  "CONTRIBUTOR",
  "PARTNER",
];

export function primaryRole(roles: readonly string[]): BusinessRole | null {
  return DASHBOARD_PRECEDENCE.find((role) => roles.includes(role)) ?? null;
}

/**
 * One granular grant, or the blanket grant that stands in for all of them.
 *
 * Mirrors how the API words every rule — `hasAnyAuthority(SOMETHING,
 * FULL_CONTROL)` — because a button that appears here and 403s there is worse
 * than no button at all.
 */
export function hasPermission(
  roles: readonly string[],
  permission: string,
): boolean {
  return roles.includes(permission) || roles.includes("PERM_FULL_CONTROL");
}

export function hasAnyPermission(grants: readonly string[], permissions: readonly string[]): boolean {
  return permissions.some((permission) => hasPermission(grants, permission));
}

export function hasAllPermissions(grants: readonly string[], permissions: readonly string[]): boolean {
  return permissions.every((permission) => hasPermission(grants, permission));
}

/**
 * The write rules, mirrored from the API's access rules.
 *
 * A control that appears and then 403s is worse than one that is absent, so the
 * screens ask these before rendering a button. The API is still the boundary —
 * these only decide what is offered.
 */
export function canCreateResource(
  roles: readonly string[],
  resource: ResourceKey,
): boolean {
  if (hasPermission(roles, "PERM_FULL_CONTROL")) return true;
  if (resource === "destinations") {
    return (
      hasPermission(roles, "PERM_LISTING_EDIT_OWN") ||
      hasPermission(roles, "PERM_DESTINATION_DRAFT_CREATE") ||
      hasPermission(roles, "PERM_DESTINATION_EDIT_ANY")
    );
  }
  /*
   * The photographs of a destination go with the destination: a partner and a
   * contributor fill in their own listing's gallery, which the API allows and
   * scopes to what they may edit. Reading the whole media table is still a
   * desk's, which `canManageResource` keeps to itself.
   */
  if (DESTINATION_CONTENT.has(resource)) {
    return roles.some((role) => DESTINATION_WRITERS.has(role));
  }
  return canManageResource(roles, resource);
}

export function canDeleteResource(
  roles: readonly string[],
  resource: ResourceKey,
): boolean {
  if (hasPermission(roles, "PERM_FULL_CONTROL")) return true;
  if (resource === "destinations") {
    return (
      hasPermission(roles, "PERM_DESTINATION_DELETE") ||
      hasPermission(roles, "PERM_LISTING_DELETE_OWN") ||
      hasPermission(roles, "PERM_DESTINATION_DRAFT_DELETE_OWN") ||
      hasPermission(roles, "PERM_PARTNER_LISTING_DELETE")
    );
  }
  /* A photograph is removed by whoever may write it — their own listing's, as the API scopes it. */
  if (DESTINATION_CONTENT.has(resource)) {
    return roles.some((role) => DESTINATION_WRITERS.has(role));
  }
  if (LISTINGS.has(resource)) {
    return canManageResource(roles, resource);
  }
  /* Corridors, the taxonomy, badges and seasons: other rows point at them. */
  return false;
}

/** Ownership and publication state matter in addition to access to the table. */
export function canEditRecord(
  roles: readonly string[],
  resource: ResourceKey,
  record: { readonly createdBy?: unknown; readonly status?: unknown },
  userId: string | null,
): boolean {
  if (hasPermission(roles, "PERM_FULL_CONTROL")) return true;
  if (resource === "destinations") {
    if (hasPermission(roles, "PERM_DESTINATION_EDIT_ANY")) return true;
    /*
     * A BDO reviews rather than owns. Their workspace is already only the
     * listings partners have submitted to them, so publication state is the
     * one thing left to check: approving is what puts a listing live, and a
     * live listing is editorial content from then on.
     */
    if (
      hasPermission(roles, "PERM_PARTNER_LISTING_EDIT") &&
      record.status !== "PUBLISHED"
    ) {
      return true;
    }
    if (userId == null || record.createdBy !== userId) return false;
    /* Publication is one-way for whoever writes drafts — a contributor — whatever else they hold. */
    if (hasPermission(roles, "PERM_DESTINATION_DRAFT_EDIT_OWN")) return record.status !== "PUBLISHED";
    return hasPermission(roles, "PERM_LISTING_EDIT_OWN");
  }
  /* So too a contributor's stay or food listing: once live, the editors change it. */
  if (
    (resource === "stays" || resource === "foods") &&
    record.status === "PUBLISHED" &&
    !hasPermission(roles, "PERM_DESTINATION_EDIT_ANY") &&
    hasPermission(roles, "PERM_DESTINATION_DRAFT_EDIT_OWN")
  ) {
    return false;
  }
  return canManageResource(roles, resource);
}

/**
 * Deleting one row, as opposed to having the delete control at all.
 *
 * Mirrors the API's destination rule: an editor may remove anything, while a
 * partner or contributor removing their own row and a BDO removing one
 * submitted to them can only do so while it is off the public site. Taking a
 * live row down is unpublishing, a different permission.
 */
export function canDeleteRecord(
  roles: readonly string[],
  resource: ResourceKey,
  record: { readonly createdBy?: unknown; readonly status?: unknown },
  userId: string | null,
): boolean {
  if (!canDeleteResource(roles, resource)) return false;
  if (resource !== "destinations") return true;
  if (hasPermission(roles, "PERM_DESTINATION_DELETE")) return true;
  if (record.status === "PUBLISHED") return false;
  if (hasPermission(roles, "PERM_PARTNER_LISTING_DELETE")) return true;
  return (
    (hasPermission(roles, "PERM_LISTING_DELETE_OWN") ||
      hasPermission(roles, "PERM_DESTINATION_DRAFT_DELETE_OWN")) &&
    userId != null &&
    record.createdBy === userId
  );
}

/**
 * Who may change whether a row is on the public site.
 *
 * Publishing a destination and taking it down are two permissions of their
 * own. A stay or a food is published by an editor only, even though its
 * partner may edit it. Retiring a region or a tag is an edit of it.
 */
export function canSetStatus(
  roles: readonly string[],
  resource: ResourceKey,
): boolean {
  if (hasPermission(roles, "PERM_FULL_CONTROL")) return true;
  if (resource === "destinations") {
    return (
      hasPermission(roles, "PERM_DESTINATION_PUBLISH") ||
      hasPermission(roles, "PERM_DESTINATION_UNPUBLISH")
    );
  }
  if (resource === "stays" || resource === "foods") {
    return hasPermission(roles, "PERM_DESTINATION_EDIT_ANY");
  }
  if (resource === "corridors") return hasPermission(roles, "PERM_CORRIDOR_CURATE");
  if (TAXONOMY.has(resource)) return hasPermission(roles, "PERM_TAXONOMY_MANAGE");
  return false;
}

/** What an administrator puts straight on the public site when creating it. */
const LIVE_ON_CREATE: ReadonlySet<ResourceKey> = new Set(["destinations", "stays", "foods"]);

/**
 * Whether a new destination, stay or food may go on the public site the moment
 * it is created. An administrator's needs nobody's approval, so it is published
 * straight away unless they choose to keep it a draft. Everyone else's starts
 * as a draft: a destination reaches the site through a publish request — an
 * editor's or a BDO's own included, which goes to an administrator — and a
 * stay or a food when an editor publishes it.
 *
 * A tourism corridor has no approval step at all: whoever curates corridors
 * publishes them, so theirs goes live when created too.
 */
export function canPublishOnCreate(
  roles: readonly string[],
  resource: ResourceKey,
): boolean {
  if (resource === "corridors") return canSetStatus(roles, resource);
  return LIVE_ON_CREATE.has(resource) && roles.includes("PERM_FULL_CONTROL");
}

/**
 * The permission that puts each desk's requests in front of a reviewer: a BDO
 * answers partners, an editor contributors, and an editor's or a BDO's own
 * content — the staff desk — is on no desk but an administrator's.
 */
const DESK_PERMISSION: Readonly<Record<PublishDesk, string>> = {
  PARTNER: "PERM_PARTNER_PUBLISH_APPROVE",
  CONTRIBUTOR: "PERM_CONTRIBUTOR_PUBLISH_APPROVE",
  STAFF: "PERM_FULL_CONTROL",
};

/**
 * Whether this account decides the requests on this desk. Mirrors the API: a
 * BDO decides partner listings, an editor contributor drafts, and full
 * control everything — editor and BDO content included.
 */
export function reviewsDesk(roles: readonly string[], desk: PublishDesk): boolean {
  return roles.includes("PERM_FULL_CONTROL") || roles.includes(DESK_PERMISSION[desk]);
}

/**
 * True when a role should be shown only the rows it created.
 *
 * The API scopes CMS reads and checks ownership on writes. Keep the same
 * filter here so list and detail screens agree about the user's workspace.
 * Only destinations record an owner.
 */
/**
 * A partner is shown only the stays and food listings they own; the catalogue
 * desks, which curate every listing, see them all.
 */
/**
 * Whether this account is asked who runs a stay or a food listing. Only a desk
 * that writes anyone's names an owner; the account that owns its own listings
 * is that owner, and the API fills it in.
 */
export function namesListingOwner(roles: readonly string[], resource: ResourceKey): boolean {
  return (resource === "stays" || resource === "foods") && !seesOwnListingsOnly(roles, resource);
}

export function seesOwnListingsOnly(roles: readonly string[], resource: ResourceKey): boolean {
  if (resource !== "stays" && resource !== "foods") return false;
  return !hasPermission(roles, "PERM_FULL_CONTROL") && !hasPermission(roles, "PERM_DESTINATION_EDIT_ANY");
}

export function seesOwnRowsOnly(
  roles: readonly string[],
  resource: ResourceKey,
): boolean {
  if (resource !== "destinations") return false;
  if (
    hasPermission(roles, "PERM_FULL_CONTROL") ||
    hasPermission(roles, "PERM_DESTINATION_EDIT_ANY")
  ) {
    return false;
  }
  /*
   * A BDO created none of the rows they work on. Their scope is "submitted to
   * my desk", which only the API can decide, so filtering by author here would
   * empty the screen the API had just filled.
   */
  return !hasPermission(roles, "PERM_PARTNER_LISTING_EDIT");
}
