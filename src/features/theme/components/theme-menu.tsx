"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { THEME_CHOICES, type ThemeChoice } from "@/features/theme/theme";
import { useTheme } from "@/features/theme/use-theme";
import { cn } from "@/lib/utils";

/* Words for each choice are in shell.json, under theme. */
const OPTIONS: Readonly<Record<ThemeChoice, { readonly icon: LucideIcon }>> = {
  light: { icon: Sun },
  dark: { icon: Moon },
  system: { icon: Monitor },
};

/**
 * The top bar's theme switch: Light, Dark or System, remembered in this
 * browser. A menu of radio items — arrow keys move, Enter or Space chooses,
 * Escape closes and returns focus to the button.
 */
export function ThemeMenu() {
  const t = useTranslations("shell.theme");
  const { choice, theme, setChoice } = useTheme();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const current = OPTIONS[choice];
  const Icon = current.icon;

  useEffect(() => {
    if (!open) return;
    items.current[THEME_CHOICES.indexOf(choice)]?.focus();

    function closeOutside(event: Event) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
    // Focus goes to the chosen item when the menu opens, not every time the choice changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.current.findIndex((item) => item === document.activeElement);
    const last = THEME_CHOICES.length - 1;
    const move = (to: number) => {
      event.preventDefault();
      items.current[(to + THEME_CHOICES.length) % THEME_CHOICES.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(last);
    else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") close(false);
  }

  return (
    <div className="relative shrink-0" ref={container}>
      <Button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={choice === "system" ? t("currentSystem", { label: t("system.label"), resolved: t(`${theme}.label`) }) : t("current", { label: t(`${choice}.label`) })}
        className={cn("text-ink-soft", open && "bg-sand-deep text-ink")}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        ref={trigger}
        size="icon-sm"
        title={t("title")}
        variant="ghost"
      >
        <Icon aria-hidden className="size-4" strokeWidth={1.75} />
      </Button>

      {open ? (
        <div
          aria-label={t("title")}
          className="glass absolute top-full right-0 z-50 mt-1.5 w-52 rounded-lg border border-line p-1 shadow-pop"
          id={menuId}
          onKeyDown={onMenuKeyDown}
          role="menu"
        >
          <p className="px-2 pt-1.5 pb-1 text-2xs font-medium text-muted">{t("appearance")}</p>
          {THEME_CHOICES.map((option, index) => {
            const { icon: OptionIcon } = OPTIONS[option];
            const label = t(`${option}.label`);
            const hint = t(`${option}.hint`);
            const selected = option === choice;
            return (
              <button
                aria-checked={selected}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  selected ? "bg-teal-soft text-teal-deep" : "text-ink-soft hover:bg-sand-deep hover:text-ink",
                )}
                key={option}
                onClick={() => {
                  setChoice(option);
                  close(true);
                }}
                ref={(element) => {
                  items.current[index] = element;
                }}
                role="menuitemradio"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                <OptionIcon aria-hidden className={cn("size-4 shrink-0", selected ? "text-teal" : "text-muted")} strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block leading-tight font-medium">{label}</span>
                  <span className={cn("block text-2xs leading-tight", selected ? "text-teal-deep/80" : "text-muted")}>{hint}</span>
                </span>
                {selected ? <Check aria-hidden className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
