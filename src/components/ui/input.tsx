import * as React from "react";
import { cn } from "@/lib/utils";

/** Every text-like control shares one look: default, hover, focus, error, disabled. */
export const controlClassName =
  "flex w-full rounded-md border border-line-strong bg-field px-3 py-1.5 text-base text-ink shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-muted/80 hover:border-line-hover focus:border-teal focus:ring-3 focus:ring-teal/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted aria-invalid:border-heritage aria-invalid:ring-heritage/15";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(controlClassName, "h-9", className)}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}
