import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";

export interface AttentionItem {
  readonly id: number | string;
  readonly title: string;
  readonly detail: string;
  readonly href?: string;
}

/**
 * The one panel allowed to be loud.
 *
 * Its colour is a status, and it never stands alone: every row carries the
 * warning glyph and says in words what is wrong with it.
 */
export function AttentionList({
  items,
  empty,
}: {
  readonly items: readonly AttentionItem[];
  readonly empty: string;
}) {
  if (!items.length) {
    return (
      <p className="inset-row px-3 py-6 text-center text-sm text-muted">{empty}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const body = (
          <>
            <span className="grid size-9 place-items-center rounded-sm bg-heritage-soft text-heritage">
              <TriangleAlert aria-hidden className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-xs font-semibold text-ink">
                {item.title}
              </span>
              <span className="text-2xs text-muted">{item.detail}</span>
            </span>
            {item.href ? (
              <ArrowRight aria-hidden className="size-3.5 text-muted" />
            ) : (
              <span />
            )}
          </>
        );

        const className =
          "grid grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-sm border border-heritage-soft bg-heritage-soft/30 px-3 py-2.5";

        return (
          <li key={item.id}>
            {item.href ? (
              <Link className={className} href={item.href}>
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
