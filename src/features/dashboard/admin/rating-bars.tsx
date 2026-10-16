import { useTranslations } from "next-intl";

export interface RatingBucket {
  readonly rating: number;
  readonly count: number;
}

/**
 * Ratings, one row per star.
 *
 * Not a donut: five ordered buckets whose values sit close together is exactly
 * what a ring is worst at, and the numbers here are the point. Plain rows with
 * the count written at the end need no axis, no legend, and no hover — every
 * value is already on the screen.
 */
export function RatingBars({ buckets }: { readonly buckets: readonly RatingBucket[] }) {
  const t = useTranslations("stats.activity");
  const highest = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  if (!total) {
    return (
      <p className="inset-row px-3 py-6 text-center text-sm text-muted">
        {t("noVisibleReviews")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {[...buckets]
        .sort((a, b) => b.rating - a.rating)
        .map((bucket) => (
          <li className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-3" key={bucket.rating}>
            <span className="text-xs font-semibold text-ink-soft tabular-nums">
              {bucket.rating} ★
            </span>
            {/* The track is the same ramp as the fill, one step lighter. */}
            <span className="h-2 overflow-hidden rounded-sm bg-shell">
              <span
                className="block h-full rounded-sm bg-teal"
                style={{ width: `${Math.round((bucket.count / highest) * 100)}%` }}
              />
            </span>
            <span className="text-right text-xs text-muted tabular-nums">
              {bucket.count}
            </span>
          </li>
        ))}
    </ul>
  );
}
