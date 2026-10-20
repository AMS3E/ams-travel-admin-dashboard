"use client";

import { useCallback } from "react";
import { useMessages, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/toolbar";
import { datePartsOf, fillDate, type DateWords } from "@/i18n/dates";
import type { DestinationStatsPeriod } from "../api/contracts";

export type Period = "all" | "today" | "week" | "month" | "custom";

const PERIODS: readonly Period[] = ["all", "today", "week", "month", "custom"];

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

/** "9 Oct 2026" for a `YYYY-MM-DD` day, which carries no zone. */
function dayText(value: string | undefined, dates: DateWords): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "—";
  const at = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return fillDate(dates.date, datePartsOf(at, "UTC"), dates);
}

/** The days a window covers, in plain words: "9 Oct 2026", "6 Oct 2026 to 9 Oct 2026"; empty for all time. */
export function usePeriodDates(): (window: DestinationStatsPeriod) => string {
  const t = useTranslations("stats.period");
  const dates = useMessages().common.dates as DateWords;
  return useCallback(
    (window: DestinationStatsPeriod) => {
      if (!window.from && !window.to) return "";
      return window.from && window.to && window.from !== window.to
        ? t("range", { from: dayText(window.from, dates), to: dayText(window.to, dates) })
        : dayText(window.from ?? window.to, dates);
    },
    [t, dates],
  );
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
  const t = useTranslations("stats.period");
  const dates = usePeriodDates()(windowOf(period, custom));
  return (
    <>
      <SegmentedControl
        label={t("label")}
        onChange={onPeriod}
        options={PERIODS.map((value) => ({ value, label: t(`options.${value}`) }))}
        value={period}
      />
      {period === "custom" ? (
        <span className="flex items-center gap-1.5 text-xs text-muted" data-field="custom-period">
          <Input
            aria-label={t("from")}
            className="h-8 w-36 text-sm"
            max={custom.to}
            onChange={(event) => onCustom({ ...custom, from: event.target.value || undefined })}
            type="date"
            value={custom.from ?? ""}
          />
          {t("between")}
          <Input
            aria-label={t("to")}
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
