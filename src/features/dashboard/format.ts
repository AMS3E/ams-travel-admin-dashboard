/**
 * Formatters shared by the dashboards. Fixed locale rather than the request's,
 * because the CMS is one back office in one place and a date that reads
 * differently for the person beside you is a support ticket.
 */
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

/**
 * The calendar day a moment falls on in Cambodia, as {@code 2026-09-23}.
 *
 * "Today" on this board is the working day in Phnom Penh — the same day the
 * API counts a browse on — not the day of whichever machine the browser runs
 * on, so a figure reads the same for everyone looking at it.
 */
const CAMBODIAN_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh", dateStyle: "short" });

export function cambodianDay(value: string | null | undefined | Date): string {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "" : CAMBODIAN_DAY.format(parsed);
}

/** Today in Cambodia, or a day either side of it: {@code cambodianToday(-1)} is yesterday. */
export function cambodianToday(days = 0): string {
  return cambodianDay(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "—" : DATE_TIME.format(parsed);
}

/** For `LocalDate` fields, which arrive as `YYYY-MM-DD` and carry no zone. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.valueOf()) ? "—" : DATE.format(parsed);
}

export function formatRating(
  rating: number | null | undefined,
  count?: number | null,
): string | undefined {
  if (rating == null) return count ? `${count} reviews` : undefined;
  const stars = `${rating.toFixed(1)} ★`;
  return count ? `${stars} · ${count} reviews` : stars;
}

const RELATIVE = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

/**
 * "12 min ago", "yesterday", then the date — for lists scanned for what moved
 * recently. The exact time is kept for a `title` beside it.
 */
export function formatRelative(value: string | null | undefined, now = Date.now()): string {
  if (!value) return "—";
  const at = Date.parse(value);
  if (Number.isNaN(at)) return "—";
  const minutes = Math.round((at - now) / 60_000);
  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return RELATIVE.format(days, "day");
  return DATE.format(new Date(at));
}
