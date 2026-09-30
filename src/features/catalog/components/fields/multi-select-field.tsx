"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { ReferenceOption } from "@/features/catalog/resource";
import { cn } from "@/lib/utils";

interface MultiSelectFieldProps {
  readonly options: readonly ReferenceOption[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly describedBy?: string;
  readonly labelledBy?: string;
  readonly invalid?: boolean;
  readonly emptyLabel: string;
  /** Above this many options the list gets its own search box. */
  readonly searchThreshold?: number;
  /**
   * The chosen values are a sequence — a corridor's stops — so they are listed
   * in their order, numbered, and can be moved up and down.
   */
  readonly ordered?: boolean;
}

/**
 * A checkbox list, not a tag input.
 *
 * These lists run from a handful of tags to every destination in the country,
 * and a checkbox list scales across that range without changing shape: the
 * chosen values stay visible at the top, and a search box appears only once
 * scanning the list stops being realistic.
 */
export function MultiSelectField({
  options,
  value,
  onChange,
  describedBy,
  labelledBy,
  invalid,
  emptyLabel,
  searchThreshold = 12,
  ordered = false,
}: MultiSelectFieldProps) {
  const [term, setTerm] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const labels = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  );

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle),
    );
  }, [options, term]);

  /* In the order they were chosen when it matters, in list order when it does not. */
  const chosen = useMemo(
    () =>
      ordered
        ? value.map((item) => ({ value: item, label: labels.get(item) ?? "Unavailable row" }))
        : options.filter((option) => selected.has(option.value)),
    [ordered, value, labels, options, selected],
  );

  function toggle(option: string) {
    onChange(
      selected.has(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  }

  function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  if (options.length === 0 && !value.length) {
    return (
      <p className="rounded-md border border-dashed border-line px-3 py-4 text-xs text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    /*
     * No `aria-invalid` here: a `group` does not support it. The error text is
     * already announced through `aria-describedby`, and the red border carries
     * the same signal visually.
     */
    <div
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-line bg-paper p-2.5",
        invalid && "border-heritage",
      )}
      role="group"
    >
      {chosen.length ? (
        ordered ? (
          <ol className="flex flex-col gap-1">
            {chosen.map((option, index) => (
              <li
                className="flex items-center gap-2 rounded-sm border border-teal/15 bg-teal-soft px-2 py-0.5 text-xs font-medium text-teal-deep"
                key={option.value}
              >
                <span className="w-5 shrink-0 text-right tabular-nums">{index + 1}.</span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <button
                  aria-label={`Move ${option.label} earlier`}
                  className="grid size-6 place-items-center rounded-sm hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  type="button"
                >
                  <ArrowUp aria-hidden className="size-3" />
                </button>
                <button
                  aria-label={`Move ${option.label} later`}
                  className="grid size-6 place-items-center rounded-sm hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                  disabled={index === chosen.length - 1}
                  onClick={() => move(index, 1)}
                  type="button"
                >
                  <ArrowDown aria-hidden className="size-3" />
                </button>
                <button
                  aria-label={`Remove ${option.label}`}
                  className="grid size-6 place-items-center rounded-sm hover:bg-primary hover:text-primary-foreground"
                  onClick={() => toggle(option.value)}
                  type="button"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {chosen.map((option) => (
              <li key={option.value}>
                <button
                  className="inline-flex items-center gap-1 rounded-sm border border-teal/15 bg-teal-soft px-2 py-0.5 text-xs font-medium text-teal-deep transition-colors hover:border-teal/40"
                  onClick={() => toggle(option.value)}
                  title={`Remove ${option.label}`}
                  type="button"
                >
                  {option.label}
                  <X aria-hidden className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {options.length > searchThreshold ? (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
          />
          <Input
            aria-label="Filter options"
            className="h-8 pl-8 text-sm"
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Filter…"
            type="search"
            value={term}
          />
        </div>
      ) : null}

      <ul className="no-scrollbar max-h-56 overflow-y-auto">
        {visible.map((option) => (
          <li key={option.value}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sand">
              <Checkbox
                checked={selected.has(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span className="min-w-0 flex-1 truncate text-ink-soft">
                {option.label}
              </span>
              {option.inactive ? <Badge tone="inactive">Retired</Badge> : null}
            </label>
          </li>
        ))}

        {visible.length === 0 ? (
          <li className="px-2 py-3 text-xs text-muted">
            {options.length ? "Nothing matches that." : emptyLabel}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
