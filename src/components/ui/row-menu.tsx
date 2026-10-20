"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RowMenuItem {
  readonly label: string;
  /** A link out, rendered as one; otherwise an action. */
  readonly href?: string;
  readonly onSelect?: () => void;
  readonly disabled?: boolean;
  /** Something to think twice about, such as retiring. */
  readonly danger?: boolean;
}

interface RowMenuProps {
  /** What the row is, for the button's name: "Actions for Temples". */
  readonly label: string;
  readonly items: readonly RowMenuItem[];
  readonly className?: string;
}

/**
 * A row's actions behind one three-dot button: a menu that opens on click or
 * ArrowDown, moves with the arrow keys, and closes on a choice, Escape, Tab or
 * a click elsewhere. Rendered only while open, so a table of many rows keeps
 * nothing in the page until someone asks.
 */
export function RowMenu({ label, items, className }: RowMenuProps) {
  const t = useTranslations("common.rowMenu");
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const entries = useRef<(HTMLElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  useEffect(() => {
    if (open) entries.current.find((entry) => entry && !entry.hasAttribute("aria-disabled"))?.focus();
  }, [open]);

  function close(back: boolean) {
    setOpen(false);
    if (back) trigger.current?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = entries.current.findIndex((entry) => entry === document.activeElement);
    const move = (to: number) => {
      event.preventDefault();
      entries.current[(to + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(items.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") close(false);
  }

  return (
    <div className={cn("relative inline-flex shrink-0", className)} ref={container}>
      <Button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("actionsFor", { label })}
        className={cn("size-7 text-muted hover:text-ink", open && "bg-sand-deep text-ink")}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        ref={trigger}
        size="icon-sm"
        title={t("actions")}
        type="button"
        variant="ghost"
      >
        <Ellipsis aria-hidden className="size-4" strokeWidth={1.75} />
      </Button>

      {open ? (
        <div
          aria-label={t("actionsFor", { label })}
          className="glass absolute top-full right-0 z-50 mt-1 w-44 rounded-lg border border-line p-1 text-left shadow-pop"
          id={menuId}
          onKeyDown={onMenuKeyDown}
          role="menu"
        >
          {items.map((item, index) => {
            const classes = cn(
              "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              item.disabled
                ? "cursor-not-allowed text-muted/60"
                : item.danger
                  ? "text-heritage hover:bg-heritage-soft"
                  : "text-ink-soft hover:bg-sand-deep hover:text-ink",
            );
            return item.href ? (
              <Link
                className={classes}
                href={item.href}
                key={item.label}
                onClick={() => close(false)}
                ref={(element) => {
                  entries.current[index] = element;
                }}
                role="menuitem"
                tabIndex={-1}
              >
                {item.label}
              </Link>
            ) : (
              <button
                aria-disabled={item.disabled || undefined}
                className={classes}
                key={item.label}
                onClick={() => {
                  if (item.disabled) return;
                  close(true);
                  item.onSelect?.();
                }}
                ref={(element) => {
                  entries.current[index] = element;
                }}
                role="menuitem"
                tabIndex={-1}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
