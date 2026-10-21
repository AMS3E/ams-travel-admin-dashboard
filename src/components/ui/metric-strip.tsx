import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Summary figures as one row, not a card each.
 *
 * A figure is a label and a number; giving every one its own floating card and
 * icon makes five numbers take a screen. Here they share one bordered strip,
 * divided by hairlines, and wrap onto a second line on a narrow screen.
 */
export function MetricStrip({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <dl className={cn("panel flex flex-wrap overflow-hidden", className)}>
      {children}
    </dl>
  );
}

/** What a figure means, when it means something: it is never the only signal. */
export type MetricTone = "neutral" | "success" | "warning" | "danger";

const TONE_DOT: Readonly<Record<MetricTone, string | null>> = {
  neutral: null,
  success: "bg-success",
  warning: "bg-gold",
  danger: "bg-heritage",
};

interface MetricProps {
  readonly label: string;
  /** `null` while loading; `undefined` when unavailable. Both read as a dash. */
  readonly value: ReactNode | null | undefined;
  readonly hint?: ReactNode;
  readonly tone?: MetricTone;
  /** The screen the figure is counted from. The whole cell becomes its link. */
  readonly href?: string;
}

export function Metric({ label, value, hint, tone = "neutral", href }: MetricProps) {
  const t = useTranslations("common");
  const dot = TONE_DOT[tone];
  const shown =
    value === null ? (
      <span aria-label={t("loading")} className="inline-block h-6 w-10 animate-pulse rounded-sm bg-sand-deep align-middle" />
    ) : value === undefined ? (
      "—"
    ) : typeof value === "number" ? (
      value.toLocaleString()
    ) : (
      value
    );

  return (
    <div
      className={cn(
        "relative min-w-[9.5rem] flex-1 border-line px-4 py-3 not-last:border-r",
        href && "transition-colors hover:bg-sand",
      )}
    >
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", dot)} /> : null}
        {href ? (
          <Link className="after:absolute after:inset-0 hover:text-ink focus-visible:outline-offset-0" href={href}>
            {label}
          </Link>
        ) : (
          label
        )}
      </dt>
      <dd className="mt-1 text-2xl leading-none font-semibold text-ink tabular-nums">{shown}</dd>
      {hint ? <dd className="mt-1.5 truncate text-xs text-muted">{hint}</dd> : null}
    </div>
  );
}
