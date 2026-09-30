import type { ReactNode } from "react";
import Link from "next/link";

export interface RankItem {
  readonly id: number | string;
  readonly title: string;
  readonly meta: string;
  readonly figure: string;
  readonly href?: string;
}

/**
 * A short league table.
 *
 * The numbered badge carries the order, so the rows need no colour of their
 * own. The grid sits on the row element itself rather than on a subgrid inside
 * it — one less CSS feature between this list and an older browser.
 */
export function RankList({ items }: { readonly items: readonly RankItem[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => {
        const className =
          "grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 py-3";

        const body: ReactNode = (
          <>
            <span className="grid size-7 place-items-center rounded-sm bg-ink text-xs font-bold text-gold dark:bg-gold-soft dark:text-gold-deep">
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold text-ink">
                {item.title}
              </span>
              <span className="text-2xs text-muted">{item.meta}</span>
            </span>
            <b className="text-xs font-bold text-teal-deep tabular-nums">
              {item.figure}
            </b>
          </>
        );

        return (
          <li className="border-b border-line last:border-b-0" key={item.id}>
            {item.href ? (
              <Link
                className={`${className} transition-colors hover:bg-shell`}
                href={item.href}
              >
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
