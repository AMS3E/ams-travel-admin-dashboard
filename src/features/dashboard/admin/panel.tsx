import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The admin board follows the 590st admin house style: a card is an 8px white
 * surface lifted by one soft shadow, with no border, and a header that carries
 * a title, a line of context, and at most one link out.
 */
export function Panel({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return <section className={cn("card min-w-0 p-5", className)}>{children}</section>;
}

interface PanelHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly action?: { readonly href: string; readonly label: string };
  /** A count or chip pinned right, where a link would otherwise sit. */
  readonly badge?: ReactNode;
}

export function PanelHeader({ title, subtitle, action, badge }: PanelHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-snug text-muted">{subtitle}</p>
        ) : null}
      </div>

      {action ? (
        <Link
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-ink-soft transition-colors hover:text-ink"
          href={action.href}
        >
          {action.label}
          <ArrowRight aria-hidden className="size-3.5 text-teal" />
        </Link>
      ) : (
        badge
      )}
    </div>
  );
}

/** The link that closes a panel, under its content. */
export function PanelFooterLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: ReactNode;
}) {
  return (
    <Link
      className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-ink transition-colors hover:text-teal-deep"
      href={href}
    >
      {children}
      <ArrowRight aria-hidden className="size-3.5 text-teal" />
    </Link>
  );
}
