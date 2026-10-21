"use client";

import { Fragment, useEffect, useEffectEvent, useId, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, CircleAlert, FileClock, Info, RotateCcw, RotateCw, Search, SearchX, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import type { AuditAction, AuditLogResponse } from "@/features/dashboard/api/contracts";
import {
  AUDIT_ACTION_TONES,
  AUDIT_ACTIONS,
  AUDIT_DEFAULT_PAGE_SIZE,
  AUDIT_FETCH_LIMIT,
  AUDIT_PAGE_SIZES,
  auditCountsOf,
  auditRowsOf,
  matchesSearch,
  type AuditEntityOption,
  type AuditPerson,
  type AuditRow,
  type AuditServerFilters,
  type AuditSummary,
} from "@/features/dashboard/audit";
import { auditTypePlural, auditWordsOf } from "@/features/dashboard/audit-words";
import { AuditEventDrawer } from "@/features/dashboard/components/audit-event-drawer";
import { isUuid } from "@/lib/ids";
import { cn } from "@/lib/utils";

interface AuditLogProps {
  /** Null when the API did not answer. */
  readonly entries: readonly AuditLogResponse[] | null;
  readonly filters: AuditServerFilters;
  /** The server's clock, so server and browser agree on "Today". */
  readonly now: string;
  /** Everyone who made a change, for the By filter. */
  readonly people: readonly AuditPerson[];
  readonly typeOptions: readonly AuditEntityOption[];
}

/** Everything the URL holds: the API's filters plus the browser's search and page size. */
interface AuditQuery extends AuditServerFilters {
  readonly q: string;
  readonly size: number;
}

const SERVER_KEYS = ["entityType", "action", "userId", "entityId"] as const;
const CLEARED: Pick<AuditQuery, "entityType" | "action" | "userId" | "entityId" | "q"> = {
  entityType: "",
  action: "",
  userId: "",
  entityId: "",
  q: "",
};
/* Time, action, record, by, what changed, view; below xl only time, record and view show. */
const COLUMNS = 6;
const NARROW_COLUMNS = 3;

function urlOf(pathname: string, query: AuditQuery): string {
  const params = new URLSearchParams();
  if (query.entityType) params.set("entityType", query.entityType);
  if (query.action) params.set("action", query.action);
  if (query.userId) params.set("user", query.userId);
  if (query.entityId) params.set("record", query.entityId);
  if (query.q) params.set("q", query.q);
  if (query.size !== AUDIT_DEFAULT_PAGE_SIZE) params.set("size", String(query.size));
  const text = params.toString();
  return text ? `${pathname}?${text}` : pathname;
}

function sizeOf(value: string | null): number {
  const size = Number(value);
  return (AUDIT_PAGE_SIZES as readonly number[]).includes(size) ? size : AUDIT_DEFAULT_PAGE_SIZE;
}

function summaryText(summary: AuditSummary, more: (count: number) => string): string {
  if (summary.note) return summary.note;
  return summary.more ? `${summary.fields.join(", ")} ${more(summary.more)}` : summary.fields.join(", ");
}

/** The browser-side part of the URL: the search and the page size. */
function useViewParams(): { readonly q: string; readonly size: number } {
  const params = useSearchParams();
  return { q: (params.get("q") ?? "").trim(), size: sizeOf(params.get("size")) };
}

export function AuditLog({ entries, filters, now, people, typeOptions }: AuditLogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { q, size } = useViewParams();
  const [pending, startTransition] = useTransition();
  const surface = useRef<HTMLElement>(null);

  const applied: AuditQuery = { ...filters, q, size };
  const filtered = SERVER_KEYS.some((key) => Boolean(filters[key])) || Boolean(q);

  const t = useTranslations("audit");
  const locale = useLocale();
  const messages = useMessages();
  const words = useMemo(
    () => auditWordsOf(messages, locale, (count) => t("words.removed", { count })),
    [messages, locale, t],
  );
  const recordTypes = useMemo(
    () =>
      typeOptions
        .map((option) => ({ value: option.value, label: auditTypePlural(messages.audit, option.value, option.label) }))
        /* "en" collation: the server and a browser without Khmer data must sort alike. */
        .sort((a, b) => a.label.localeCompare(b.label, "en")),
    [typeOptions, messages.audit],
  );
  const rows = useMemo(() => (entries ? auditRowsOf(entries, new Date(now), words) : []), [entries, now, words]);
  const { visible, counts } = useMemo(() => {
    const matching = q ? rows.filter((row) => matchesSearch(row, q)) : rows;
    return { visible: matching, counts: auditCountsOf(matching) };
  }, [rows, q]);
  const capped = (entries?.length ?? 0) >= AUDIT_FETCH_LIMIT;

  /* The page goes back to 1 whenever the list itself changes. */
  const listKey = `${entries?.length ?? "none"}:${entries?.[0]?.id ?? ""}:${q}:${size}:${SERVER_KEYS.map((key) => filters[key]).join("|")}`;
  const [paging, setPaging] = useState({ key: listKey, page: 1 });
  const pageCount = Math.max(1, Math.ceil(visible.length / size));
  const page = Math.min(paging.key === listKey ? paging.page : 1, pageCount);
  const pageRows = visible.slice((page - 1) * size, page * size);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIndex = selectedId == null ? -1 : visible.findIndex((row) => row.id === selectedId);
  const selected = selectedIndex === -1 ? null : visible[selectedIndex];

  /* The search box follows the URL when something else changes it: Clear filters, Back. */
  const [search, setSearch] = useState(q);
  const [searchFor, setSearchFor] = useState(q);
  if (searchFor !== q) {
    setSearchFor(q);
    if (search.trim() !== q) setSearch(q);
  }

  function goToPage(next: number, scroll = true) {
    setPaging({ key: listKey, page: next });
    const element = surface.current;
    if (scroll && element && element.getBoundingClientRect().top < 0) element.scrollIntoView({ block: "start" });
  }

  function selectAt(index: number) {
    const row = visible[index];
    if (!row) return;
    setSelectedId(row.id);
    goToPage(Math.floor(index / size) + 1, false);
  }

  /** The API's filters go through the server; search and page size only change the URL. */
  function apply(changes: Partial<AuditQuery>, replace = false) {
    const next = { ...applied, ...changes };
    const url = urlOf(pathname, next);
    setSelectedId(null);
    if (SERVER_KEYS.some((key) => next[key] !== filters[key])) {
      startTransition(() => router.push(url, { scroll: false }));
    } else if (replace) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
  }

  /* Typing searches after a short pause; a pasted record ID opens that record's whole history. */
  const commitSearch = useEffectEvent((text: string) => {
    if (isUuid(text)) {
      setSearch("");
      apply({ entityId: text.toLowerCase(), q: "" });
    } else {
      apply({ q: text }, true);
    }
  });
  useEffect(() => {
    const text = search.trim();
    if (text === q) return;
    const timer = window.setTimeout(() => commitSearch(text), 300);
    return () => window.clearTimeout(timer);
  }, [search, q]);

  const reset = () => {
    setSearch("");
    apply(CLEARED);
  };
  const retry = () => startTransition(() => router.refresh());
  const recordName = rows.find((row) => row.entityId === filters.entityId && row.name)?.name ?? t("filters.thisRecord");

  return (
    <>
      <section aria-label={t("title")} className="panel min-w-0 scroll-mt-20 overflow-hidden" ref={surface}>
        <div className="flex flex-col gap-2 border-b border-line p-3" role="search">
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-[minmax(14rem,1fr)_11rem_10rem_12rem_auto]">
            <div className="relative sm:col-span-3 xl:col-span-1">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
              <Input
                aria-label={t("filters.label")}
                className="h-8 pr-8 pl-8 text-sm [&::-webkit-search-cancel-button]:hidden"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("filters.placeholder")}
                type="search"
                value={search}
              />
              {search ? (
                <button
                  aria-label={t("filters.clearSearch")}
                  className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-sm text-muted hover:bg-sand-deep hover:text-ink"
                  onClick={() => setSearch("")}
                  type="button"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              ) : null}
            </div>

            <Select aria-label={t("filters.recordType")} className="h-8 text-sm" onChange={(event) => apply({ entityType: event.target.value })} value={filters.entityType}>
              <option value="">{t("filters.allRecords")}</option>
              {recordTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              aria-label={t("filters.action")}
              className="h-8 text-sm"
              onChange={(event) => apply({ action: event.target.value as AuditAction | "" })}
              value={filters.action}
            >
              <option value="">{t("filters.allActions")}</option>
              {AUDIT_ACTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`actions.${value}`)}
                </option>
              ))}
            </Select>

            <Select aria-label={t("filters.by")} className="h-8 text-sm" onChange={(event) => apply({ userId: event.target.value })} value={filters.userId}>
              <option value="">{t("filters.byAnyone")}</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {t("filters.byPerson", { name: person.name })}
                </option>
              ))}
            </Select>

            {filtered ? (
              <Button className="justify-self-start" disabled={pending} onClick={reset} size="sm" type="button" variant="ghost">
                <RotateCcw aria-hidden className="size-3.5" />
                {t("filters.clear")}
              </Button>
            ) : null}
          </div>

          {filters.entityId ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              {t("filters.recordOnly")}
              <button
                aria-label={t("filters.recordOnlyRemove", { name: recordName })}
                className="inline-flex h-6 max-w-72 items-center gap-1 rounded-md border border-line-strong bg-sand pr-1 pl-2 font-medium text-ink-soft hover:border-line-hover hover:text-ink"
                onClick={() => apply({ entityId: "" })}
                type="button"
              >
                <span className="truncate">{recordName}</span>
                <X aria-hidden className="size-3 shrink-0" />
              </button>
            </div>
          ) : null}
        </div>

        {entries && visible.length && !pending ? (
          <p aria-live="polite" className="border-b border-line px-4 py-2 text-xs text-muted tabular-nums">
            <span className="font-medium text-ink-soft">{t("counts.changes", { count: counts.total })}</span>
            {q ? ` ${t("counts.match", { count: counts.total, query: q })}` : null}
            <span aria-hidden> · </span>
            {t("counts.created", { count: counts.CREATE })}
            <span aria-hidden> · </span>
            {t("counts.updated", { count: counts.UPDATE })}
            <span aria-hidden> · </span>
            {t("counts.deleted", { count: counts.DELETE })}
          </p>
        ) : null}

        {pending ? (
          <AuditTable busy onOpen={() => undefined} rows={[]} selectedId={null} skeleton={Math.min(Math.max(pageRows.length, 6), 10)} />
        ) : entries === null ? (
          <LoadFailed onRetry={retry} />
        ) : visible.length === 0 ? (
          rows.length === 0 && !filtered ? (
            <EmptyState
              description={t("empty.noneText")}
              icon={FileClock}
              title={t("empty.noneTitle")}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              action={
                <Button onClick={reset} size="sm" type="button" variant="secondary">
                  <RotateCcw aria-hidden className="size-3.5" />
                  {t("filters.clear")}
                </Button>
              }
              description={t("empty.filteredText")}
              icon={SearchX}
              title={t("empty.filteredTitle")}
            />
          ) : (
            <EmptyState
              action={
                <Button onClick={() => setSearch("")} size="sm" type="button" variant="secondary">
                  <X aria-hidden className="size-3.5" />
                  {t("empty.clearSearch")}
                </Button>
              }
              description={t("empty.searchText")}
              icon={SearchX}
              title={t("empty.searchTitle", { query: q })}
            />
          )
        ) : (
          <>
            <AuditTable onOpen={setSelectedId} rows={pageRows} selectedId={selected?.id ?? null} />
            <footer className="flex flex-col gap-2 border-t border-line px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted tabular-nums">
                {t.rich("footer.showing", {
                  b: (chunks) => <span className="font-medium text-ink-soft">{chunks}</span>,
                  from: (page - 1) * size + 1,
                  to: (page - 1) * size + pageRows.length,
                  total: visible.length,
                })}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <PageSize onChange={(next) => apply({ size: next })} value={size} />
                <Pagination onPage={goToPage} page={page} pageCount={pageCount} />
              </div>
            </footer>
          </>
        )}

        {capped && !pending ? (
          <p className="flex items-start gap-2 border-t border-line bg-sand px-3 py-2 text-xs text-muted">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            {t("capped", { limit: AUDIT_FETCH_LIMIT })}
          </p>
        ) : null}
      </section>

      {selected ? (
        <AuditEventDrawer
          onActorHistory={
            selected.userId && selected.userId !== filters.userId
              ? () => apply({ ...CLEARED, userId: selected.userId! })
              : undefined
          }
          onClose={() => setSelectedId(null)}
          onNewer={selectedIndex > 0 ? () => selectAt(selectedIndex - 1) : undefined}
          onOlder={selectedIndex < visible.length - 1 ? () => selectAt(selectedIndex + 1) : undefined}
          onRecordHistory={
            selected.entityId && selected.entityId !== filters.entityId
              ? () => apply({ ...CLEARED, entityId: selected.entityId! })
              : undefined
          }
          position={selectedIndex + 1}
          row={selected}
          total={visible.length}
        />
      ) : null}
    </>
  );
}

