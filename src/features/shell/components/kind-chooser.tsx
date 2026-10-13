import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChooserKind {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
  /** A short fact under the description, such as how many there are already. */
  readonly meta?: string;
}

/**
 * How a short list is laid out, so no card is left alone on a row: two or
 * three kinds stand side by side as tiles — the picture above the words —
 * once there is room for them. Any other number keeps the two-column list.
 */
const TILES: Readonly<Record<number, { readonly grid: string; readonly card: string; readonly arrow: string }>> = {
  2: { grid: "sm:grid-cols-2", card: "sm:flex-col sm:p-5", arrow: "sm:absolute sm:top-5 sm:right-5 sm:mt-0" },
  3: { grid: "lg:grid-cols-3", card: "lg:flex-col lg:p-5", arrow: "lg:absolute lg:top-5 lg:right-5 lg:mt-0" },
};

/**
 * "What are you adding?" as cards: the kind first, then a form written for it.
 * Create Destination and Create Historical Coverage both open on one.
 */
export function KindChooser({ kinds }: { readonly kinds: readonly ChooserKind[] }) {
  const tiles = TILES[kinds.length];

  return (
    <ul className={cn("grid gap-3", tiles ? tiles.grid : "sm:grid-cols-2")}>
      {kinds.map((kind) => (
        <li key={kind.key}>
          <Link
            className={cn(
              "panel group relative flex h-full items-start gap-3 p-4 transition-colors hover:border-teal hover:bg-teal-soft/40",
              tiles?.card,
            )}
            href={kind.href}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-sand text-teal-deep">
              <kind.icon aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-ink">{kind.title}</span>
              <span className="mt-1 block text-sm text-muted">{kind.description}</span>
              {kind.meta ? <span className="mt-2 block text-xs font-medium text-ink-soft">{kind.meta}</span> : null}
            </span>
            <ArrowRight
              aria-hidden
              className={cn("mt-1 size-4 shrink-0 text-muted transition-colors group-hover:text-teal-deep", tiles?.arrow)}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
