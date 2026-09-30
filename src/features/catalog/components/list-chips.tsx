import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ListChip {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

/**
 * One list, narrowed by what its rows belong to — a tourism region's own
 * categories, an interest group's own interests. "All" first, then each chip
 * with how many rows it holds.
 */
export function ListChips({
  label,
  allLabel,
  total,
  chips,
  active,
  href,
  hint,
}: {
  readonly label: string;
  readonly allLabel: string;
  readonly total: number;
  readonly chips: readonly ListChip[];
  readonly active: string | null;
  readonly href: (value: string | null) => string;
  readonly hint: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5">
        {[null, ...chips].map((chip) => {
          const on = (chip?.value ?? null) === active;
          return (
            <li key={chip?.value ?? "all"}>
              <Link
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                  on ? "border-ink bg-ink text-paper" : "border-line-strong bg-paper text-ink-soft hover:bg-sand hover:text-ink",
                )}
                href={href(chip?.value ?? null)}
              >
                {chip?.label ?? allLabel}
                <span className={cn("text-xs tabular-nums", on ? "text-paper/70" : "text-muted")}>{chip?.count ?? total}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">{hint}</p>
    </nav>
  );
}