function AuditTable({
  rows,
  selectedId,
  onOpen,
  busy = false,
  skeleton = 0,
}: {
  readonly rows: readonly AuditRow[];
  readonly selectedId: number | null;
  readonly onOpen: (id: number) => void;
  readonly busy?: boolean;
  readonly skeleton?: number;
}) {
  const t = useTranslations("audit.table");
  return (
    <Table aria-busy={busy || undefined} className="table-fixed">
      <caption className="sr-only">{t("caption")}</caption>
      <TableHead>
        <TableRow className="hover:bg-transparent">
          <TableHeaderCell className="w-16 sm:w-20" title={t("timeHint")}>
            {t("time")}
          </TableHeaderCell>
          <TableHeaderCell className="hidden w-40 xl:table-cell">{t("action")}</TableHeaderCell>
          <TableHeaderCell>{t("record")}</TableHeaderCell>
          <TableHeaderCell className="hidden w-[20%] xl:table-cell">{t("by")}</TableHeaderCell>
          <TableHeaderCell className="hidden w-[26%] xl:table-cell">{t("whatChanged")}</TableHeaderCell>
          <TableHeaderCell className="w-12 sm:w-20">
            <span className="sr-only">{t("view")}</span>
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody className={cn(skeleton > 0 && "animate-pulse")}>
        {skeleton > 0
          ? Array.from({ length: skeleton }, (_, index) => <SkeletonRow key={index} />)
          : rows.map((row, index) => (
              <Fragment key={row.id}>
                {index === 0 || rows[index - 1].day !== row.day ? (
                  <tr className="bg-sand">
                    {/* Spanning hidden columns would make the table keep room for them. */}
                    <th className="px-4 py-1.5 text-left text-xs font-semibold text-ink-soft xl:hidden" colSpan={NARROW_COLUMNS} scope="colgroup">
                      {row.day}
                    </th>
                    <th className="hidden px-4 py-1.5 text-left text-xs font-semibold text-ink-soft xl:table-cell" colSpan={COLUMNS} scope="colgroup">
                      {row.day}
                    </th>
                  </tr>
                ) : null}
                <AuditTableRow onOpen={onOpen} row={row} selected={row.id === selectedId} />
              </Fragment>
            ))}
      </TableBody>
    </Table>
  );
}

