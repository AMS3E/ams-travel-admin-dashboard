"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { WEEKDAYS } from "@/features/catalog/api/contracts";
import { useDates } from "@/i18n/use-dates";
import { cn } from "@/lib/utils";

const RANGE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_HOURS = "08:00-22:00";

type Day =
  | { readonly kind: "closed" }
  | { readonly kind: "range"; readonly from: string; readonly until: string }
  /** Anything the time pickers cannot show — `11:00-24:00`, say — kept as typed. */
  | { readonly kind: "custom"; readonly text: string };

function read(value: string | undefined): Day {
  const text = value?.trim() ?? "";
  if (!text || text === "closed") return { kind: "closed" };
  if (RANGE.test(text)) {
    const [from, until] = text.split("-");
    return { kind: "range", from, until };
  }
  return { kind: "custom", text };
}

interface HoursEditorProps {
  /** One entry per weekday, Monday first: `07:00-22:00`, or empty when closed. */
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly labelledBy: string;
}

/**
 * A week of opening hours: a switch per day, and when it is open, the time it
 * opens and closes. Days are stored exactly as before — `07:00-22:00`, or
 * nothing when closed — so the request body does not change.
 */
export function HoursEditor({ value, onChange, labelledBy }: HoursEditorProps) {
  const t = useTranslations("forms.hours");
  const actions = useTranslations("forms.actions");
  const { dates } = useDates();
  /* The week starts on Monday here; the weekday names start on Sunday. */
  const dayName = (index: number) => dates.weekdays[(index + 1) % 7] ?? "";
  const days = WEEKDAYS.map((_, index) => value[index] ?? "");
  const firstOpen = days.find((day) => read(day).kind !== "closed");

  function set(index: number, next: string) {
    const copy = [...days];
    copy[index] = next;
    onChange(copy);
  }

  return (
    <div aria-labelledby={labelledBy} className="flex flex-col gap-2" role="group">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <button className="font-medium text-teal-deep hover:underline" onClick={() => onChange(WEEKDAYS.map(() => DEFAULT_HOURS))} type="button">
          {t("everyDay")}
        </button>
        <span aria-hidden className="text-line-strong">·</span>
        <button
          className="font-medium text-teal-deep hover:underline disabled:text-muted disabled:no-underline"
          disabled={!firstOpen}
          onClick={() => firstOpen && onChange(WEEKDAYS.map(() => firstOpen))}
          type="button"
        >
          {t("sameEveryDay")}
        </button>
        <span aria-hidden className="text-line-strong">·</span>
        <button className="text-muted hover:text-ink hover:underline" onClick={() => onChange(WEEKDAYS.map(() => ""))} type="button">
          {actions("clear")}
        </button>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
        {WEEKDAYS.map((weekday, index) => {
          const day = read(days[index]);
          const open = day.kind !== "closed";
          const name = dayName(index);
          return (
            <li className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-1.5" key={weekday}>
              <button
                aria-checked={open}
                aria-label={t("dayOpen", { day: name })}
                className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", open ? "bg-teal" : "bg-line-strong")}
                onClick={() => {
                  if (open) return set(index, "");
                  /* Opening a day starts from the hours of the last open day before it. */
                  const earlier = days.slice(0, index).reverse().find((item) => RANGE.test(item));
                  set(index, earlier ?? DEFAULT_HOURS);
                }}
                role="switch"
                type="button"
              >
                <span className={cn("absolute left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform", open && "translate-x-4")} />
              </button>
              <span className={cn("w-24 text-sm", open ? "text-ink" : "text-muted")}>{name}</span>

              {day.kind === "range" ? (
                <span className="flex items-center gap-1.5">
                  <Input
                    aria-label={t("opensAt", { day: name })}
                    className="h-8 w-28 text-sm tabular-nums"
                    onChange={(event) => event.target.value && set(index, `${event.target.value}-${day.until}`)}
                    type="time"
                    value={day.from}
                  />
                  <span className="text-muted">–</span>
                  <Input
                    aria-label={t("closesAt", { day: name })}
                    className="h-8 w-28 text-sm tabular-nums"
                    onChange={(event) => event.target.value && set(index, `${day.from}-${event.target.value}`)}
                    type="time"
                    value={day.until}
                  />
                </span>
              ) : day.kind === "custom" ? (
                <Input
                  aria-label={t("dayHours", { day: name })}
                  className="h-8 max-w-44 font-mono text-sm"
                  onChange={(event) => set(index, event.target.value)}
                  placeholder="07:00-22:00"
                  value={day.text}
                />
              ) : (
                <span className="text-sm text-muted">{t("closed")}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
