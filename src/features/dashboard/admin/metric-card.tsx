import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The headline figures.
 *
 * A number is not a chart: four of these say more, faster, than any plot of the
 * same four values would. Tone is reserved for what the number *means* — a
 * queue that needs clearing reads warm, the rest stay in ink.
 */
export type MetricTone = "neutral" | "good" | "warning" | "critical";

const TONES: Readonly<Record<MetricTone, string>> = {
  neutral: "text-ink",
  good: "text-teal-deep",
  warning: "text-gold-deep",
  critical: "text-heritage",
};

export function MetricRow({ children }: { readonly children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}

interface MetricCardProps {
  readonly label: string;
  readonly value: string | number | null | undefined;
  readonly hint?: string;
  readonly tone?: MetricTone;
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <div className="rounded-md border border-line bg-shell p-4 shadow-soft">
      <div className="flex flex-col rounded-[0.625rem] bg-paper p-4">
        <p className="text-md font-medium text-ink">{label}</p>
        <p
          className={cn(
            "mt-2 text-3xl font-bold tabular-nums",
            TONES[tone],
          )}
        >
          {value ?? "—"}
        </p>
        {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