function AuditTableRow({
  row,
  selected,
  onOpen,
}: {
  readonly row: AuditRow;
  readonly selected: boolean;
  readonly onOpen: (id: number) => void;
}) {
  const t = useTranslations("audit");
  const purge = row.action === "PURGE";
  const primary = purge ? t("table.auditLog") : (row.name ?? row.typeLabel);
  const secondary = purge ? t("table.everyEntry") : row.name ? row.typeLabel : null;
  const badge = (
    <Badge dot tone={AUDIT_ACTION_TONES[row.action]}>
      {t(`actions.${row.action}`)}
    </Badge>
  );

  return (
    <TableRow
      aria-selected={selected || undefined}
      className={cn("cursor-pointer", selected && "bg-teal-soft hover:bg-teal-soft")}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("a, button")) onOpen(row.id);
      }}
    >
      <TableCell className="py-2.5 align-top">
        <time className="text-sm text-ink tabular-nums" dateTime={row.iso} title={row.at}>
          {row.time}
        </time>
      </TableCell>

      <TableCell className="hidden py-2.5 align-top xl:table-cell">{badge}</TableCell>

      <TableCell className="py-2.5 align-top">
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 xl:hidden">{badge}</span>
          <span className="truncate font-medium text-ink" title={primary}>
            {primary}
          </span>
        </span>
        {secondary ? <span className="block truncate text-xs text-muted">{secondary}</span> : null}
        <span className="block truncate text-xs text-muted xl:hidden" title={row.summary.title || undefined}>
          {t("table.summaryBy", { summary: summaryText(row.summary, (count) => t("table.more", { count })), actor: row.actor })}
        </span>
      </TableCell>

      <TableCell className="hidden py-2.5 align-top xl:table-cell">
        <span className={cn("block truncate text-sm", row.userId ? "text-ink-soft" : "text-muted")} title={row.actor}>
          {row.actor}
        </span>
        {row.actorEmail ? (
          <span className="block truncate text-xs text-muted" title={row.actorEmail}>
            {row.actorEmail}
          </span>
        ) : !row.userId ? (
          <span className="block text-xs text-muted">{t("table.automatic")}</span>
        ) : null}
      </TableCell>

      <TableCell className="hidden py-2.5 align-top xl:table-cell">
        <ChangeSummary summary={row.summary} />
      </TableCell>

      <TableCell className="py-2 text-right align-top">
        <Button
          aria-haspopup="dialog"
          aria-label={t("table.viewLabel", { name: primary, time: row.time })}
          onClick={() => onOpen(row.id)}
          className="px-2"
          size="sm"
          type="button"
          variant="ghost"
        >
          <span className="hidden sm:inline">{t("table.view")}</span>
          <ChevronRight aria-hidden className="size-4 sm:hidden" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ChangeSummary({ summary }: { readonly summary: AuditSummary }) {
  const t = useTranslations("audit.table");
  if (summary.note) {
    return <span className="block truncate text-sm text-muted">{summary.note}</span>;
  }
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={summary.title}>
      <span className="truncate text-sm text-ink-soft">{summary.fields.join(", ")}</span>
      {summary.more ? (
        <span className="shrink-0 rounded-sm bg-sand-deep px-1.5 text-2xs leading-5 font-medium text-muted tabular-nums">
          {t("more", { count: summary.more })}
        </span>
      ) : null}
    </span>
  );
}

