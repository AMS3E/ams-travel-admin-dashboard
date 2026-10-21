"use client";

import { useMemo } from "react";
import { useMessages, useTranslations } from "next-intl";
import { dateTimeOf, relativeOf, type DateWords } from "@/i18n/dates";

/** "5 minutes ago" and "16 Oct 2026, 14:32" in the chosen language, for client components. */
export function useDates() {
  const t = useTranslations("common.relative");
  const dates = useMessages().common.dates as DateWords;
  return useMemo(() => {
    const words = {
      justNow: t("justNow"),
      minutes: (count: number) => t("minutes", { count }),
      hours: (count: number) => t("hours", { count }),
      days: (count: number) => t("days", { count }),
    };
    return {
      dates,
      relative: (value: string | null | undefined) => relativeOf(value, words, dates),
      dateTime: (value: string | null | undefined) => dateTimeOf(value, dates),
    };
  }, [t, dates]);
}
