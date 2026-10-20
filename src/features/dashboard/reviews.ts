import { useCallback } from "react";
import { useMessages, useTranslations } from "next-intl";
import type { DateWords } from "@/i18n/dates";
import type { ReviewResponse, ReviewTarget } from "@/features/dashboard/api/contracts";

/*
 * How a review's target, visit type and status read is in `stats.review`
 * (target, visit, visible/hidden), in each language.
 */

/** The catalogue list each kind of target lives in. */
export const REVIEW_TARGET_RESOURCES = {
  DESTINATION: "destinations",
  FOOD: "foods",
  STAY: "stays",
  CORRIDOR: "corridors",
} as const satisfies Record<ReviewTarget, string>;

/** "Family visit · August 2026", or whichever half the author gave; empty when neither. */
export function useVisitLine(): (review: Pick<ReviewResponse, "visitType" | "visitedOn">) => string {
  const t = useTranslations("stats.review");
  const months = (useMessages().common.dates as DateWords).months;
  return useCallback(
    (review) => {
      const who = review.visitType ? t(`visit.${review.visitType}`) : "";
      const month = review.visitedOn && /^\d{4}-\d{2}$/.test(review.visitedOn) ? months[Number(review.visitedOn.slice(5, 7)) - 1] : undefined;
      const when = month && review.visitedOn ? t("visitMonth", { month, year: review.visitedOn.slice(0, 4) }) : "";
      return [who, when].filter(Boolean).join(" · ");
    },
    [t, months],
  );
}
