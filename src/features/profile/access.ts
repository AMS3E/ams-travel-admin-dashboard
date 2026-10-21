import english from "@locales/en/profile.json";
import {
  canCreateResource,
  canVerifyDestinations,
  hasPermission,
  primaryRole,
  reviewsDesk,
  type BusinessRole,
} from "@/features/auth/permissions";
import {
  DESK_LABELS,
  DESK_REVIEWERS,
  PUBLISH_DESKS,
  type PublishDesk,
} from "@/features/publishing/api/contracts";
import { submissionDesk } from "@/features/publishing/workflow";

export const ROLE_LABELS: Readonly<Record<BusinessRole, string>> = {
  ADMIN: "Administrator",
  EDITOR: "Editor",
  BDO: "Business development",
  CONTRIBUTOR: "Contributor",
  PARTNER: "Partner",
};

export type CapabilityKey =
  | "create"
  | "edit"
  | "publish"
  | "approve-partners"
  | "approve-contributors"
  | "approve-staff"
  | "verify"
  | "listings"
  | "corridors"
  | "taxonomy"
  | "reviews"
  | "media"
  | "people"
  | "audit";

/** Which wording a capability takes: its key under `profile.capabilities.items`. */
export type CapabilityText = keyof typeof english.capabilities.items;

export interface Capability {
  readonly key: CapabilityKey;
  readonly text: CapabilityText;
  /** English, as `text` reads in `profile.capabilities.items`. */
  readonly label: string;
  readonly detail: string;
  readonly granted: boolean;
}

function capability(key: CapabilityKey, text: CapabilityText, granted: boolean): Capability {
  const { label, detail } = english.capabilities.items[text];
  return { key, text, label, detail, granted };
}

/**
 * What this account can do, in the words of the screens rather than the realm.
 *
 * Every entry is decided by the same helpers the screens use to offer a
 * control, so the profile cannot promise something a button then refuses.
 * Where one grant has two scopes — editing anything or only your own, publishing
 * or only taking down — the label says which one this account holds.
 */
export function capabilitiesOf(grants: readonly string[]): Capability[] {
  const has = (permission: string) => hasPermission(grants, permission);
  const editsAny = has("PERM_DESTINATION_EDIT_ANY");
  const editsOwn = has("PERM_LISTING_EDIT_OWN") || has("PERM_DESTINATION_DRAFT_EDIT_OWN");
  const publishes = has("PERM_DESTINATION_PUBLISH");
  const unpublishes = has("PERM_DESTINATION_UNPUBLISH");
  const fullControl = grants.includes("PERM_FULL_CONTROL");

  const partner = grants.includes("PARTNER");

  return [
    capability("create", "create", canCreateResource(grants, "destinations")),
    capability("edit", editsAny ? "editAny" : "editOwn", editsAny || editsOwn),
    capability(
      "publish",
      publishes && unpublishes ? "publishBoth" : unpublishes ? "unpublish" : "publish",
      publishes || unpublishes,
    ),
    capability("approve-partners", "approvePartners", has("PERM_PARTNER_PUBLISH_APPROVE")),
    capability("approve-contributors", "approveContributors", has("PERM_CONTRIBUTOR_PUBLISH_APPROVE")),
    capability("approve-staff", "approveStaff", fullControl),
    capability("verify", "verify", canVerifyDestinations(grants)),
    capability(
      "listings",
      editsAny ? "listingsAny" : partner ? "listingsPartner" : "listingsOwn",
      editsAny || has("PERM_LISTING_EDIT_OWN"),
    ),
    capability("corridors", "corridors", has("PERM_CORRIDOR_CURATE")),
    capability("taxonomy", "taxonomy", has("PERM_TAXONOMY_MANAGE")),
    capability("reviews", "reviews", has("PERM_REVIEW_MODERATE")),
    capability("media", "media", has("PERM_MEDIA_UPLOAD")),
    capability("people", "people", has("PERM_USER_MANAGE") || has("PERM_ROLE_ASSIGN")),
    capability("audit", "audit", has("PERM_AUDIT_VIEW")),
  ];
}

export interface Workspace {
  readonly role: BusinessRole | null;
  readonly fullControl: boolean;
  /** The desks whose requests this account decides. */
  readonly reviewDesks: readonly PublishDesk[];
  /** The desk this account submits to, or null when nobody else decides. */
  readonly submitDesk: PublishDesk | null;
  /** The desks whose requests this account decides, as the screens name them (English). */
  readonly reviews: readonly string[];
  /** Who decides what this account submits — "a BDO", "an editor" — or null when nobody else does (English). */
  readonly submitsTo: string | null;
  /** Every `PERM_` grant on the token, sorted, for support conversations. */
  readonly permissions: readonly string[];
}

export function workspaceOf(grants: readonly string[]): Workspace {
  const fullControl = grants.includes("PERM_FULL_CONTROL");
  const desk = fullControl ? null : submissionDesk(grants);
  const reviewDesks = PUBLISH_DESKS.filter((each) => reviewsDesk(grants, each));
  return {
    role: primaryRole(grants),
    fullControl,
    reviewDesks,
    submitDesk: desk,
    reviews: reviewDesks.map((each) => DESK_LABELS[each]),
    submitsTo: desk ? DESK_REVIEWERS[desk] : null,
    permissions: grants.filter((grant) => grant.startsWith("PERM_")).sort(),
  };
}
