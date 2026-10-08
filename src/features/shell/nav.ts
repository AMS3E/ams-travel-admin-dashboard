import {
  Award, BadgeCheck, BedDouble, BedSingle, Building2, CalendarRange, ChefHat, ClipboardCheck, Compass,
  FileClock, FilePenLine, Flame, Images,
  LayoutDashboard, Map, MapPin, MessageSquare, Plus, Route,
  Settings, Shapes, ShieldCheck, Sparkles, Star, Store, SunMedium, Tag,
  Users, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ResourceKey } from "@/features/catalog/resource";
import type { PublishDesk } from "@/features/publishing/api/contracts";
import { canManageResource, hasAnyPermission, primaryRole, type BusinessRole } from "@/features/auth/permissions";

const ICONS: Readonly<Record<ResourceKey, LucideIcon>> = {
  destinations: MapPin, "destination-media": Images, stays: BedDouble,
  "stay-media": Images, "stay-rooms": BedSingle, foods: UtensilsCrossed, "food-media": Images, "food-menu-items": ChefHat, corridors: Route, regions: Map,
  provinces: Building2, interests: Compass, categories: Shapes, tags: Tag,
  "badge-definitions": Award,
  "badge-periods": CalendarRange, seasons: SunMedium,
};
export const resourceIcon = (key: ResourceKey) => ICONS[key];
export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly description: string;
  readonly resource?: ResourceKey;
  readonly permissions?: readonly string[];
  readonly aliases?: readonly string[];
  readonly exact?: boolean;
}
export interface NavGroup {
  readonly title: string;
  readonly items: readonly NavItem[];
}
export const dashboardItem: NavItem = {
  href: "/dashboard", label: "Dashboard", icon: LayoutDashboard,
  description: "Your workspace at a glance", aliases: ["/"],
};
const editorial = ["PERM_DESTINATION_EDIT_ANY"];
const writing = ["PERM_LISTING_EDIT_OWN", "PERM_DESTINATION_DRAFT_CREATE", "PERM_DESTINATION_EDIT_ANY"];
const publishing = ["PERM_PUBLISH_REQUEST_SUBMIT", "PERM_PUBLISH_REQUEST_VIEW_OWN", "PERM_PARTNER_PUBLISH_APPROVE", "PERM_CONTRIBUTOR_PUBLISH_APPROVE"];
const listingAccess = [...writing, "PERM_PARTNER_LISTING_EDIT"];
function catalog(href: string, label: string, resource: ResourceKey, description: string): NavItem {
  return { href, label, resource, description, icon: ICONS[resource] };
}
function tool(href: string, label: string, icon: LucideIcon, permissions: readonly string[], description: string): NavItem {
  return { href, label, icon, permissions, description };
}

/* --- what each role's sidebar is built from ------------------------------ */

/*
 * Stays and food listings have no entry of their own: they are tabs of All
 * Destinations, and are made from Create Destination. Their pages sit under
 * those two entries.
 */
const destinations: NavItem = {
  ...catalog("/destinations", "All Destinations", "destinations", "Every attraction, place to eat and stay, with a tab per main type"),
  aliases: ["/stays", "/foods"],
};
/* Asks the main type first — attraction, food, stay — then opens that form. */
const createDestination: NavItem = {
  ...tool("/create", "Create Destination", Plus, writing, "Choose the main type — attraction, food or stay — then fill in its form"),
  aliases: ["/destinations/new", "/stays/new", "/foods/new"],
  exact: true,
};
/** A new row's form belongs to its Create entry, not to its list: a new stay is Create Destination's. */
const CREATE_PAGES: ReadonlySet<string> = new Set([
  createDestination.href,
  ...(createDestination.aliases ?? []),
]);

/**
 * A partner's or a contributor's content: their own destinations — and, for
 * a partner, the stays and food listings their business runs, on the tabs of
 * All Destinations.
 */
const ownContent: NavGroup = {
  title: "Content Management",
  items: [destinations, createDestination],
};

/**
 * Verifying a destination on evidence — an invoice or a receipt — is a desk's
 * job, not a badge: a BDO verifies partner listings, an editor contributor
 * drafts, and an administrator anything. The API scopes the queue to those.
 * The same grant as `canVerifyDestinations`.
 */
