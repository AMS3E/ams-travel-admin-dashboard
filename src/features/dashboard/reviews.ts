import type { ReviewResponse, ReviewStatus, ReviewTarget, ReviewVisitType } from "@/features/dashboard/api/contracts";

/** What a review is about, as a row names it. */
export const REVIEW_TARGET_LABELS: Readonly<Record<ReviewTarget, string>> = {
  DESTINATION: "Destination",
  FOOD: "Food listing",
  STAY: "Stay",
  CORRIDOR: "Corridor",
};

/** The catalogue list each kind of target lives in. */
export const REVIEW_TARGET_RESOURCES = {
  DESTINATION: "destinations",
  FOOD: "foods",
  STAY: "stays",
  CORRIDOR: "corridors",
} as const satisfies Record<ReviewTarget, string>;

export const REVIEW_VISIT_LABELS: Readonly<Record<ReviewVisitType, string>> = {
  BUSINESS: "Business",
  COUPLES: "Couple",
  FAMILY: "Family",
  FRIENDS: "Friends",
  SOLO: "Solo",
};

/** "Family visit · August 2026", or whichever half the author gave; empty when neither. */
export function visitLine(review: Pick<ReviewResponse, "visitType" | "visitedOn">): string {
  const who = review.visitType ? `${REVIEW_VISIT_LABELS[review.visitType]} visit` : "";
  const when = review.visitedOn && /^\d{4}-\d{2}$/.test(review.visitedOn)
    ? new Date(Number(review.visitedOn.slice(0, 4)), Number(review.visitedOn.slice(5, 7)) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "";
  return [who, when].filter(Boolean).join(" · ");
}

export const REVIEW_STATUS_LABELS: Readonly<Record<ReviewStatus, string>> = {
  VISIBLE: "Visible",
  HIDDEN: "Hidden",
};
