import * as React from "react";
import { controlClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  rows = 4,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlClassName, "min-h-20 resize-y py-2 leading-relaxed", className)}
      data-slot="textarea"
      rows={rows}
      {...props}
    />
  );
}
