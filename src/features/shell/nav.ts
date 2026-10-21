import {
  Award, BadgeCheck, BedDouble, BedSingle, Building2, CalendarRange, ChartColumn, ChefHat, ClipboardCheck, Compass, ConciergeBell,
  FileClock, FilePenLine, Images,
  LayoutDashboard, Map, MapPin, MessageSquare, Plus, Route,
  Settings, Shapes, ShieldCheck, Store, SunMedium, Tag,
  Users, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ResourceKey } from "@/features/catalog/resource";
import type { PublishDesk } from "@/features/publishing/api/contracts";
import { canManageResource, hasAnyPermission, primaryRole, type BusinessRole } from "@/features/auth/permissions";
import type shellMessages from "@locales/en/shell.json";

/** Where an entry's words are in `shell.json`; a desk's entries name their desk. */
export type NavItemKey = keyof (typeof shellMessages)["nav"]["items"];
export type NavGroupKey = keyof (typeof shellMessages)["nav"]["groups"];
export interface NavText {
  readonly key: NavItemKey;
  readonly desk?: Desk;
}

const ICONS: Readonly<Record<ResourceKey, LucideIcon>> = {
  destinations: MapPin, "destination-media": Images, stays: BedDouble,
  "stay-media": Images, "stay-rooms": BedSingle, foods: UtensilsCrossed, "food-media": Images, "food-menu-items": ChefHat, corridors: Route, "corridor-media": Images, regions: Map,
  provinces: Building2, interests: Compass, categories: Shapes, tags: Tag, amenities: ConciergeBell,
  "badge-definitions": Award,
  "badge-periods": CalendarRange, seasons: SunMedium,
};
export const resourceIcon = (key: ResourceKey) => ICONS[key];
export interface NavItem {
  readonly href: string;
  /** The English name; screens show `text` in the chosen language. */
  readonly label: string;
  readonly text: NavText;
  readonly icon: LucideIcon;
  readonly description: string;
  readonly resource?: ResourceKey;
  readonly permissions?: readonly string[];
  readonly aliases?: readonly string[];
  readonly exact?: boolean;
}
export interface NavGroup {
  /** The English title; screens show `key` in the chosen language. */
  readonly title: string;
  readonly key: NavGroupKey;
  readonly desk?: Desk;
  readonly items: readonly NavItem[];
}
export const dashboardItem: NavItem = {
  href: "/dashboard", label: "Dashboard", text: { key: "dashboard" }, icon: LayoutDashboard,
  description: "Your workspace at a glance", aliases: ["/"],
};
const writing = ["PERM_LISTING_EDIT_OWN", "PERM_DESTINATION_DRAFT_CREATE", "PERM_DESTINATION_EDIT_ANY"];
const publishing = ["PERM_PUBLISH_REQUEST_SUBMIT", "PERM_PUBLISH_REQUEST_VIEW_OWN", "PERM_PARTNER_PUBLISH_APPROVE", "PERM_CONTRIBUTOR_PUBLISH_APPROVE"];
const listingAccess = [...writing, "PERM_PARTNER_LISTING_EDIT"];
function catalog(href: string, label: string, resource: ResourceKey, description: string, text: NavText): NavItem {
  return { href, label, text, resource, description, icon: ICONS[resource] };
}
function tool(href: string, label: string, icon: LucideIcon, permissions: readonly string[], description: string, text: NavText): NavItem {
  return { href, label, text, icon, permissions, description };
}

/* --- what each role's sidebar is built from ------------------------------ */

/*
 * Stays and food listings have no entry of their own: they are tabs of All
 * Destinations, and are made from Create Destination. Their pages sit under
 * those two entries.
 */
const destinations: NavItem = {
  ...catalog("/destinations", "All Destinations", "destinations", "Every attraction, place to eat and stay, with a tab per main type", { key: "destinations" }),
  aliases: ["/stays", "/foods"],
};
/* Asks the main type first — attraction, food, stay — then opens that form. */
const createDestination: NavItem = {
  ...tool("/create", "Create Destination", Plus, writing, "Choose the main type — attraction, food or stay — then fill in its form", { key: "create" }),
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
  key: "content",
  items: [destinations],
};

/**
 * Verifying a destination on evidence — an invoice or a receipt — is a desk's
 * job, not a badge: a BDO verifies partner listings, an editor contributor
 * drafts, and an administrator anything. The API scopes the queue to those.
 * The same grant as `canVerifyDestinations`.
 */
const VERIFY_PERMISSIONS = ["PERM_VERIFIED_BADGE_SET"];

/**
 * The whole catalogue, for the desks that manage it, in the user's order
 * (2026-10-09): the list, which creates and filters drafts too; the corridors
 * and regions it is shelved in; verifying; the photos; and the figures.
 */
