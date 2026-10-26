import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface PageHeaderProps {
  /** A small label above the title, usually the sidebar group the page is in. */
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  /** The page's sidebar icon, in a tile beside the title. */
  readonly icon?: LucideIcon;
  /** Renders a back link above the title, in place of the eyebrow. */
  readonly backHref?: string;
  readonly backLabel?: string;
  /** Primary actions, pinned right on desktop and wrapped below on a phone. */
  readonly actions?: ReactNode;
}

/** The top of a page: where it is, what it is, and its main action. No banner, no card. */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  backHref,
  backLabel,
  actions,
}: PageHeaderProps) {
  const t = useTranslations("common");
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {backHref ? (
          <Link
            className="mb-1.5 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
            href={backHref}
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            {backLabel ?? t("back")}
          </Link>
        ) : eyebrow ? (
          <p className="mb-1 text-xs font-medium text-muted">{eyebrow}</p>
        ) : null}

        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-paper text-teal shadow-xs">
              <Icon aria-hidden className="size-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="heading text-2xl font-semibold text-ink">{title}</h1>

            {description ? (
              <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>
            ) : null}
          </div>
        </div>
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
