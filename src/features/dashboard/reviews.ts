import type { ReviewStatus, ReviewTarget } from "@/features/dashboard/api/contracts";

/** What a review is about, as a row names it. */
export const REVIEW_TARGET_LABELS: Readonly<Record<ReviewTarget, string>> = {
  DESTINATION: "Destination",
  FOOD: "Food listing",
  STAY: "Stay",
};

/** The catalogue list each kind of target lives in. */
export const REVIEW_TARGET_RESOURCES = {
  DESTINATION: "destinations",
  FOOD: "foods",
  STAY: "stays",
} as const satisfies Record<ReviewTarget, string>;

export const REVIEW_STATUS_LABELS: Readonly<Record<ReviewStatus, string>> = {
  VISIBLE: "Visible",
  HIDDEN: "Hidden",
};
