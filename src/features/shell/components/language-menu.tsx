"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config";
import { brandImage } from "@/lib/brand";
import { cn } from "@/lib/utils";

/* Each language's flag, kept in MinIO beside the logo. */
const FLAGS: Readonly<Record<Locale, string>> = { en: brandImage("flag-en.png"), km: brandImage("flag-km.png") };

function Flag({ locale, className }: { readonly locale: Locale; readonly className?: string }) {
  return (
    <Image alt="" className={cn("h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-line", className)} height={14} src={FLAGS[locale]} unoptimized width={20} />
  );
}

/* A year: the choice outlives the session, like the theme. */
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Remembers the language for the server, which reads it on every request. */
function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/**
 * The top bar's language switch: English or Khmer, remembered in a cookie.
 * The page is asked again in place, so the URL, its filters and the form
 * being typed in stay as they are.
 */
export function LanguageMenu({ className }: { readonly className?: string }) {
  const locale = useLocale();
  const t = useTranslations("shell.language");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    items.current[LOCALES.indexOf(locale)]?.focus();

    function closeOutside(event: Event) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
    // Focus goes to the current language when the menu opens, not every time it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }

  function choose(next: Locale) {
    close(true);
    if (next === locale) return;
    rememberLocale(next);
    startTransition(() => router.refresh());
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.current.findIndex((item) => item === document.activeElement);
    const move = (to: number) => {
      event.preventDefault();
      items.current[(to + LOCALES.length) % LOCALES.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(LOCALES.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") close(false);
  }

  return (
    <div className={cn("relative shrink-0", className)} ref={container}>
      <Button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("current", { name: LOCALE_NAMES[locale] })}
        className={cn("gap-1.5 px-2 text-ink-soft", open && "bg-sand-deep text-ink")}
        disabled={pending}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        ref={trigger}
        size="sm"
        title={t("title")}
        variant="ghost"
      >
        {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Flag locale={locale} />}
        <span className="text-xs font-medium">{locale === "en" ? "EN" : LOCALE_NAMES[locale]}</span>
      </Button>

      {open ? (
        <div
          aria-label={t("title")}
          className="glass absolute top-full right-0 z-50 mt-1.5 w-48 rounded-lg border border-line p-1 shadow-pop"
          id={menuId}
          onKeyDown={onMenuKeyDown}
          role="menu"
        >
          <p className="px-2 pt-1.5 pb-1 text-2xs font-medium text-muted">{t("title")}</p>
          {LOCALES.map((option, index) => {
            const selected = option === locale;
            return (
              <button
                aria-checked={selected}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  selected ? "bg-teal-soft text-teal-deep" : "text-ink-soft hover:bg-sand-deep hover:text-ink",
                )}
                key={option}
                lang={option}
                onClick={() => choose(option)}
                ref={(element) => {
                  items.current[index] = element;
                }}
                role="menuitemradio"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                <Flag locale={option} />
                <span className="min-w-0 flex-1">
                  <span className="block leading-tight font-medium">{LOCALE_NAMES[option]}</span>
                  {/* The name in the language being read, unless that is how it names itself. */}
                  {t(`${option}.hint`) !== LOCALE_NAMES[option] ? (
                    <span className={cn("block text-2xs leading-tight", selected ? "text-teal-deep/80" : "text-muted")}>{t(`${option}.hint`)}</span>
                  ) : null}
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
