import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A working surface: white, one hairline border, no shadow. Tables, forms and
 * lists sit on one; a page's own heading and its summary figures do not.
 */
export function Surface({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("panel min-w-0", className)} {...props} />;
}

interface HeadingProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  /** Controls pinned to the right: a link out, a filter, a count. */
  readonly actions?: ReactNode;
  readonly id?: string;
  readonly className?: string;
}

/** The bar across the top of a surface: what it is, and what can be done with it. */
export function SurfaceHeader({ title, description, actions, id, className }: HeadingProps) {
  return (
    <header className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3", className)}>
      <div className="min-w-0">
        <h2 className="text-md font-semibold text-ink" id={id}>
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** A section heading with no container around it, for a group of surfaces. */
export function SectionHeading({ title, description, actions, id, className }: HeadingProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-ink" id={id}>
          {title}
        </h2>
        {description ? <p className="mt-0.5 max-w-3xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
