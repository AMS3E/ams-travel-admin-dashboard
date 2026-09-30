import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface EntityRowProps {
  readonly title: string;
  readonly subtitle?: string | null;
  /** Status chips, rendered after the title. */
  readonly badges?: ReactNode;
  /** A figure or timestamp, pinned right. */
  readonly trailing?: ReactNode;
  /**
   * Where the row goes. Omitted for a role that may see the row but not open
   * it — a BDO reads the verification queue and cannot edit a listing in it.
   */
  readonly href?: string;
  /**
   * A control of its own, such as a Verify button. Rendered beside the link
   * rather than inside it: a button inside an anchor is invalid, and a click on
   * it — or on a drawer it opens — would open the row as well.
   */
  readonly action?: ReactNode;
}

export function RowList({ children }: { readonly children: ReactNode }) {
  return <ul className="panel divide-y divide-line overflow-hidden">{children}</ul>;
}

export function EmptyRow({ children }: { readonly children: ReactNode }) {
  return (
    <p className="panel px-4 py-6 text-center text-sm text-muted">{children}</p>
  );
}

export function EntityRow({
  title,
  subtitle,
  badges,
  trailing,
  href,
  action,
}: EntityRowProps) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{title}</span>
          {badges}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted">
            {subtitle}
          </span>
        ) : null}
      </span>

      {trailing ? (
        <span className="shrink-0 text-xs text-muted tabular-nums">{trailing}</span>
      ) : null}
    </>
  );

  return (
    <li className="flex items-center">
      {href ? (
        <Link
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand"
          href={href}
        >
          {body}
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5">{body}</div>
      )}
      {action ? <div className="shrink-0 pr-4">{action}</div> : null}
    </li>
  );
}
