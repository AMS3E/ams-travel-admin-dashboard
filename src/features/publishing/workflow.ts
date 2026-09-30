import { hasPermission, primaryRole, reviewsDesk } from "@/features/auth/permissions";
import { isAwaitingDecision, lastActivityOf, type PublishDesk, type PublishRequestResponse, type RequesterRole } from "./api/contracts";
import type { ListingRow } from "./listings";

export const PUBLISH_REQUEST_POLL_INTERVAL = 15_000;

/**
 * The desk this account's submissions land on, mirroring how the API derives
 * it from the requester's roles, highest first: an editor's or a BDO's own
 * content goes to the staff desk (an administrator), a contributor's draft to
 * an editor, a partner's listing to a BDO. A token that names no business role
 * falls back to the grants that imply one.
 */
export function submissionDesk(grants: readonly string[]): PublishDesk | null {
  if (!hasPermission(grants, "PERM_PUBLISH_REQUEST_SUBMIT")) return null;
  if (grants.includes("EDITOR") || grants.includes("BDO")) return "STAFF";
  if (grants.includes("CONTRIBUTOR")) return "CONTRIBUTOR";
  if (grants.includes("PARTNER")) return "PARTNER";
  if (!grants.includes("PERM_FULL_CONTROL")) {
    if (
      grants.includes("PERM_PARTNER_PUBLISH_APPROVE") ||
      grants.includes("PERM_CONTRIBUTOR_PUBLISH_APPROVE")
    ) {
      return "STAFF";
    }
  }
  if (grants.includes("PERM_LISTING_EDIT_OWN")) return "PARTNER";
  if (hasPermission(grants, "PERM_DESTINATION_DRAFT_EDIT_OWN")) return "CONTRIBUTOR";
  return null;
}

/**
 * Where this account answers requests: a BDO on Partner Requests, an editor on
 * Contributor Requests, an administrator on every desk's at once. Null for a
 * role that only submits.
 */
/** An editor's or a BDO's own listing goes to the Admin desk; an administrator's goes nowhere. */
export function sendsOwnToAdmin(grants: readonly string[]): boolean {
  return !grants.includes("PERM_FULL_CONTROL") && submissionDesk(grants) === "STAFF";
}

export function reviewQueueHref(grants: readonly string[]): string | null {
  switch (primaryRole(grants)) {
    case "ADMIN": return "/publish-requests";
    case "BDO": return "/partner-requests";
    case "EDITOR": return "/contributor-requests";
    default: return null;
  }
}

/** Whose own requests an editor's or a BDO's desk pages list: the STAFF desk holds both. */
export const STAFF_PAGES: Readonly<Partial<Record<string, RequesterRole>>> = { editor: "EDITOR", bdo: "BDO" };

/**
 * The desk page a request is listed on, whichever side opens it: a partner's
 * under Partner Management, a contributor's under Contributor Management, and
 * an editor's or a BDO's own under their role's — never a page of another desk.
 */
export function requestPageOf(request: Pick<PublishRequestResponse, "desk" | "requestedByRole">): string {
  switch (request.desk) {
    case "PARTNER": return "/partner-requests";
    case "CONTRIBUTOR": return "/contributor-requests";
    default:
      return request.requestedByRole === "EDITOR" ? "/editor-requests"
        : request.requestedByRole === "BDO" ? "/bdo-requests"
          : "/publish-requests";
  }
}

/**
 * Whether this account answers this request: the desk it was sent to, or its
 * own author when they publish anyway — an editor and a BDO put a listing live
 * themselves, so their own submission waits on nobody. Sending one back or
 * rejecting it stays with the administrator; withdrawing it is the author's.
 */
export function decidesRequest(
  grants: readonly string[],
  request: Pick<PublishRequestResponse, "desk" | "requestedBy" | "status">,
  userId: string | null,
): boolean {
  if (!isAwaitingDecision(request)) return false;
  if (reviewsDesk(grants, request.desk)) return true;
  return userId !== null && request.requestedBy === userId && hasPermission(grants, "PERM_DESTINATION_PUBLISH");
}

/** Where one request is reviewed, beside the listing it puts forward: `/partner-requests/{id}`. */
export function reviewPageOf(request: Pick<PublishRequestResponse, "id" | "desk" | "requestedByRole">): string {
  return `${requestPageOf(request)}/${request.id}`;
}

/** Where a role tracks the requests it submits. */
export function publishingHref(grants: readonly string[]): string {
  switch (primaryRole(grants)) {
    case "PARTNER": return "/partner-requests";
    case "CONTRIBUTOR": return "/contributor-requests";
    case "BDO": return "/bdo-requests";
    case "EDITOR": return "/editor-requests";
    default: return "/publish-requests";
  }
}

function createdAt(listing: Pick<ListingRow, "createdAt">): number {
  const parsed = listing.createdAt ? Date.parse(listing.createdAt) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * The account's own listings — attractions, stays, food listings — that can go
 * to a reviewer: not live, and not already waiting on one. Newest first — ids
 * are UUIDs, so the creation time is the clock.
 */
export function submittableListings(
  listings: readonly ListingRow[],
  requests: readonly Pick<PublishRequestResponse, "targetId" | "status">[],
  userId: string | null,
): ListingRow[] {
  if (userId === null) return [];
  const pendingIds = new Set(requests.filter(isAwaitingDecision).map((item) => item.targetId));
  return listings
    .filter((item) => item.authors.includes(userId) && item.status !== "PUBLISHED" && !pendingIds.has(item.id))
    .toSorted((a, b) => createdAt(b) - createdAt(a));
}

/* -------------------------------------------------------------------------- */
/* What has been looked at                                                    */
/* -------------------------------------------------------------------------- */

/**
 * When a request last did something worth being told about — `lastActivityOf`,
 * as a number to compare. A resubmission after a round of changes keeps the id
 * but moves this on, so it counts as new again.
 */
export type RequestMoment = Pick<PublishRequestResponse, "requestedAt" | "reviewedAt">;

function activityAt(request: RequestMoment): number {
  const at = Date.parse(lastActivityOf(request));
  return Number.isNaN(at) ? 0 : at;
}

/**
 * The requests that have moved since this browser last looked at the queue.
 *
 * `undefined` is "not known yet" — the mark is read from the browser after the
 * first render, and counting before it is read would flash a badge that is
 * about to clear. `null` is "never looked", when everything counts as new.
 */
export function unseenRequests<T extends RequestMoment>(
  requests: readonly T[],
  seenAt: string | null | undefined,
): readonly T[] {
  if (seenAt === undefined) return [];
  const mark = seenAt === null ? null : Date.parse(seenAt);
  if (mark !== null && Number.isNaN(mark)) return requests;
  return requests.filter((request) => mark === null || activityAt(request) > mark);
}

/**
 * The mark to keep once these have been looked at: the newest moment among
 * them. Nothing to look at leaves the mark where it was.
 */
export function seenMark(requests: readonly RequestMoment[]): string | null {
  const newest = requests.reduce((latest, request) => Math.max(latest, activityAt(request)), 0);
  return newest > 0 ? new Date(newest).toISOString() : null;
}
