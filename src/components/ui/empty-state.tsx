import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly icon?: LucideIcon;
  /** The one thing to do about it, when there is one. */
  readonly action?: ReactNode;
  readonly className?: string;
}

/** Nothing to show, said briefly and centred in the data area it stands in for. */
export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {Icon ? (
        <span className="mb-3 grid size-9 place-items-center rounded-lg border border-line bg-paper text-muted">
          <Icon aria-hidden className="size-4" />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
