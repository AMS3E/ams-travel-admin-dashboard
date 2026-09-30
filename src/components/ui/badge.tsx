import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status, said the same way everywhere.
 *
 * A tone is a meaning, not a decoration: `success` is live or approved,
 * `warning` waits on someone, `danger` is refused, deleted or blocked, `info`
 * is an active or notable state, `neutral` is a draft or switched off. The
 * label always carries the meaning too, so colour is never the only signal.
 *
 * `active`, `gold` and `inactive` are the older names for success, warning
 * and danger, kept so every existing status map still reads correctly.
 */
const badgeVariants = cva(
  "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs leading-none font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-line bg-sand text-ink-soft",
        success: "border-success/15 bg-success-soft text-success",
        warning: "border-gold-deep/15 bg-gold-soft text-gold-deep",
        danger: "border-heritage/15 bg-heritage-soft text-heritage",
        info: "border-teal/15 bg-teal-soft text-teal-deep",
        active: "border-success/15 bg-success-soft text-success",
        gold: "border-gold-deep/15 bg-gold-soft text-gold-deep",
        inactive: "border-heritage/15 bg-heritage-soft text-heritage",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** A leading dot, for a status read down a column. */
  readonly dot?: boolean;
}

export function Badge({ className, tone, dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ tone, className }))}
      data-slot="badge"
      {...props}
    >
      {dot ? <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

export { badgeVariants };
