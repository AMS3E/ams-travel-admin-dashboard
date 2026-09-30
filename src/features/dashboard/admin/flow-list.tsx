import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The operational rows: a tinted glyph, what it is, how many.
 *
 * Tone here is a *status* — waiting, live, taken down — so it is never used for
 * a chart series, and it never carries the meaning alone: every row is labelled
 * and every glyph is decorative.
 */
export type FlowTone = "waiting" | "good" | "warning" | "critical" | "neutral";

const CHIPS: Readonly<Record<FlowTone, string>> = {
  waiting: "bg-gold-soft text-gold-deep",
  good: "bg-teal-soft text-teal-deep",
  warning: "bg-gold-soft text-gold-deep",
  critical: "bg-heritage-soft text-heritage",
  neutral: "bg-shell text-muted",
};

export interface FlowItem {
  readonly label: string;
  readonly value: number;
  readonly icon: LucideIcon;
  readonly tone: FlowTone;
}

export function FlowList({ items }: { readonly items: readonly FlowItem[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <li
            className="inset-row grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
            key={item.label}
          >
            <span
              className={cn("grid size-9 place-items-center rounded-sm", CHIPS[item.tone])}
            >
              <Icon aria-hidden className="size-4" />
            </span>
            <span className="text-sm font-medium text-ink-soft">{item.label}</span>
            <strong className="text-md font-bold text-ink tabular-nums">
              {item.value}
            </strong>
          </li>
        );
      })}
    </ul>
  );
}

/** The two figures that close a flow panel. */
export function FlowSummary({
  facts,
}: {
  readonly facts: readonly { readonly label: string; readonly value: string }[];
}) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-2.5 border-t border-line pt-4">
      {facts.map((fact) => (
        <div className="flex flex-col gap-1" key={fact.label}>
          <dt className="text-2xs text-muted">{fact.label}</dt>
          <dd className="text-sm font-semibold text-ink">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
