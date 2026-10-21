"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { DestinationChoice } from "@/features/corridors/api/contracts";
import { isUnpinned, isUnpublished } from "@/features/corridors/itinerary-draft";
import { cn } from "@/lib/utils";

const SHOWN = 20;

interface DestinationPickerProps {
  readonly destinations: readonly DestinationChoice[];
  readonly onPick: (destination: DestinationChoice) => void;
  /** Absent when the search is part of the page rather than opened by a button. */
  readonly onClose?: () => void;
  readonly autoFocus?: boolean;
  readonly placeholder?: string;
}

/**
 * Finds an existing destination by name, province or category, shown with
 * its photo and a line about it so the right place is chosen, and adds it as a stop.
 * The search stays open after a pick, so a day's stops go in one after
 * another. A draft, or a place with no pin on the map, is shown as such: it
 * can be added, but it cannot be published or routed until that is fixed.
 */
export function DestinationPicker({
  destinations,
  onPick,
  onClose,
  autoFocus = false,
  placeholder,
}: DestinationPickerProps) {
  const t = useTranslations("corridors");
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(autoFocus);
  const showList = focused || query.trim() !== "";

  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return destinations
      .filter((destination) => {
        const text = `${destination.name} ${destination.provinceName ?? ""} ${destination.categories.join(" ")}`.toLowerCase();
        return words.every((word) => text.includes(word));
      })
      .slice(0, SHOWN);
  }, [destinations, query]);

  function pick(destination: DestinationChoice) {
    onPick(destination);
    setQuery("");
    setActive(0);
  }

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = matches[active];
      if (chosen) pick(chosen);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (query) setQuery("");
      else onClose?.();
    }
  }

  return (
    <div className={cn("rounded-lg border bg-paper", showList ? "border-line shadow-sm" : "border-transparent")}>
      <div className={cn("flex items-center gap-2 p-2", showList && "border-b border-line")}>
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
          <Input
            aria-activedescendant={showList && matches[active] ? `${listId}-${matches[active].id}` : undefined}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showList}
            aria-label={t("picker.label")}
            autoFocus={autoFocus}
            className="pl-8"
            onBlur={() => setFocused(false)}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={keys}
            placeholder={placeholder ?? t("picker.placeholder")}
            role="combobox"
            value={query}
          />
        </div>
        {onClose ? (
          <button
            aria-label={t("picker.close")}
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-sand-deep hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>

      {showList ? (
        <ul
          className="quiet-scroll max-h-96 overflow-y-auto py-1"
          id={listId}
          /* Choosing with the mouse must not blur the search first, or the list closes under the click. */
          onMouseDown={(event) => event.preventDefault()}
          role="listbox"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-muted">{t("picker.noMatch", { query: query.trim() })}</li>
          ) : (
            matches.map((destination, index) => (
              <li
                aria-selected={index === active}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2.5",
                  index === active ? "bg-teal-soft" : "hover:bg-sand",
                )}
                id={`${listId}-${destination.id}`}
                key={destination.id}
                onClick={() => pick(destination)}
                onMouseEnter={() => setActive(index)}
                role="option"
              >
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-sand">
                  {destination.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a small thumbnail from the API's media path
                    <img alt="" className="size-full object-cover" loading="lazy" src={destination.coverUrl} />
                  ) : (
                    <MapPin aria-hidden className="size-4 text-muted" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-ink">{destination.name}</span>
                    {isUnpinned(destination) ? <Badge tone="warning">{t("words.noMapPin")}</Badge> : null}
                    {isUnpublished(destination) ? <Badge>{t("words.draft")}</Badge> : null}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {[destination.provinceName ?? t("words.noProvince"), ...destination.categories].join(" · ")}
                  </span>
                  {destination.shortDescription ? (
                    <span className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{destination.shortDescription}</span>
                  ) : null}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