function SkeletonRow() {
  const bar = "rounded-sm bg-sand-deep";
  return (
    <tr>
      <td className="px-4 py-3">
        <div className={cn(bar, "h-3.5 w-11")} />
      </td>
      <td className="hidden px-4 py-3 xl:table-cell">
        <div className="h-5 w-20 rounded-full bg-sand-deep" />
      </td>
      <td className="px-4 py-3">
        <div className={cn(bar, "h-3.5 w-3/5")} />
        <div className={cn(bar, "mt-1.5 h-3 w-2/5")} />
      </td>
      <td className="hidden px-4 py-3 xl:table-cell">
        <div className={cn(bar, "h-3.5 w-3/4")} />
      </td>
      <td className="hidden px-4 py-3 xl:table-cell">
        <div className={cn(bar, "h-3.5 w-2/3")} />
      </td>
      <td className="px-4 py-3">
        <div className={cn(bar, "ml-auto h-6 w-6 sm:w-12")} />
      </td>
    </tr>
  );
}

function LoadFailed({ onRetry }: { readonly onRetry: () => void }) {
  const t = useTranslations("audit.failed");
  const common = useTranslations("common");
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center" role="alert">
      <span className="mb-3 grid size-9 place-items-center rounded-lg border border-heritage/20 bg-heritage-soft text-heritage">
        <CircleAlert aria-hidden className="size-4" />
      </span>
      <p className="text-sm font-semibold text-ink">{t("title")}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{t("text")}</p>
      <Button className="mt-4" onClick={onRetry} size="sm" type="button" variant="secondary">
        <RotateCw aria-hidden className="size-3.5" />
        {common("tryAgain")}
      </Button>
    </div>
  );
}

