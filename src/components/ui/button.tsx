import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Four kinds of action, and one of them per screen region is primary.
 *
 * - `default` — the one thing this region is for. Filled AMS blue.
 * - `secondary` — a real action that is not the main one. Outlined, neutral.
 * - `ghost` — tertiary: toolbar icons, Cancel, Back.
 * - `destructive` — deletes or revokes. Red, and never the only confirmation.
 * - `dangerGhost` — the quiet first step of a delete: red words, no fill.
 *
 * Under the pointer every kind but `link` becomes the purple pill, white words and icon.
 */
const hoverPill = "hover:rounded-full! hover:border-transparent! hover:bg-pill! hover:text-pill-foreground!";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,border-radius] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground shadow-xs ${hoverPill}`,
        secondary: `border border-line-strong bg-paper text-ink-soft shadow-xs ${hoverPill}`,
        destructive: `bg-destructive text-destructive-foreground shadow-xs ${hoverPill}`,
        ghost: `text-ink-soft ${hoverPill}`,
        dangerGhost: `text-heritage ${hoverPill}`,
        link: "h-auto px-0 text-teal-deep underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-2.5 text-xs",
        lg: "h-10 px-4",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { buttonVariants };
