import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    /* Wide tables scroll inside their surface, never the page body. */
    <div className="w-full overflow-x-auto" data-slot="table-scroll">
      <table
        className={cn("w-full border-collapse text-left text-sm", className)}
        data-slot="table"
        {...props}
      />
    </div>
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("border-b border-line bg-sand", className)}
      data-slot="table-head"
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn("divide-y divide-line", className)}
      data-slot="table-body"
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("transition-colors hover:bg-sand", className)}
      data-slot="table-row"
      {...props}
    />
  );
}

export function TableHeaderCell({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-9 px-4 text-xs font-medium whitespace-nowrap text-muted",
        className,
      )}
      data-slot="table-header-cell"
      scope="col"
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("px-4 py-2.5 align-middle text-ink-soft", className)}
      data-slot="table-cell"
      {...props}
    />
  );
}
