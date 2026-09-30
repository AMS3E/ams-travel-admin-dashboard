import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface QuickLink {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

/** The half-dozen things an administrator opens without thinking. */
export function QuickAccess({ links }: { readonly links: readonly QuickLink[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {links.map((link) => {
        const Icon = link.icon;

        return (
          <Link
            className="inset-row flex min-h-[5.375rem] flex-col items-start justify-between p-3 transition-colors hover:border-teal hover:bg-teal-soft"
            href={link.href}
            key={link.href}
          >
            <Icon aria-hidden className="size-5 text-teal" />
            <span className="text-xs font-semibold text-ink">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
