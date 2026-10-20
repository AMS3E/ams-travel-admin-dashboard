"use client";

import { useTranslations } from "next-intl";
import { useNavText } from "@/features/shell/nav-text";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Search, X } from "lucide-react";
import { navGroups } from "@/features/shell/nav";
import { useGetCatalogPageQuery } from "@/features/catalog/api/catalog-api";
import { PublishingNotifications } from "@/features/publishing/components/publishing-notifications";
import { canManageResource } from "@/features/auth/permissions";

/**
 * The top bar's global tools: search across the screens this role can open
 * and the destinations it manages, and the publishing notifications.
 *
 * `/` focuses the search from anywhere outside a text field, as in most
 * back-office tools.
 */
export function WorkspaceTools({ accountId, grants }: {
  /** Whose notification marks these are — see `PublishingNotifications`. */
  readonly accountId: string;
  readonly grants: readonly string[];
}) {
  const t = useTranslations("shell.search");
  const nav = useNavText();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<"search" | "notifications" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const catalog = useGetCatalogPageQuery({ resource: "destinations", search, page: 0, size: 5 }, {
    skip: search.trim().length < 2 || !canManageResource(grants, "destinations"),
  });
  /* Pages are found by the names the person reads, and by their English names too. */
  const matches = navGroups(grants).flatMap((group) => group.items.map((item) => ({ ...item, label: nav.label(item.text), englishLabel: item.label, group: nav.group(group) })))
    .filter((item) => `${item.label} ${item.englishLabel} ${item.group}`.toLowerCase().includes(search.toLowerCase())).slice(0, 6);

  useEffect(() => {
    function dismiss(event: Event) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(null);
    }
    function focusSearch(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        input.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", focusSearch);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("keydown", focusSearch);
    };
  }, []);

  const destinations = catalog.currentData?.content ?? [];

  return (
    <div
      className="flex shrink-0 items-center gap-1.5"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(null);
      }}
      ref={root}
    >
      <div className="relative hidden sm:block">
        <label className="flex h-8 w-56 items-center gap-2 rounded-md border border-line-strong bg-field px-2.5 text-muted transition-[border-color,box-shadow] focus-within:border-teal focus-within:ring-3 focus-within:ring-teal/15 hover:border-line-hover lg:w-72">
          <Search aria-hidden className="size-4 shrink-0" />
          <input
            aria-label={t("label")}
            className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen("search");
            }}
            onFocus={() => setOpen("search")}
            placeholder={t("placeholder")}
            ref={input}
            value={search}
          />
          {search ? (
            <button
              aria-label={t("clear")}
              className="grid size-5 place-items-center rounded-sm hover:bg-sand-deep hover:text-ink"
              onClick={() => {
                setSearch("");
                input.current?.focus();
              }}
              type="button"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : (
            <kbd className="hidden rounded border border-line bg-sand px-1.5 font-sans text-2xs leading-4 text-muted lg:inline">/</kbd>
          )}
        </label>

        {open === "search" && search.trim() ? (
          <div className="glass absolute top-10 right-0 z-50 max-h-96 w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-line p-1 shadow-pop">
            {matches.length ? (
              <>
                <p className="px-2 pt-1.5 pb-1 text-2xs font-medium text-muted">{t("pages")}</p>
                {matches.map((item) => (
                  <Link
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sand-deep"
                    href={item.href}
                    key={item.href}
                    onClick={() => setOpen(null)}
                  >
                    <item.icon aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.label}</span>
                    <span className="shrink-0 truncate text-xs text-muted">{item.group}</span>
                  </Link>
                ))}
              </>
            ) : null}
            {destinations.length ? (
              <>
                <p className="px-2 pt-2 pb-1 text-2xs font-medium text-muted">{t("destinations")}</p>
                {destinations.map((item) => (
                  <Link
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sand-deep"
                    href={`/destinations/${item.id}`}
                    key={item.id}
                    onClick={() => setOpen(null)}
                  >
                    <MapPin aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{String(item.name)}</span>
                  </Link>
                ))}
              </>
            ) : null}
            {!matches.length && !destinations.length ? (
              <p className="px-2 py-3 text-sm text-muted">
                {catalog.isFetching
                  ? t("searching")
                  : catalog.isError
                    ? t("unavailable")
                    : t("none")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <PublishingNotifications
        accountId={accountId}
        grants={grants}
        onClose={() => setOpen(null)}
        onToggle={() => setOpen(open === "notifications" ? null : "notifications")}
        open={open === "notifications"}
      />
    </div>
  );
}
