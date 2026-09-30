import type { BadgeTone } from "@/components/ui/badge";
/**
 * `/publish-requests` — the workflow between the desk that writes a
 * listing — an attraction, a stay or a food listing — and the desk that decides
 * whether it goes public.
 *
 * The API derives the desk from the requester's roles when it reads a request:
 * a partner's listing goes to the PARTNER desk (a BDO decides it), a
 * contributor's draft to the CONTRIBUTOR desk (an editor decides it), and an
 * editor's or a BDO's own content to the STAFF desk (an administrator decides
 * it).
 */
export type PublishDesk = "PARTNER" | "CONTRIBUTOR" | "STAFF";

/**
 * The requester's highest back-office role. An editor's and a BDO's requests
 * share the STAFF desk but are listed on their own role's pages.
 */
export type RequesterRole = "ADMIN" | "EDITOR" | "BDO" | "CONTRIBUTOR" | "PARTNER";

/** What a request puts forward. */
export type ListingType = "DESTINATION" | "STAY" | "FOOD";

/** The catalogue table each kind of listing is kept in, and so its pages' path. */
export const LISTING_RESOURCES = {
  DESTINATION: "destinations",
  STAY: "stays",
  FOOD: "foods",
} as const satisfies Record<ListingType, string>;

export type ListingResource = (typeof LISTING_RESOURCES)[ListingType];

/** A listing's kind, from the table it is kept in; null for a table that is never put forward. */
export function listingTypeOf(resource: string): ListingType | null {
  const found = (Object.entries(LISTING_RESOURCES) as [ListingType, string][]).find(([, table]) => table === resource);
  return found ? found[0] : null;
}

/** How each kind reads in a sentence. */
export const LISTING_NOUNS: Readonly<Record<ListingType, string>> = {
  DESTINATION: "attraction",
  STAY: "stay",
  FOOD: "food listing",
};

/** Where the listing a request puts forward is opened in the dashboard. */
export function listingHref(request: Pick<PublishRequestResponse, "targetType" | "targetId">): string {
  return `/${LISTING_RESOURCES[request.targetType]}/${request.targetId}`;
}

export const PUBLISH_DESKS: readonly PublishDesk[] = ["PARTNER", "CONTRIBUTOR", "STAFF"];

/** How each desk's submissions read in a row. */
export const DESK_LABELS: Readonly<Record<PublishDesk, string>> = {
  PARTNER: "Partner listing",
  CONTRIBUTOR: "Contributor draft",
  STAFF: "Staff content",
};

/** The same, for a sentence about several. */
export const DESK_PLURAL_LABELS: Readonly<Record<PublishDesk, string>> = {
  PARTNER: "Partner listings",
  CONTRIBUTOR: "Contributor drafts",
  STAFF: "Editor and BDO submissions",
};

/** Who decides each desk, as a submitter is told. */
export const DESK_REVIEWERS: Readonly<Record<PublishDesk, string>> = {
  PARTNER: "a BDO",
  CONTRIBUTOR: "an editor",
  STAFF: "an administrator",
};

/** DRAFT is a request sent back to its author; sending it again reuses the row. */
export type PublishRequestStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "UNPUBLISHED";

export interface PublishRequestResponse {
  readonly id: string;
  /** What is put forward: an attraction, a stay or a food listing. */
  readonly targetType: ListingType;
  readonly targetId: string;
  readonly targetName: string;
  readonly requestedBy: string;
  readonly requestedByName: string | null;
  /** Which desk page lists it; null when the requester holds no back-office role. */
  readonly requestedByRole: RequesterRole | null;
  /** Which desk decides: a BDO answers a partner, an editor a contributor, an administrator the staff. */
  readonly desk: PublishDesk;
  readonly status: PublishRequestStatus;
  readonly reviewerId: string | null;
  readonly reviewerName: string | null;
  /** Why it was decided as it was. Always present on a rejection or a request for changes. */
  readonly reviewNote: string | null;
  readonly requestedAt: string;
  readonly reviewedAt: string | null;
  readonly publishedAt: string | null;
  readonly unpublishedAt: string | null;
}

/** How each status reads in a row, where the bare enum name would not. */
export const REQUEST_LABELS: Readonly<Record<PublishRequestStatus, string>> = {
  DRAFT: "Changes requested",
  PENDING_REVIEW: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PUBLISHED: "Published",
  UNPUBLISHED: "Unpublished",
};

export const REQUEST_TONES: Readonly<Record<PublishRequestStatus, BadgeTone>> = {
  DRAFT: "warning",
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PUBLISHED: "success",
  UNPUBLISHED: "neutral",
};

/** Waiting on a reviewer: not decided yet, or approved and not yet live. */
export function isAwaitingDecision(request: Pick<PublishRequestResponse, "status">): boolean {
  return request.status === "PENDING_REVIEW" || request.status === "APPROVED";
}

/** A request that still wants an answer from somebody. */
export function isOpenRequest(request: Pick<PublishRequestResponse, "status">): boolean {
  return isAwaitingDecision(request) || request.status === "DRAFT";
}

/** The last time anything happened to a request: its decision, or its submission. */
export function lastActivityOf(
  request: Pick<PublishRequestResponse, "requestedAt" | "reviewedAt">,
): string {
  const requested = Date.parse(request.requestedAt);
  const reviewed = request.reviewedAt ? Date.parse(request.reviewedAt) : Number.NaN;
  return !Number.isNaN(reviewed) && (Number.isNaN(requested) || reviewed > requested)
    ? (request.reviewedAt as string)
    : request.requestedAt;
}
