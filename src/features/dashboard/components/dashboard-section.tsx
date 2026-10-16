import { useId, type ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

interface DashboardSectionProps {
  readonly title: string;
  readonly description?: string;
  /** A single call to action, shown only when the role may act on it. */
  readonly action?: { readonly href: string; readonly label: string };
  readonly children: ReactNode;
}

export function DashboardSection({
  title,
  description,
  action,
  children,
}: DashboardSectionProps) {
  /* An id from React, not the title: a Khmer title has no letters a-z to make one from. */
  const id = `section-${useId()}`;

  return (
    <section aria-labelledby={id}>
      <div className="mb-2.5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-md font-semibold text-ink" id={id}>
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 max-w-3xl text-sm text-muted">{description}</p>
          ) : null}
        </div>

        {action ? (
          <Link
            className={buttonVariants({ variant: "secondary", size: "sm" })}
            href={action.href}
          >
            {action.label}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}
