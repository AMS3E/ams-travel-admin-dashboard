/**
 * A capital's dates, asked as years and written the way its region's page
 * prints them: "c. 600 – 700 CE", "802 – c. 835 CE", "1866 CE – present".
 * The page stores only the text; these turn the form's years into it and back.
 */

export type Era = "CE" | "BCE";

export interface DateParts {
  readonly from: string;
  /** "c." before the first year: it is not certain. */
  readonly fromAbout: boolean;
  readonly to: string;
  readonly toAbout: boolean;
  /** Still the capital today: "… – present". */
  readonly present: boolean;
  readonly era: Era;
}

export const NO_DATES: DateParts = { from: "", fromAbout: false, to: "", toAbout: false, present: false, era: "CE" };

const year = (value: string, about: boolean) => `${about ? "c. " : ""}${value.trim()}`;

/** The text the page shows; empty while there is no first year. */
export function composeDates(parts: DateParts): string {
  if (!parts.from.trim()) return "";
  if (parts.present) return `${year(parts.from, parts.fromAbout)} ${parts.era} – present`;
  if (!parts.to.trim()) return `${year(parts.from, parts.fromAbout)} ${parts.era}`;
  return `${year(parts.from, parts.fromAbout)} – ${year(parts.to, parts.toAbout)} ${parts.era}`;
}

const ABOUT = String.raw`(c\.\s*)?`;
const YEAR = String.raw`(\d{1,4})`;
const ERA = String.raw`(CE|BCE)`;
const DASH = String.raw`\s*[–—-]\s*`;

/** The years in dates the page shows; null when they were written some other way. */
export function parseDates(text: string | null | undefined): DateParts | null {
  const value = (text ?? "").trim();
  if (!value) return NO_DATES;
  const era = (found: string) => (found.toUpperCase() === "BCE" ? "BCE" : "CE") as Era;
  let match = new RegExp(`^${ABOUT}${YEAR}\\s*${ERA}${DASH}present$`, "i").exec(value);
  if (match) return { from: match[2], fromAbout: Boolean(match[1]), to: "", toAbout: false, present: true, era: era(match[3]) };
  match = new RegExp(`^${ABOUT}${YEAR}${DASH}${ABOUT}${YEAR}\\s*${ERA}$`, "i").exec(value);
  if (match) return { from: match[2], fromAbout: Boolean(match[1]), to: match[4], toAbout: Boolean(match[3]), present: false, era: era(match[5]) };
  match = new RegExp(`^${ABOUT}${YEAR}\\s*${ERA}$`, "i").exec(value);
  if (match) return { from: match[2], fromAbout: Boolean(match[1]), to: "", toAbout: false, present: false, era: era(match[3]) };
  return null;
}

/** The first year as a number, below zero when BCE; null without one. */
export function firstYear(parts: DateParts): number | null {
  const value = Number.parseInt(parts.from, 10);
  if (!Number.isFinite(value)) return null;
  return parts.era === "BCE" ? -value : value;
}

/** What is wrong with the years, in words; null when nothing is. */
export function datesProblem(parts: DateParts): string | null {
  const from = Number.parseInt(parts.from, 10);
  const to = Number.parseInt(parts.to, 10);
  if (parts.to.trim() && !parts.from.trim()) return "Give the year it became the capital first.";
  if (Number.isFinite(from) && Number.isFinite(to) && !parts.present) {
    const ends = parts.era === "BCE" ? to > from : to < from;
    if (ends) return "It cannot stop being the capital before it became one.";
  }
  return null;
}

export interface PeriodSpan {
  readonly id: string;
  readonly startYear: number | null;
  readonly endYear: number | null;
}

/** The era a year falls in: Angkor for 889, Pre-Angkor for 600. */
export function periodFor(yearValue: number | null, periods: readonly PeriodSpan[]): string | null {
  if (yearValue == null) return null;
  const found = periods.find(
    (period) => (period.startYear == null || period.startYear <= yearValue) && (period.endYear == null || yearValue < period.endYear),
  );
  return found?.id ?? null;
}
