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

export interface Capability {
  readonly key: CapabilityKey;
  readonly label: string;
  readonly detail: string;
  readonly granted: boolean;
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

  return [
    {
      key: "create",
      label: "Create destinations",
      detail: "Start new places as drafts. They stay off the public site until approved.",
      granted: canCreateResource(grants, "destinations"),
    },
    {
      key: "edit",
      label: editsAny ? "Edit any destination" : "Edit your own destinations",
      detail: editsAny
        ? "Correct and update every destination in the catalogue."
        : "Keep the destinations you created up to date.",
      granted: editsAny || editsOwn,
    },
    {
      key: "publish",
      label: publishes && unpublishes
        ? "Publish and unpublish"
        : unpublishes ? "Take destinations offline" : "Publish destinations",
      detail: "Change what travellers can see on the public site.",
      granted: publishes || unpublishes,
    },
    {
      key: "approve-partners",
      label: "Approve partner listings",
      detail: "Answer publishing requests from partners.",
      granted: has("PERM_PARTNER_PUBLISH_APPROVE"),
    },
    {
      key: "approve-contributors",
      label: "Approve contributor drafts",
      detail: "Answer publishing requests from contributors.",
      granted: has("PERM_CONTRIBUTOR_PUBLISH_APPROVE"),
    },
    {
      key: "approve-staff",
      label: "Approve editor and BDO content",
      detail: "Decide on what the reviewing desks write themselves.",
      granted: fullControl,
    },
    {
      key: "verify",
      label: "Verify destinations",
      detail: "Verify any destination on evidence — an invoice or a licence — and renew or revoke it.",
      granted: canVerifyDestinations(grants),
    },
    {
      key: "listings",
      label: editsAny
        ? "Manage stays and food listings"
        : grants.includes("PARTNER")
          ? "Manage your business's stays and food"
          : "Write your own stays and food listings",
      detail: editsAny
        ? "List, correct and publish the stays and food near every destination."
        : grants.includes("PARTNER")
          ? "Keep the stays and food listings your partner runs up to date."
          : "List stays and places to eat, and send them to an editor to publish.",
      granted: editsAny || has("PERM_LISTING_EDIT_OWN"),
    },
    {
      key: "corridors",
      label: "Curate corridors",
      detail: "Build routes between destinations.",
      granted: has("PERM_CORRIDOR_CURATE"),
    },
    {
      key: "taxonomy",
      label: "Manage regions and taxonomy",
      detail: "Tourism regions, provinces, interests, categories and tags, and amenities.",
      granted: has("PERM_TAXONOMY_MANAGE"),
    },
    {
      key: "reviews",
      label: "Moderate reviews",
      detail: "Hide or restore what travellers write.",
      granted: has("PERM_REVIEW_MODERATE"),
    },
    {
      key: "media",
      label: "Upload media",
      detail: "Add photos to destinations, stays and food listings.",
      granted: has("PERM_MEDIA_UPLOAD"),
    },
    {
      key: "people",
      label: "Manage people and roles",
      detail: "Create back-office accounts and assign roles.",
      granted: has("PERM_USER_MANAGE") || has("PERM_ROLE_ASSIGN"),
    },
    {
      key: "audit",
      label: "Read the audit log",
      detail: "See who changed what, and when.",
      granted: has("PERM_AUDIT_VIEW"),
    },
  ];
}

export interface Workspace {
  readonly role: BusinessRole | null;
  readonly fullControl: boolean;
  /** The desks whose requests this account decides, as the screens name them. */
  readonly reviews: readonly string[];
  /** Who decides what this account submits — "a BDO", "an editor" — or null when nobody else does. */
  readonly submitsTo: string | null;
  /** Every `PERM_` grant on the token, sorted, for support conversations. */
  readonly permissions: readonly string[];
}

export function workspaceOf(grants: readonly string[]): Workspace {
  const fullControl = grants.includes("PERM_FULL_CONTROL");
  const desk = fullControl ? null : submissionDesk(grants);
  return {
    role: primaryRole(grants),
    fullControl,
    reviews: PUBLISH_DESKS.filter((each) => reviewsDesk(grants, each)).map((each) => DESK_LABELS[each]),
    submitsTo: desk ? DESK_REVIEWERS[desk] : null,
    permissions: grants.filter((grant) => grant.startsWith("PERM_")).sort(),
  };
}
