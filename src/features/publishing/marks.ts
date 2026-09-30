import { isAwaitingDecision, lastActivityOf, type PublishRequestResponse, type PublishRequestStatus } from "./api/contracts";
import { decidesRequest, reviewPageOf } from "./workflow";

/**
 * Where a listing stands with its reviewer, as a list of listings shows it:
 * beside its name, and — when it waits on the viewer — as Review in place of
 * publishing it straight away, so a partner's request is answered rather than
 * left open under a listing already live.
 */
export interface ReviewMark {
  readonly listingId: string;
  readonly requestId: string;
  /** Only an open request marks a listing: waiting, or sent back to its author. */
  readonly status: Extract<PublishRequestStatus, "PENDING_REVIEW" | "DRAFT">;
  /** Where the request is read in full, beside the listing. */
  readonly reviewHref: string;
  /** Waiting on the viewer's own decision. */
  readonly yours: boolean;
}

/**
 * Each listing's latest request, where it is still open, from the viewer's
 * queue and their own submissions together.
 */
export function reviewMarks(
  requests: readonly PublishRequestResponse[],
  grants: readonly string[],
  /** Whose view this is: an editor's and a BDO's own submission waits on them, not on an administrator. */
  userId: string | null = null,
): ReviewMark[] {
  const latest = new Map<string, PublishRequestResponse>();
  for (const request of requests) {
    const current = latest.get(request.targetId);
    if (!current || Date.parse(lastActivityOf(request)) > Date.parse(lastActivityOf(current))) {
      latest.set(request.targetId, request);
    }
  }
  return [...latest.values()].flatMap((request): ReviewMark[] =>
    isAwaitingDecision(request) || request.status === "DRAFT"
      ? [{
          listingId: request.targetId,
          requestId: request.id,
          status: request.status === "DRAFT" ? "DRAFT" : "PENDING_REVIEW",
          reviewHref: reviewPageOf(request),
          yours: decidesRequest(grants, request, userId),
        }]
      : [],
  );
}

/** Who put a listing on the website, from the request they approved. */
export interface ApprovalMark {
  readonly listingId: string;
  /** The reviewer's name, or what to show when the account is gone. */
  readonly by: string;
  readonly at: string;
}

/**
 * Each listing's approval, where it has one: an attraction, a stay or a food
 * listing that went through a desk says who answered it. One published by the
 * desk itself, without a request, has none — nobody approved it but its author.
 */
export function approvalMarks(requests: readonly PublishRequestResponse[]): ApprovalMark[] {
  const latest = new Map<string, PublishRequestResponse>();
  for (const request of requests) {
    if (request.status !== "PUBLISHED" || !request.reviewedAt) continue;
    const current = latest.get(request.targetId);
    if (!current || Date.parse(request.reviewedAt) > Date.parse(current.reviewedAt ?? "")) {
      latest.set(request.targetId, request);
    }
  }
  return [...latest.values()].map((request) => ({
    listingId: request.targetId,
    by: request.reviewerName ?? "A reviewer",
    at: request.reviewedAt ?? request.requestedAt,
  }));
}

/** A listing's form — opened for a review when that review waits on the viewer, so saving comes back to it. */
export function editHrefOf(listingHref: string, mark: ReviewMark | undefined): string {
  return mark?.yours ? `${listingHref}?review=${mark.requestId}` : listingHref;
}

/** How a mark reads, and its colour. */
export const MARK_LABELS: Readonly<Record<ReviewMark["status"], string>> = {
  PENDING_REVIEW: "Pending review",
  DRAFT: "Changes requested",
};
