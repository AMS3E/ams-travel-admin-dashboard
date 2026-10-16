"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface DayTabsProps {
  readonly days: number;
  /** The day shown; null for all days. */
  readonly value: number | null;
  readonly onChange: (day: number | null) => void;
  readonly className?: string;
}

/** All days, or one: what the map and the itinerary beside it show. */
export function DayTabs({ days, value, onChange, className }: DayTabsProps) {
  const t = useTranslations("corridors.words");
  if (days < 2) return null;
  const choices: readonly (number | null)[] = [null, ...Array.from({ length: days }, (_, index) => index + 1)];
  return (
    <div aria-label={t("showDays")}className={cn("flex max-w-full flex-wrap gap-1 rounded-md border border-line bg-sand p-0.5", className)} role="group">
      {choices.map((day) => (
        <button
          aria-pressed={value === day}
          className={cn(
            "h-7 rounded-sm px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
            value === day ? "bg-paper text-ink shadow-xs" : "text-ink-soft hover:text-ink",
          )}
          key={day ?? "all"}
          onClick={() => onChange(day)}
          type="button"
        >
          {day == null ? t("allDays") : t("day", { day })}
        </button>
      ))}
    </div>
  );
}
