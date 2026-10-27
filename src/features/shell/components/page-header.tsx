import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface PageHeaderProps {
  /** A small label above the title, usually the sidebar group the page is in. */
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
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

        <h1 className="heading text-2xl font-semibold text-ink">{title}</h1>

        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