const VERIFY_PERMISSIONS = ["PERM_VERIFIED_BADGE_SET"];

/**
 * The whole catalogue, for the desks that manage it: the list and its Create
 * first, then the work waiting on it — drafts to finish, places to verify —
 * then what the places are shown with, and last the regions, set up once.
 */
const catalogueContent: NavGroup = {
  title: "Content Management",
  items: [
    destinations,
    createDestination,
    tool("/drafts", "Drafts", FilePenLine, listingAccess, "Destinations that have not been published"),
    tool("/verification", "Verification", BadgeCheck, VERIFY_PERMISSIONS, "Verify destinations on evidence, renew it, or revoke it"),
    catalog("/destination-media", "Destination Media", "destination-media", "Every photo on a destination page, in one gallery"),
    catalog("/corridors", "Tourism Corridors", "corridors", "Day-by-day travel plans with routes on the map"),
    catalog("/regions", "Tourism Regions", "regions", "The regions travellers discover Cambodia by, and their own lists"),
  ],
};

/**
 * The homepage lists as visitors see them, in the homepage's order:
 * Recommended, then Popular. Featured destinations lead both; browsing ranks
 * the rest.
 */
const homepage: NavGroup = {
  title: "Homepage & Discovery",
  items: [
    tool("/recommended", "Recommended", Star, editorial, "What the homepage recommends, and why"),
    tool("/popular-now", "Popular", Flame, editorial, "The most browsed destinations right now"),
  ],
};

/* What a place is sorted and filtered by, most used first; the provinces, which rarely change, last. */
const taxonomy: NavGroup = {
  title: "Taxonomy",
  items: [
    catalog("/categories", "Categories", "categories", "Organize your destination catalog"),
    catalog("/tags", "Tags", "tags", "Labels that connect your content"),
    catalog("/interests", "Interests", "interests", "Ways for travelers to explore"),
    catalog("/provinces", "Provinces", "provinces", "Manage Cambodia's provinces"),
  ],
};

/**
 * The four desks a destination can be submitted from, by the URL prefix their
 * pages share. A partner's listings go to a BDO, a contributor's drafts to an
 * editor; an editor's and a BDO's own content both land on the API's STAFF
 * desk, which an administrator decides.
 */
export const DESKS = {
  partner: { name: "Partner", desk: "PARTNER", reviewer: "BDO" },
  contributor: { name: "Contributor", desk: "CONTRIBUTOR", reviewer: "editor" },
  editor: { name: "Editor", desk: "STAFF", reviewer: "administrator" },
  bdo: { name: "BDO", desk: "STAFF", reviewer: "administrator" },
} as const satisfies Record<string, { name: string; desk: PublishDesk; reviewer: string }>;
export type Desk = keyof typeof DESKS;

/**
 * One desk's workflow. A partner or a contributor tracks their own requests,
 * drafts and decisions; the desk that reviews them — and an editor or a BDO,
 * for their own content — sees the same pages from the other side.
 *
 * In the order each side works: a submitter finishes a draft, sends it, then
 * reads the decision — Drafts, Requests, All List Approvals. A reviewer
 * starts from what waits on them — Requests, All List Approvals, then the
 * drafts not sent yet. An editor's and a BDO's own desk is a submitter's,
 * read exactly as a partner reads theirs; they answer their own request there.
 */
function management(desk: Desk, submitterOnly = false): NavGroup {
  const { name, reviewer } = DESKS[desk];
  const requests = tool(`/${desk}-requests`, `${name} Requests`, ClipboardCheck, publishing, `Publishing requests from the ${name.toLowerCase()} desk`);
  const approvals = tool(`/${desk}-listing-approvals`, "All List Approvals", ShieldCheck, publishing, "Approved and rejected listings, and those still waiting");
  /* A desk that publishes what it writes answers its own request; the others wait on their reviewer. */
  const ownDrafts = tool(`/${desk}-draft`, "Drafts", FilePenLine, listingAccess,
    DESKS[desk].desk === "STAFF" ? "Your drafts, to publish or send for review" : `Your drafts waiting for ${reviewer} review`);
  return {
    title: `${name} Management`,
    items: submitterOnly
      ? [ownDrafts, requests, approvals]
      : [requests, approvals, tool(`/${desk}-draft`, `${name} Drafts`, FilePenLine, listingAccess, `Unpublished ${name.toLowerCase()} destinations`)],
  };
}

