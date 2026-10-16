import type { ReactNode } from "react";
import { useMessages, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { DestinationResponse } from "@/features/catalog/api/contracts";
import {
  EmptyRow,
  EntityRow,
  RowList,
} from "@/features/dashboard/components/entity-row";
import { useVisitLine } from "@/features/dashboard/reviews";
import type { ReviewResponse } from "@/features/dashboard/api/contracts";
import { dateTimeOf, type DateWords } from "@/i18n/dates";

interface ReviewRowsProps {
  readonly reviews: readonly ReviewResponse[];
  readonly destinations: readonly DestinationResponse[];
  readonly empty: string;
  readonly limit?: number;
  /** Moderation controls, for the role that may act on the row. */
  readonly actions?: (review: ReviewResponse) => ReactNode;
}

/**
 * Reviews are not a catalogue resource, so the rows lead nowhere — there is no
 * review form to open. What a moderator needs is on the row itself: who wrote
 * it, about what, and whether it is currently public.
 */
export function ReviewRows({
  reviews,
  destinations,
  empty,
  limit = 5,
  actions,
}: ReviewRowsProps) {
  const t = useTranslations("stats");
  const dates = useMessages().common.dates as DateWords;
  const visitLine = useVisitLine();
  if (!reviews.length) return <EmptyRow>{empty}</EmptyRow>;

  const names = new Map(destinations.map((row) => [row.id, row.name]));

  return (
    <RowList>
      {reviews.slice(0, limit).map((review) => {
        const visit = visitLine(review);
        const target =
          (review.targetType === "DESTINATION" ? names.get(review.targetId) : undefined) ??
          t("reviewRows.aTarget", { type: review.targetType });
        return (
          <EntityRow
            badges={
              review.status === "VISIBLE" ? (
                <Badge tone="neutral">{review.rating} ★</Badge>
              ) : (
                <Badge tone="inactive">{t("review.hidden")}</Badge>
              )
            }
            key={review.id}
            subtitle={`${t("reviewRows.on", { author: review.authorName ?? t("reviewRows.unknownAuthor"), target })}${visit ? ` · ${visit}` : ""}`}
            title={review.title?.trim() || review.content?.trim() || t("reviewRows.untitled")}
            trailing={actions ? actions(review) : dateTimeOf(review.createdAt, dates)}
          />
        );
      })}
    </RowList>
  );
}
