import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  readonly label: string;
  readonly value: number | string | null | undefined;
  readonly hint?: string;
  readonly icon: LucideIcon;
  /**
   * Makes the tile a link. Left off when the signed-in role has no screen to
   * open — a figure a role may read is not a screen it may edit.
   */
  readonly href?: string;
}

export function StatGrid({ children }: { readonly children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function StatTile({ label, value, hint, icon: Icon, href }: StatTileProps) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
        {label}
      </span>
      <span className="text-2xl leading-none font-semibold text-ink tabular-nums">
        {value ?? "—"}
      </span>
      {hint ? <span className="truncate text-xs text-muted">{hint}</span> : null}
    </>
  );

  const className = "panel flex flex-col gap-1.5 px-4 py-3";

  return href ? (
    <Link className={`${className} transition-colors hover:bg-sand`} href={href}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