function PageSize({ value, onChange }: { readonly value: number; readonly onChange: (size: number) => void }) {
  const t = useTranslations("common.pagination");
  const id = useId();
  return (
    <span className="flex items-center gap-2">
      <label className="text-xs text-muted" htmlFor={id}>
        {t("rowsPerPage")}
      </label>
      <Select className="h-8 w-19 text-sm" id={id} onChange={(event) => onChange(Number(event.target.value))} value={String(value)}>
        {AUDIT_PAGE_SIZES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </span>
  );
}

/** Page numbers with gaps: 1 … 4 5 6 … 8. */
function pageWindow(page: number, count: number): readonly (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);
  const pages = new Set([1, count, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (page >= count - 2) [count - 3, count - 2, count - 1].forEach((value) => pages.add(value));
  const sorted = [...pages].filter((value) => value >= 1 && value <= count).sort((a, b) => a - b);
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1] > 1 ? ["gap" as const, value] : [value]));
}

function Pagination({
  page,
  pageCount,
  onPage,
}: {
  readonly page: number;
  readonly pageCount: number;
  readonly onPage: (page: number) => void;
}) {
  const t = useTranslations("common.pagination");
  return (
    <nav aria-label={t("label")} className="flex items-center gap-1">
      <Button
        aria-label={t("previous")}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        size="icon-sm"
        type="button"
        variant="secondary"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </Button>
      <span className="px-1.5 text-xs text-muted tabular-nums sm:hidden">
        {t("pageOf", { page, count: pageCount })}
      </span>
      <span className="hidden items-center gap-0.5 sm:flex">
        {pageWindow(page, pageCount).map((item, index) =>
          item === "gap" ? (
            <span aria-hidden className="px-1 text-xs text-muted" key={`gap-${index}`}>
              …
            </span>
          ) : (
            <button
              aria-current={item === page ? "page" : undefined}
              aria-label={t("page", { page: item })}
              className={cn(
                "h-8 min-w-8 rounded-md px-2 text-xs font-medium tabular-nums transition-colors",
                item === page ? "bg-teal-soft text-teal-deep" : "text-ink-soft hover:bg-sand-deep hover:text-ink",
              )}
              key={item}
              onClick={() => onPage(item)}
              type="button"
            >
              {item}
            </button>
          ),
        )}
      </span>
      <Button
        aria-label={t("next")}
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
        size="icon-sm"
        type="button"
        variant="secondary"
      >
        <ChevronRight aria-hidden className="size-4" />
      </Button>
    </nav>
  );
}
