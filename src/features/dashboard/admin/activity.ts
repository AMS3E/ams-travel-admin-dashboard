import type { AuditLogResponse, ReviewResponse } from "@/features/dashboard/api/contracts";
import type { ActivityPoint } from "@/features/dashboard/admin/activity-chart";
import type { RatingBucket } from "@/features/dashboard/admin/rating-bars";

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const DAY = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

/** Local calendar day, which is the day an administrator means by "Tuesday". */
function dayKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

/**
 * Writes per day across a fixed window ending today.
 *
 * Built from the audit entries already on the screen rather than from a second
 * query: the API caps the feed at 200 rows, so a busy week is a floor on the
 * earliest bars, not a count — which is why the panel says what it is plotting.
 * Days with nothing in them stay in the series as zero; dropping them would
 * turn a quiet Sunday into a shorter week.
 */
export function writesPerDay(
  entries: readonly AuditLogResponse[],
  days = 7,
): readonly ActivityPoint[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const at = new Date(entry.createdAt);
    if (Number.isNaN(at.valueOf())) continue;
    const key = dayKey(at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return {
      day: WEEKDAY.format(date),
      date: DAY.format(date),
      writes: counts.get(dayKey(date)) ?? 0,
    };
  });
}

export function busiestDay(
  points: readonly ActivityPoint[],
): ActivityPoint | null {
  if (!points.length) return null;
  return points.reduce((best, point) => (point.writes > best.writes ? point : best));
}

/** Visible reviews only: a hidden review counts towards no rating and shows nowhere. */
export function ratingBuckets(
  reviews: readonly ReviewResponse[],
): readonly RatingBucket[] {
  const counts = new Map<number, number>();
  for (const review of reviews) {
    if (review.status !== "VISIBLE") continue;
    counts.set(review.rating, (counts.get(review.rating) ?? 0) + 1);
  }
  return [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: counts.get(rating) ?? 0,
  }));
}
