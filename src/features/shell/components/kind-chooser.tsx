import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

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
 * "What are you adding?" as cards: the kind first, then a form written for it.
 * Create Destination and Create Historical Coverage both open on one.
 */
export function KindChooser({ kinds }: { readonly kinds: readonly ChooserKind[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {kinds.map((kind) => (
        <li key={kind.key}>
          <Link
            className="panel group flex h-full items-start gap-3 p-4 transition-colors hover:border-teal hover:bg-teal-soft/40"
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
            <ArrowRight aria-hidden className="mt-1 size-4 shrink-0 text-muted transition-colors group-hover:text-teal-deep" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