/* People first, then who may do what, then the record of what they did, then the settings. */
const administration: NavGroup = {
  title: "Administration",
  items: [
    tool("/users", "Users", Users, ["PERM_USER_MANAGE"], "Customers who registered on the public site"),
    { ...tool("/roles", "Roles & Permissions", ShieldCheck, ["PERM_ROLE_ASSIGN"], "Partner, contributor, editor, BDO, and administrator accounts"), aliases: ["/people"] },
    { ...tool("/audit-logs", "Audit Logs", FileClock, ["PERM_AUDIT_VIEW"], "A record of changes across your CMS"), aliases: ["/audit"] },
    tool("/settings", "Settings", Settings, ["PERM_FULL_CONTROL"], "Workspace preferences and catalog configuration"),
  ],
};

/**
 * Each role's sidebar, as the back office is organised: partners and
 * contributors see their own content and their desk's workflow; editors and
 * BDOs manage the catalogue, review the desk below them, and submit their own
 * content; an administrator reviews every desk. Chosen by the home role — the
 * same precedence that picks the dashboard — and still filtered by permission,
 * so a realm that has not caught up with a grant hides the screen rather than
 * offering one that would be refused.
 */
const ROLE_GROUPS: Readonly<Record<BusinessRole, readonly NavGroup[]>> = {
  PARTNER: [ownContent, management("partner", true)],
  CONTRIBUTOR: [ownContent, management("contributor", true)],
  EDITOR: [catalogueContent, homepage, taxonomy, management("contributor"), management("editor", true)],
  BDO: [catalogueContent, homepage, taxonomy, management("partner"), management("bdo", true)],
  ADMIN: [
    catalogueContent, homepage, taxonomy,
    management("partner"), management("contributor"), management("editor"), management("bdo"),
    administration,
  ],
};

/*
 * Every group's entries in the order the work is done — the main list and its
 * Create first, the queues next, what is set up once last — not A to Z.
 */
export const roleNavigation: Readonly<Record<BusinessRole, readonly NavGroup[]>> = ROLE_GROUPS;

// Existing bookmarks remain reachable without adding extra sidebar items.
export const legacyNavigation: readonly NavGroup[] = [{ title: "Workspace", items: [
  tool("/publish-requests", "Publish Requests", ClipboardCheck, publishing, "Review submissions and track publication"),
  tool("/reviews", "Reviews", MessageSquare, ["PERM_REVIEW_MODERATE"], "Moderate traveler feedback"),
  tool("/partner-listings", "Partner Listings", Store, ["PERM_PARTNER_PUBLISH_APPROVE", "PERM_LISTING_EDIT_OWN"], "Listings submitted by travel partners"),
  tool("/featured", "Featured", Sparkles, editorial, "The destinations marked as featured"),
] }];

function allowed(grants: readonly string[], item: NavItem): boolean {
  return item.resource
    ? canManageResource(grants, item.resource)
    : hasAnyPermission(grants, item.permissions ?? []);
}

export function navGroups(grants: readonly string[], includeLegacy = false): readonly NavGroup[] {
  const role = primaryRole(grants);
  return [...(role ? roleNavigation[role] : []), ...(includeLegacy ? legacyNavigation : [])]
    .map((group) => ({ ...group, items: group.items.filter((item) => allowed(grants, item)) }))
    .filter((group) => group.items.length > 0);
}
export function isNavigationActive(item: NavItem, pathname: string): boolean {
  if (!item.exact && CREATE_PAGES.has(pathname)) return false;
  return [item.href, ...(item.aliases ?? [])].some((href) => pathname === href || (!item.exact && href !== "/" && pathname.startsWith(href + "/")));
}
/**
 * The sidebar entry a path belongs to. This account's own sidebar is asked
 * first, since a desk's page can read differently by role — "Drafts" to a
 * partner, "Partner Drafts" to a BDO.
 */
export function navigationForPath(pathname: string, grants?: readonly string[]) {
  const groups = [
    ...(grants ? navGroups(grants, true) : []),
    ...Object.values(roleNavigation).flat(),
    ...legacyNavigation,
  ];
  return groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })))
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isNavigationActive(item, pathname));
}