const catalogueContent: NavGroup = {
  title: "Content Management",
  key: "content",
  items: [
    destinations,
    catalog("/corridors", "Tourism Corridors", "corridors", "Day-by-day travel plans with routes on the map", { key: "corridors" }),
    catalog("/regions", "Tourism Regions", "regions", "The regions travellers discover Cambodia by, and their own lists", { key: "regions" }),
    tool("/verification", "Verification", BadgeCheck, VERIFY_PERMISSIONS, "Verified places show as Recommended by AMS Travel: file what it rests on, renew it, or revoke it", { key: "verification" }),
    catalog("/destination-media", "Media Library", "destination-media", "Every photo in the catalogue, in one gallery", { key: "mediaLibrary" }),
    /* Read-only: what travellers make of each place, and what its Verified badge rests on. */
    tool("/destination-stats", "Destination Stats", ChartColumn, ["PERM_DESTINATION_EDIT_ANY"], "Ratings, reviews, browses and the Verified standing of every destination", { key: "destinationStats" }),
  ],
};

/* What a place is sorted and filtered by, most used first; the provinces, which rarely change, last. */
const taxonomy: NavGroup = {
  title: "Taxonomy",
  key: "taxonomy",
  items: [
    /* One tree, by region: each tourism region's own categories and search filters. The two old lists answer bookmarks. */
    { ...catalog("/categories-and-tags", "Tourism Regions", "categories", "Each tourism region's own categories and search filters, in one tree", { key: "taxonomyTree" }), aliases: ["/categories", "/tags"] },
    catalog("/amenities", "Amenities", "amenities", "What a stay offers, at the property and in the room", { key: "amenities" }),
    catalog("/interests", "Interests", "interests", "Ways for travelers to explore", { key: "interests" }),
    catalog("/provinces", "Provinces", "provinces", "Manage Cambodia's provinces", { key: "provinces" }),
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
  const requests = tool(`/${desk}-requests`, `${name} Requests`, ClipboardCheck, publishing, `Publishing requests from the ${name.toLowerCase()} desk`, { key: "deskRequests", desk });
  const approvals = tool(`/${desk}-listing-approvals`, "All List Approvals", ShieldCheck, publishing, "Approved and rejected listings, and those still waiting", { key: "deskApprovals", desk });
  /* A desk that publishes what it writes answers its own request; the others wait on their reviewer. */
  const ownDrafts = tool(`/${desk}-draft`, "Drafts", FilePenLine, listingAccess,
    DESKS[desk].desk === "STAFF" ? "Your drafts, to publish or send for review" : `Your drafts waiting for ${reviewer} review`,
    { key: DESKS[desk].desk === "STAFF" ? "deskStaffDrafts" : "deskOwnDrafts", desk });
  return {
    title: `${name} Management`,
    key: "desk",
    desk,
    items: submitterOnly
      ? [ownDrafts, requests, approvals]
      : [requests, approvals, tool(`/${desk}-draft`, `${name} Drafts`, FilePenLine, listingAccess, `Unpublished ${name.toLowerCase()} destinations`, { key: "deskReviewDrafts", desk })],
  };
}

/* People first, then who may do what, then the record of what they did, then the settings. */
const administration: NavGroup = {
  title: "Administration",
  key: "administration",
  items: [
    tool("/users", "Users", Users, ["PERM_USER_MANAGE"], "Customers who registered on the public site", { key: "users" }),
    { ...tool("/roles", "Roles & Permissions", ShieldCheck, ["PERM_ROLE_ASSIGN"], "Partner, contributor, editor, BDO, and administrator accounts", { key: "roles" }), aliases: ["/people"] },
    { ...tool("/audit-logs", "Audit Logs", FileClock, ["PERM_AUDIT_VIEW"], "A record of changes across your CMS", { key: "auditLogs" }), aliases: ["/audit"] },
    tool("/settings", "Settings", Settings, ["PERM_FULL_CONTROL"], "Workspace preferences and catalog configuration", { key: "settings" }),
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
  EDITOR: [catalogueContent, taxonomy, management("contributor"), management("editor", true)],
  BDO: [catalogueContent, taxonomy, management("partner"), management("bdo", true)],
  ADMIN: [
    catalogueContent, taxonomy,
    management("partner"), management("contributor"), management("editor"), management("bdo"),
    administration,
  ],
};

/*
 * Every group's entries in the order the work is done — the main list and its
 * Create first, the queues next, what is set up once last — not A to Z.
 */
export const roleNavigation: Readonly<Record<BusinessRole, readonly NavGroup[]>> = ROLE_GROUPS;

/*
 * Existing bookmarks remain reachable without adding extra sidebar items.
 * Create Destination and Drafts left the sidebar on 2026-10-09: creating is
 * the button on All Destinations, and drafts are its status filter.
 */
export const legacyNavigation: readonly NavGroup[] = [{ title: "Workspace", key: "workspace", items: [
  createDestination,
  tool("/drafts", "Drafts", FilePenLine, listingAccess, "Destinations that have not been published", { key: "drafts" }),
  tool("/publish-requests", "Publish Requests", ClipboardCheck, publishing, "Review submissions and track publication", { key: "publishRequests" }),
  tool("/reviews", "Reviews", MessageSquare, ["PERM_REVIEW_MODERATE"], "Moderate traveler feedback", { key: "reviews" }),
  tool("/partner-listings", "Partner Listings", Store, ["PERM_PARTNER_PUBLISH_APPROVE", "PERM_LISTING_EDIT_OWN"], "Listings submitted by travel partners", { key: "partnerListings" }),
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
  return groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title, navGroup: group })))
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isNavigationActive(item, pathname));
}
