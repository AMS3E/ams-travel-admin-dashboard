import * as React from "react";
import { ChevronDown } from "lucide-react";
import { controlClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A native `<select>`, not a listbox rebuilt in React.
 *
 * The catalogue has dropdowns with three options and dropdowns with two hundred
 * provinces. The native control gets keyboard type-ahead, mobile pickers, and
 * form validation for free, and it is the one control that never traps focus.
 */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative" data-slot="select">
      <select
        className={cn(
          controlClassName,
          "h-9 appearance-none pr-8",
          /* An empty value is a placeholder, so grey it like one. */
          "[&:has(option[value='']:checked)]:text-muted",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
