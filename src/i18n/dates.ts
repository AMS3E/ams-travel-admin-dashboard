/**
 * How a language writes a date: its weekday and month names and the order of
 * the parts. Kept as words rather than left to Intl, because a browser without
 * a language's date data (many lack Khmer) would write it differently from
 * the server. The words are `common.dates` in each language's file.
 */
export interface DateWords {
  /** Sunday first. */
  readonly weekdays: readonly string[];
  readonly months: readonly string[];
  readonly monthsShort: readonly string[];
  /** "{weekday} {day} {month}"; the others add {year}, {time} or use {monthShort}. */
  readonly day: string;
  readonly dayYear: string;
  readonly full: string;
  readonly stamp: string;
  readonly date: string;
}

export const ENGLISH_DATES: DateWords = {
  weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  day: "{weekday} {day} {month}",
  dayYear: "{weekday} {day} {month} {year}",
  full: "{weekday} {day} {month} {year} at {time}",
  stamp: "{day} {monthShort} {year}, {time}",
  date: "{day} {monthShort} {year}",
};

/** The office's day: Cambodia. */
export const ZONE = "Asia/Phnom_Penh";
const WEEKDAY_INDEX: Readonly<Record<string, number>> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const PARTS = new Map<string, Intl.DateTimeFormat>();

export interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly weekday: number;
  readonly hour: string;
  readonly minute: string;
  readonly second: string;
}

/** A moment's calendar parts in a time zone, as numbers: the same on every server and browser. */
export function datePartsOf(at: Date, zone: string = ZONE): DateParts {
  let format = PARTS.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, year: "numeric", month: "numeric", day: "numeric", weekday: "short",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    PARTS.set(zone, format);
  }
  const part = (type: Intl.DateTimeFormatPartTypes) => format.formatToParts(at).find((each) => each.type === type)?.value ?? "";
  return {
    year: Number(part("year")),
    month: Number(part("month")),
    day: Number(part("day")),
    weekday: WEEKDAY_INDEX[part("weekday")] ?? 0,
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

/** A date pattern with its parts filled in: {weekday}, {day}, {month}, {monthShort}, {year}, {time}. */
export function fillDate(pattern: string, parts: DateParts, dates: DateWords, time = ""): string {
  return pattern
    .replace("{weekday}", dates.weekdays[parts.weekday] ?? "")
    .replace("{day}", String(parts.day))
    .replace("{monthShort}", dates.monthsShort[parts.month - 1] ?? "")
    .replace("{month}", dates.months[parts.month - 1] ?? "")
    .replace("{year}", String(parts.year))
    .replace("{time}", time);
}

/** "16 Oct 2026, 14:32", in Cambodia: a moment as a tooltip shows it. */
export function dateTimeOf(value: string | null | undefined, dates: DateWords): string {
  const at = value ? new Date(value) : null;
  if (!at || Number.isNaN(at.valueOf())) return "—";
  const parts = datePartsOf(at);
  return fillDate(dates.stamp, parts, dates, `${parts.hour}:${parts.minute}`);
}

/** The words "5 minutes ago" is made of, from `common.relative`. */
export interface RelativeWords {
  readonly justNow: string;
  readonly minutes: (count: number) => string;
  readonly hours: (count: number) => string;
  readonly days: (count: number) => string;
}

/**
 * "just now", "12 minutes ago", "yesterday", then the date — for lists scanned
 * for what moved recently. Past moments only, as every list here shows them.
 */
export function relativeOf(value: string | null | undefined, words: RelativeWords, dates: DateWords, now = Date.now()): string {
  if (!value) return "—";
  const at = Date.parse(value);
  if (Number.isNaN(at)) return "—";
  const minutes = Math.round((now - at) / 60_000);
  if (Math.abs(minutes) < 1) return words.justNow;
  if (Math.abs(minutes) < 60) return words.minutes(minutes);
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return words.hours(hours);
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return words.days(days);
  return fillDate(dates.date, datePartsOf(new Date(at)), dates);
}
