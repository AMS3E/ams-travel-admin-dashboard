"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Search, filters, sort and the primary action, on one line above the data. */
export function Toolbar({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5", className)}>
      {children}
    </div>
  );
}

interface SearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly label: string;
  readonly placeholder?: string;
  readonly className?: string;
}

export function SearchField({ value, onChange, label, placeholder, className }: SearchFieldProps) {
  return (
    <div className={cn("relative min-w-48 flex-1", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
      <Input
        aria-label={label}
        className="h-8 pr-8 pl-8 text-sm [&::-webkit-search-cancel-button]:hidden"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value ? (
        <button
          aria-label="Clear the search"
          className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-sm text-muted hover:bg-sand-deep hover:text-ink"
          onClick={() => onChange("")}
          type="button"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly count?: number | null;
}

/** A small set of mutually exclusive filters, each with how many it holds. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  readonly options: readonly SegmentOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly label: string;
}) {
  return (
    <div aria-label={label} className="inline-flex h-8 items-center rounded-md border border-line-strong bg-sand p-0.5" role="group">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            aria-pressed={on}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
              on ? "bg-paper text-ink shadow-xs ring-1 ring-line" : "text-muted hover:text-ink",
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn("tabular-nums", on ? "text-muted" : "text-muted/80")}>{option.count ?? "–"}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
