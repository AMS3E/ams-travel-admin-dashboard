"use client";

import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/toolbar";
import { formatDay } from "@/features/dashboard/format";
import type { DestinationStatsPeriod } from "../api/contracts";

export type Period = "all" | "today" | "week" | "month" | "custom";

const PERIODS: readonly { readonly value: Period; readonly label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

/** A calendar date as the API takes it, in the viewer's own day. */
function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The dates a period stands for: today's, this week's from Monday, this month's from the 1st, or the ones typed. */
export function windowOf(period: Period, custom: DestinationStatsPeriod): DestinationStatsPeriod {
  const now = new Date();
  const today = isoDate(now);
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: isoDate(monday), to: today };
    }
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "custom":
      return { ...(custom.from ? { from: custom.from } : {}), ...(custom.to ? { to: custom.to } : {}) };
    default:
      return {};
  }
}

/** The days a window covers, in plain words: "9 Oct 2026", "6 Oct 2026 to 9 Oct 2026"; empty for all time. */
export function periodDates(window: DestinationStatsPeriod): string {
  if (!window.from && !window.to) return "";
  return window.from && window.to && window.from !== window.to
    ? `${formatDay(window.from)} to ${formatDay(window.to)}`
    : formatDay(window.from ?? window.to);
}

/** Whether a moment falls in the window, by its calendar day in Cambodia. */
export function inWindow(createdAt: string, window: DestinationStatsPeriod, dayOf: (value: string) => string): boolean {
  if (!window.from && !window.to) return true;
  const day = dayOf(createdAt);
  return (!window.from || day >= window.from) && (!window.to || day <= window.to);
}

interface PeriodControlProps {
  readonly period: Period;
  readonly custom: DestinationStatsPeriod;
  readonly onPeriod: (period: Period) => void;
  readonly onCustom: (custom: DestinationStatsPeriod) => void;
}

/**
 * All time, Today, This week, This month, or a typed range — and, beside it,
 * the days that stands for, so a preset is never a guess. Sits inside a
 * toolbar.
 */
export function PeriodControl({ period, custom, onPeriod, onCustom }: PeriodControlProps) {
  const dates = periodDates(windowOf(period, custom));
  return (
    <>
      <SegmentedControl label="Period" onChange={onPeriod} options={PERIODS} value={period} />
      {period === "custom" ? (
        <span className="flex items-center gap-1.5 text-xs text-muted" data-field="custom-period">
          <Input
            aria-label="From"
            className="h-8 w-36 text-sm"
            max={custom.to}
            onChange={(event) => onCustom({ ...custom, from: event.target.value || undefined })}
            type="date"
            value={custom.from ?? ""}
          />
          to
          <Input
            aria-label="To"
            className="h-8 w-36 text-sm"
            min={custom.from}
            onChange={(event) => onCustom({ ...custom, to: event.target.value || undefined })}
            type="date"
            value={custom.to ?? ""}
          />
        </span>
      ) : null}
      {dates ? (
        <span className="text-xs text-muted" data-field="period-dates">
          {dates}
        </span>
      ) : null}
    </>
  );
}
