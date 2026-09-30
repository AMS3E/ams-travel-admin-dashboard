import * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded-sm border border-line-strong accent-teal disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-slot="checkbox"
      type="checkbox"
      {...props}
    />
  );
}
