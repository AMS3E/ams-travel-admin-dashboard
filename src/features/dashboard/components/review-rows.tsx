import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { DestinationResponse } from "@/features/catalog/api/contracts";
import {
  EmptyRow,
  EntityRow,
  RowList,
} from "@/features/dashboard/components/entity-row";
import { REVIEW_TARGET_LABELS } from "@/features/dashboard/reviews";
import type { ReviewResponse } from "@/features/dashboard/api/contracts";
import { formatDateTime } from "@/features/dashboard/format";

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
  if (!reviews.length) return <EmptyRow>{empty}</EmptyRow>;

  const names = new Map(destinations.map((row) => [row.id, row.name]));

  return (
    <RowList>
      {reviews.slice(0, limit).map((review) => (
        <EntityRow
          badges={
            review.status === "VISIBLE" ? (
              <Badge tone="neutral">{review.rating} ★</Badge>
            ) : (
              <Badge tone="inactive">Hidden</Badge>
            )
          }
          key={review.id}
          subtitle={`${review.authorName ?? "Unknown author"} on ${
            (review.targetType === "DESTINATION" ? names.get(review.targetId) : undefined) ??
            `a ${REVIEW_TARGET_LABELS[review.targetType].toLowerCase()}`
          }`}
          title={review.title?.trim() || review.content?.trim() || "Untitled review"}
          trailing={
            actions ? (
              actions(review)
            ) : (
              formatDateTime(review.createdAt)
            )
          }
        />
      ))}
    </RowList>
  );
}
