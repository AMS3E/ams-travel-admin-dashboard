import type { ListingRow } from "@/features/publishing/listings";
import type { PublishRequestResponse } from "@/features/publishing/api/contracts";

function timeOf(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Each listing — attraction, stay or food listing — counted once, by its own
 * status and the latest request made for it. Ids are UUIDs and carry no order, so "latest" is the request
 * submitted last.
 */
export function contentSummary(
  listings: readonly Pick<ListingRow, "id" | "status">[],
  requests: readonly Pick<PublishRequestResponse, "targetId" | "status" | "requestedAt">[],
) {
  const latest = new Map<string, Pick<PublishRequestResponse, "status" | "requestedAt">>();
  for (const request of requests) {
    const previous = latest.get(request.targetId);
    if (!previous || timeOf(request.requestedAt) > timeOf(previous.requestedAt)) {
      latest.set(request.targetId, request);
    }
  }
  const counts = { Published: 0, Pending: 0, Draft: 0, Rejected: 0 };
  for (const listing of listings) {
    const request = latest.get(listing.id);
    if (listing.status === "PUBLISHED") counts.Published++;
    else if (request?.status === "PENDING_REVIEW") counts.Pending++;
    else if (request?.status === "REJECTED") counts.Rejected++;
    else counts.Draft++;
  }
  return [
    /* Status colours: green live, amber waiting, grey draft, red refused. */
    { name: "Published", value: counts.Published, color: "var(--success)" },
    { name: "Pending", value: counts.Pending, color: "var(--warning-accent)" },
    { name: "Draft", value: counts.Draft, color: "var(--border-hover)" },
    { name: "Rejected", value: counts.Rejected, color: "var(--destructive)" },
  ];
}

export type GrowthRange = "7d" | "30d" | "3m" | "6m" | "12m" | "custom";
export type GrowthUnit = "day" | "week" | "month";

/** First and last day of the period (inclusive, UTC midnight) and how it is grouped. */
export interface GrowthWindow {
  readonly from: Date;
  readonly to: Date;
  readonly unit: GrowthUnit;
}

export const GROWTH_RANGES: readonly { readonly value: GrowthRange; readonly label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
];

const DAY = 86_400_000;

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

/** A YYYY-MM-DD value as UTC midnight, or null. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dayValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Days up to a month, weeks up to half a year, months beyond. */
export function growthUnit(from: Date, to: Date): GrowthUnit {
  const days = Math.round((to.getTime() - from.getTime()) / DAY) + 1;
  return days <= 31 ? "day" : days <= 183 ? "week" : "month";
}

function bucketStart(date: Date, unit: GrowthUnit): Date {
  if (unit === "day") return date;
  if (unit === "week") return addDays(date, -((date.getUTCDay() + 6) % 7));
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function nextBucket(date: Date, unit: GrowthUnit): Date {
  if (unit === "day") return addDays(date, 1);
  if (unit === "week") return addDays(date, 7);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

/** The period a range covers; a custom range with a missing date has none. */
export function growthWindow(
  range: GrowthRange,
  now = new Date(),
  custom?: { readonly from: string; readonly to: string },
): GrowthWindow | null {
  const today = utcDay(now);
  switch (range) {
    case "7d":
      return { from: addDays(today, -6), to: today, unit: "day" };
    case "30d":
      return { from: addDays(today, -29), to: today, unit: "day" };
    case "3m":
      return { from: addDays(bucketStart(today, "week"), -12 * 7), to: today, unit: "week" };
    case "6m":
    case "12m": {
      const months = range === "6m" ? 6 : 12;
      return { from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months + 1, 1)), to: today, unit: "month" };
    }
    case "custom": {
      const from = parseDay(custom?.from);
      const to = parseDay(custom?.to);
      if (!from || !to) return null;
      const [start, end] = from <= to ? [from, to] : [to, from];
      return { from: start, to: end, unit: growthUnit(start, end) };
    }
  }
}

const utc = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleDateString("en", { ...options, timeZone: "UTC" });

/**
 * Listings created in each day, week or month of the period — attractions,
 * stays and food listings alike, from each one's createdAt. Every bucket is
 * returned, empty ones as 0; partial first/last buckets count only days inside the period.
 */
export function destinationGrowth(
  listings: readonly { readonly createdAt: string | null }[],
  window: GrowthWindow,
) {
  const { from, to, unit } = window;
  const points: { key: string; tick: string; label: string; count: number }[] = [];
  for (let start = bucketStart(from, unit); start <= to; start = nextBucket(start, unit)) {
    const first = start < from ? from : start;
    const lastOfBucket = addDays(nextBucket(start, unit), -1);
    const last = lastOfBucket > to ? to : lastOfBucket;
    const tick = unit === "month" ? utc(start, { month: "short" }) : utc(first, { month: "short", day: "numeric" });
    const label =
      unit === "day"
        ? utc(start, { month: "short", day: "numeric", year: "numeric" })
        : unit === "week"
          ? `${utc(first, { month: "short", day: "numeric" })} – ${utc(last, { month: "short", day: "numeric", year: "numeric" })}`
          : utc(start, { month: "long", year: "numeric" });
    points.push({ key: dayValue(start), tick, label, count: 0 });
  }
  const byKey = new Map(points.map((point) => [point.key, point]));
  const end = addDays(to, 1).getTime();
  for (const listing of listings) {
    const created = listing.createdAt ? Date.parse(listing.createdAt) : Number.NaN;
    if (Number.isNaN(created) || created < from.getTime() || created >= end) continue;
    const point = byKey.get(dayValue(bucketStart(utcDay(new Date(created)), unit)));
    if (point) point.count++;
  }
  return points;
}
