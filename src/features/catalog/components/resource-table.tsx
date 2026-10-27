"use client";

import { useMemo, useState } from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Eye, EyeOff, ImageIcon, Inbox, Pencil, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { SearchField, Toolbar } from "@/components/ui/toolbar";
import { canDeleteRecord, hasPermission } from "@/features/auth/permissions";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import {
  useGetCatalogPageQuery,
  useGetCatalogQuery,
  useGetReferenceOptionsQuery,
  useDeleteRecordMutation,
  useSetRecordStatusMutation,
} from "@/features/catalog/api/catalog-api";
import { REQUEST_TONES } from "@/features/publishing/api/contracts";
import { useGetVerifiedStatusesQuery } from "@/features/verification/api/verification-api";
import { editHrefOf, type ApprovalMark, type ReviewMark } from "@/features/publishing/marks";
import {
  defaultOrder,
  isResourceOrder,
  mediaPath,
  statusOption,
  statusValueOf,
  type ReferenceOptions,
  type ResourceColumn,
  type ResourceDefinition,
  type ResourceOrder,
} from "@/features/catalog/resource";
import { useLocalizedDefinition } from "@/features/catalog/use-resource";
import { useDates } from "@/i18n/use-dates";
import { cn } from "@/lib/utils";
import { useApiErrorMessage } from "@/store/api/api-error";
import { Pager } from "@/components/ui/pager";
import { useAppSelector } from "@/store/hooks";

interface ResourceTableProps {
  readonly definition: ResourceDefinition;
  readonly referenceOptions: ReferenceOptions;
  /**
   * Row actions the signed-in role may actually carry out. A partner may edit
   * a listing it owns but not publish it, and the API says so — the table
   * simply does not offer what would come back 403.
   */
  readonly canDelete?: boolean;
  readonly canSetStatus?: boolean;
  /**
   * Deleting is decided per row rather than per table: a partner and a BDO may
   * both remove a listing that is not live, and neither may remove one that is.
   * A predicate cannot cross the server boundary, so the grants come across and
   * the same rule the API applies is evaluated here.
   */
  readonly grants?: readonly string[];
  readonly userId?: string | null;
  /** Offer "Created by me": for a list of everyone's rows the viewer also writes to. Needs `userId`. */
  readonly ownerFilter?: boolean;
  /** Only the listings this account owns — a partner's stays and foods. */
  readonly ownedBy?: string | null;
  /** Only the rows linked to this one — one tourism region's own categories. */
  readonly within?: string | null;
  /**
   * An attraction's, a stay's or a food listing's open request: shown beside
   * its name, and — waiting on the viewer — Review in place of publishing it
   * straight away, so the request is answered rather than left open.
   */
  readonly marks?: readonly ReviewMark[];
  /** Who approved each listing that went through a desk, for the "Approved by" column. */
  readonly approvals?: readonly ApprovalMark[];
  /** Whether the rows can be verified on evidence: an attraction can, a stay cannot. */
  readonly verifiable?: boolean;
  /**
   * A read-only page per row, with `{id}` standing for the row's id: the name
   * and the picture open it and the pencil keeps the form. Without it the name
   * opens the form, or the review when one waits on the viewer.
   */
  readonly detailHref?: string;
}

export function ResourceTable({
  definition: given,
  referenceOptions,
  canDelete = true,
  canSetStatus = true,
  grants,
  userId = null,
  ownerFilter = false,
  ownedBy = null,
  within = null,
  marks,
  approvals,
  verifiable = false,
  detailHref,
}: ResourceTableProps) {
  const t = useTranslations("catalog");
  const errorMessage = useApiErrorMessage();
  const { dateTime } = useDates();
  /* In the reader's language whether the page handed in a localized definition or the registry's own. */
  const definition = useLocalizedDefinition(given);
  const status = definition.status;
  const markOf = useMemo(() => new Map((marks ?? []).map((mark) => [mark.listingId, mark])), [marks]);
  const approvedBy = useMemo(() => new Map((approvals ?? []).map((mark) => [mark.listingId, mark])), [approvals]);
  /* A row with a cover is recognised by it: attractions, stays, food listings and corridors lead with theirs. */
  const thumbField = definition.fields.find((field) => field.name === "coverKey" && field.kind === "image");
  const thumbs = Boolean(thumbField);
  /* A drawn icon sits whole on white, so its lines read in either theme. */
  const drawnThumbs = thumbField?.drawn === true;
  const [term, setTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  /* A listing with types of its own — a stay's Hotel, a food listing's Cafe — can be narrowed to one. */
  const kinds = definition.fields.find((field) => field.name === "type" && field.options?.length)?.options ?? [];
  const [kindFilter, setKindFilter] = useState("all");
  const mineOnly = ownerFilter && onlyMine && userId !== null;
  /* One tourism region's own categories or tags open in that region's order. */
  const regionOrder = Boolean(within && within !== "none" && !definition.groupBy && definition.fields.some((field) => field.inverse));
  const [order, setOrder] = useState<ResourceOrder>(() => (regionOrder ? "shown" : defaultOrder(definition)));
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const query = useGetCatalogPageQuery({
    resource: definition.key,
    search: term,
    sort: order,
    status: statusFilter,
    ...(mineOnly && userId ? { createdBy: userId } : {}),
    ...(kindFilter !== "all" ? { kind: kindFilter } : {}),
    ...(ownedBy ? { ownedBy } : {}),
    ...(within ? { within } : {}),
    page: pagination.pageIndex,
    size: pagination.pageSize,
  });
  const data = query.currentData?.content ?? [];
  const { data: liveOptions } = useGetReferenceOptionsQuery({
    resource: definition.key,
    include: "columns",
  });
  /* "Used by": how many destinations carry each row — the sign a term is safe to retire. */
  const usageColumn = definition.columns.find((column) => column.kind === "usage");
  const usage = useGetCatalogQuery("destinations", { skip: !usageColumn });
  const usedBy = useMemo(() => {
    const counts = new Map<string, number>();
    const field = usageColumn?.usageField;
    if (!field) return counts;
    for (const place of usage.data ?? []) {
      const list = place[field];
      if (!Array.isArray(list)) continue;
      for (const id of list) counts.set(String(id), (counts.get(String(id)) ?? 0) + 1);
    }
    return counts;
  }, [usage.data, usageColumn]);
  const [removeRecord, remove] = useDeleteRecordMutation();
  const [changeStatus, setStatus] = useSetRecordStatusMutation();
  const compact = useAppSelector((state) => state.ui.compactTables);
  // TanStack Table 8 exposes mutable getters; keep this hook outside compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: definition.columns.map((column) => ({ accessorKey: column.name })),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: query.currentData?.totalElements ?? 0,
    state: { pagination },
    onPaginationChange: setPagination,
  });
  /** The row currently asking "are you sure?" — deletion is two clicks, never one. */
  const [confirming, setConfirming] = useState<string | null>(null);
  /*
   * Putting a destination back on the site is publishing it. An editor may
   * take one down but no longer publish — their own content goes to an
   * administrator — so the toggle is only offered one way round.
   */
  const mayRestore =
    definition.key !== "destinations" || !grants || hasPermission(grants, "PERM_DESTINATION_PUBLISH");

  /** Reference columns show names, so ids are resolved once per render, not per cell. */
  const labels = useMemo(() => {
    const byResource = new Map<string, Map<string, string>>();
    for (const [resource, options] of Object.entries(
      liveOptions ?? referenceOptions,
    )) {
      byResource.set(
        resource,
        new Map((options ?? []).map((option) => [option.value, option.label])),
      );
    }
    return byResource;
  }, [liveOptions, referenceOptions]);

  const rows = table.getRowModel().rows.map((row) => row.original);
  /* Verified on evidence, for the rows on this page alone. */
  const shownIds = rows.map((row) => row.id);
  const verified = useGetVerifiedStatusesQuery(shownIds, { skip: !verifiable || shownIds.length === 0 });
  const verifiedIds = new Set((verified.data ?? []).filter((status) => status.verified).map((status) => status.destinationId));
  /*
   * The columns this screen can answer: who approved it only where the requests
   * were read, whether it is verified only where a place can be.
   */
  const shown = definition.columns.filter(
    (column) =>
      (column.kind !== "approval" || Boolean(approvals)) && (column.kind !== "verified" || verifiable),
  );

  const failure = remove.error ?? setStatus.error ?? query.error;

  /** The line under a value: the text field when set, else the referenced row's name. */
  function detailOf(record: CatalogRecord, column: ResourceColumn): string | null {
    if (!column.detail) return null;
    const text = column.detail.text ? record[column.detail.text] : null;
    if (typeof text === "string" && text.trim()) return text.trim();
    const ref = column.detail.ref;
    const name = ref ? labels.get(ref.resource)?.get(String(record[ref.field])) : undefined;
    return name ?? null;
  }

  function renderCell(record: CatalogRecord, column: ResourceColumn) {
    const value = record[column.name];

    switch (column.kind) {
      /* Who answered the listing's request, and when — the table knows, the row does not. */
      case "approval": {
        const approval = approvedBy.get(record.id);
        return approval ? (
          <span title={dateTime(approval.at)}>{approval.by}</span>
        ) : (
          <span className="text-muted">—</span>
        );
      }

      /* How far the Khmer is written: a listing by what the API still misses, a name by itself. */
      case "khmer": {
        if (Array.isArray(value)) {
          return value.length ? (
            <Badge dot tone="warning">{t("table.khmerMissing", { count: value.length })}</Badge>
          ) : (
            <Badge dot tone="success">{t("table.khmerComplete")}</Badge>
          );
        }
        return typeof value === "string" && value.trim() ? (
          <span lang="km">{value}</span>
        ) : (
          <Badge dot tone="warning">{t("table.khmerNone")}</Badge>
        );
      }

      case "verified":
        return verifiedIds.has(record.id) ? (
          <Badge dot tone="success">{t("table.verified")}</Badge>
        ) : (
          <span className="text-muted">{verified.isLoading ? "…" : t("table.notVerified")}</span>
        );

      case "status": {
        const option = statusOption(definition, statusValueOf(definition, record));
        return option ? (
          <Badge dot tone={option.tone}>{option.label}</Badge>
        ) : (
          <span className="text-muted">—</span>
        );
      }

      case "boolean":
        return value === true ? (
          <Badge tone="info">{t("table.yes")}</Badge>
        ) : (
          <span className="text-muted">—</span>
        );

      case "image":
        return typeof value === "string" && value ? (
          <Image
            alt=""
            className="size-8 rounded-md object-cover ring-1 ring-line"
            height={32}
            src={value}
            unoptimized
            width={32}
          />
        ) : (
          <span className="text-muted">—</span>
        );

      case "ref": {
        const label = column.ref
          ? labels.get(column.ref)?.get(String(value))
          : undefined;
        return label ?? <span className="text-muted">—</span>;
      }

      case "refs": {
        const list = Array.isArray(value) ? value : [];
        if (!list.length) return <span className="text-muted">—</span>;
        /* Names when they are known — a category's regions — else how many. */
        const names = column.ref ? list.map((id) => labels.get(column.ref!)?.get(String(id))).filter(Boolean) : [];
        return names.length === list.length ? (
          <span className="line-clamp-2 text-sm">{names.join(", ")}</span>
        ) : (
          <span className="text-xs">{t("table.items", { count: list.length })}</span>
        );
      }

      case "number":
        return value == null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className="tabular-nums">{String(value)}</span>
        );

      case "usage": {
        if (usage.isLoading) return <span className="text-muted">…</span>;
        const count = usedBy.get(record.id) ?? 0;
        return <span className={cn("tabular-nums", !count && "text-muted")}>{t("table.usedBy", { count })}</span>;
      }

      case "enum": {
        if (value == null || value === "") return <span className="text-muted">—</span>;
        const option = column.options?.find((each) => each.value === value);
        return option?.label ?? String(value);
      }

      default: {
        const text = value == null ? "" : String(value);
        return text ? (
          <span className="line-clamp-2">{text}</span>
        ) : (
          <span className="text-muted">—</span>
        );
      }
    }
  }

  const totalElements = query.currentData?.totalElements ?? 0;
  const totalPages = Math.max(1, query.currentData?.totalPages ?? 1);
  const filtered = Boolean(term.trim()) || statusFilter !== "all" || mineOnly || kindFilter !== "all";

  return (
    <section aria-busy={query.isFetching} className={cn("panel min-w-0 overflow-hidden", compact && "[&_td]:py-1.5")}>
      <Toolbar>
        <SearchField
          className="max-w-sm"
          label={t("table.search", { items: definition.labelPlural.toLowerCase() })}
          onChange={(value) => {
            setTerm(value);
            table.setPageIndex(0);
          }}
          placeholder={t("table.searchPlaceholder", { items: definition.labelPlural.toLowerCase() })}
          value={term}
        />

        {status ? (
          <Select
            aria-label={t("list.filterStatus")}
            className="h-8 w-40 text-sm"
            onChange={(event) => {
              setStatusFilter(event.target.value);
              table.setPageIndex(0);
            }}
            value={statusFilter}
          >
            <option value="all">{t("list.allStatuses")}</option>
            {status.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ) : null}

        {kinds.length ? (
          <Select
            aria-label={t("table.filterType")}
            className="h-8 w-40 text-sm"
            onChange={(event) => {
              setKindFilter(event.target.value);
              table.setPageIndex(0);
            }}
            value={kindFilter}
          >
            <option value="all">{t("table.allTypes")}</option>
            {kinds.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === "CAFE" ? t("kinds.CAFE") : option.label}
              </option>
            ))}
          </Select>
        ) : null}

        {ownerFilter && userId ? (
          <Select
            aria-label={t("list.filterCreator")}
            className="h-8 w-44 text-sm"
            onChange={(event) => {
              setOnlyMine(event.target.value === "me");
              table.setPageIndex(0);
            }}
            value={onlyMine ? "me" : "anyone"}
          >
            <option value="anyone">{t("list.createdByAnyone")}</option>
            <option value="me">{t("list.createdByMe")}</option>
          </Select>
        ) : null}

        {/* A to Z first; a row added a moment ago is found with "Newest first". */}
        <Select
          aria-label={t("list.sort")}
          className="h-8 w-40 text-sm"
          onChange={(event) => {
            setOrder(isResourceOrder(event.target.value) ? event.target.value : "name");
            table.setPageIndex(0);
          }}
          value={order}
        >
          <option value="name">{t("list.sortName")}</option>
          {regionOrder ? (
            <option value="shown">{t("table.sortRegion")}</option>
          ) : definition.orderField ? (
            <option value="shown">{definition.orderField.endsWith("Year") ? t("table.sortDate") : t("table.sortShown")}</option>
          ) : null}
          <option value="newest">{t("list.sortNewest")}</option>
        </Select>

        <p aria-live="polite" className="ml-auto text-xs text-muted tabular-nums">
          {query.isFetching ? t("table.updating") : t("table.records", { count: totalElements })}
        </p>
      </Toolbar>

      {failure ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-heritage/20 bg-heritage-soft px-4 py-2 text-sm text-heritage" role="alert">
          <span className="min-w-0 flex-1">{errorMessage(failure)}</span>
          {query.isError ? (
            <Button onClick={() => query.refetch()} size="sm" variant="secondary">
              {t("table.retry")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Table>
        <TableHead>
          <TableRow className="hover:bg-transparent">
            {shown.map((column) => (
              <TableHeaderCell
                className={cn(column.secondary && "hidden md:table-cell")}
                key={column.name}
              >
                {column.label}
              </TableHeaderCell>
            ))}
            <TableHeaderCell className="w-28 text-right">
              <span className="sr-only">{t("list.actions")}</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((record) => {
            const current = statusValueOf(definition, record);
            const live = status != null && current === status.live;
            const retired = status != null && current === status.retired;
            const isConfirming = confirming === record.id;
            const deletable =
              canDelete &&
              (!grants ||
                canDeleteRecord(grants, definition.key, record, userId));
            const mark = markOf.get(record.id);
            const editHref = editHrefOf(`/${definition.key}/${record.id}`, mark);
            const openHref = detailHref ? detailHref.replace("{id}", record.id) : mark?.yours ? mark.reviewHref : editHref;
            const cover = typeof record.coverUrl === "string" && record.coverUrl
              ? record.coverUrl
              : typeof record.coverKey === "string" && record.coverKey ? mediaPath(record.coverKey) : null;

            return (
              <TableRow className={cn(retired && "text-muted")} key={record.id}>
                {shown.map((column, index) => (
                  <TableCell
                    className={cn(
                      column.secondary && "hidden md:table-cell",
                      index === 0 && "font-medium text-ink",
                    )}
                    key={column.name}
                  >
                    {index === 0 ? (
                      <span className="flex items-center gap-3">
                        {thumbs ? (
                          <Link aria-hidden className={cn("relative hidden h-9 w-12 shrink-0 overflow-hidden rounded border border-line sm:block", drawnThumbs && cover ? "bg-white" : "bg-sand-deep")} href={openHref} tabIndex={-1}>
                            {cover ? (
                              <Image alt="" className={drawnThumbs ? "object-contain p-1" : "object-cover"} fill sizes="48px" src={cover} unoptimized />
                            ) : (
                              <ImageIcon className="absolute inset-0 m-auto size-3.5 text-muted" strokeWidth={1.75} />
                            )}
                          </Link>
                        ) : null}
                        <span className="min-w-0">
                          <Link
                            className="hover:text-teal-deep hover:underline"
                            href={openHref}
                          >
                            {renderCell(record, column)}
                          </Link>
                          {detailOf(record, column) ? (
                            <span className="block truncate text-xs font-normal text-muted">{detailOf(record, column)}</span>
                          ) : null}
                          {mark ? (
                            <Badge className="ml-2 align-middle" dot tone={REQUEST_TONES[mark.status]}>{t(`marks.${mark.status}`)}</Badge>
                          ) : null}
                        </span>
                      </span>
                    ) : (
                      renderCell(record, column)
                    )}
                  </TableCell>
                ))}

                <TableCell className="py-1.5 text-right whitespace-nowrap">
                  {isConfirming ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-xs text-muted">{t("table.confirmDelete")}</span>
                      <Button
                        onClick={() => {
                          setConfirming(null);
                          void removeRecord({
                            resource: definition.key,
                            id: record.id,
                          });
                        }}
                        size="sm"
                        variant="destructive"
                      >
                        {t("table.delete")}
                      </Button>
                      <Button onClick={() => setConfirming(null)} size="sm" variant="ghost">
                        {t("table.cancel")}
                      </Button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      {/* Waiting on the viewer, it goes live by approving the request, not by this switch. */}
                      {mark?.yours ? (
                        <Link className={buttonVariants({ size: "sm", className: "mr-1" })} href={mark.reviewHref}>
                          {t("list.review")}
                          <ArrowRight aria-hidden className="size-3.5" />
                        </Link>
                      ) : status && canSetStatus && (live || mayRestore) ? (
                        <Button
                          aria-label={live ? t("table.takeOff") : t("table.putOn")}
                          className="text-muted hover:text-ink"
                          disabled={setStatus.isLoading || remove.isLoading}
                          onClick={() =>
                            void changeStatus({
                              resource: definition.key,
                              id: record.id,
                              status: live ? status.retired : status.live,
                            })
                          }
                          size="icon-sm"
                          title={
                            live
                              ? t("table.hideTitle", { label: statusOption(definition, status.retired)?.label ?? t("table.retire") })
                              : t("table.showTitle", { label: statusOption(definition, status.live)?.label ?? t("table.restore") })
                          }
                          variant="ghost"
                        >
                          {live ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                        </Button>
                      ) : null}

                      <Link
                        aria-label={t("list.edit")}
                        className="inline-grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sand-deep hover:text-ink"
                        href={editHref}
                        title={mark?.yours ? t("list.editBeforeApproving") : t("list.edit")}
                      >
                        <Pencil aria-hidden className="size-4" />
                      </Link>

                      {deletable ? (
                        <Button
                          aria-label={t("table.delete")}
                          className="text-muted hover:bg-heritage-soft hover:text-heritage"
                          disabled={remove.isLoading || setStatus.isLoading}
                          onClick={() => setConfirming(record.id)}
                          size="icon-sm"
                          title={t("table.deleteTitle")}
                          variant="ghost"
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </Button>
                      ) : null}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}

          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell className="p-0" colSpan={shown.length + 1}>
                {query.isFetching ? (
                  <p className="py-10 text-center text-sm text-muted">{t("table.loading")}</p>
                ) : query.isError ? (
                  <p className="py-10 text-center text-sm text-muted">{t("table.loadFailed")}</p>
                ) : (
                  <EmptyState
                    action={
                      filtered ? (
                        <Button
                          onClick={() => {
                            setTerm("");
                            setStatusFilter("all");
                            setOnlyMine(false);
                            setKindFilter("all");
                            table.setPageIndex(0);
                          }}
                          size="sm"
                          variant="secondary"
                        >
                          {t("list.clearFilters")}
                        </Button>
                      ) : null
                    }
                    description={
                      mineOnly && !term.trim() && statusFilter === "all"
                        ? t("table.emptyMine", { items: definition.labelPlural })
                        : filtered
                        ? t("list.noMatchText")
                        : t("table.emptyText", { items: definition.labelPlural })
                    }
                    icon={filtered ? Search : Inbox}
                    title={filtered ? t("list.noMatchTitle") : t("table.emptyTitle", { items: definition.labelPlural.toLowerCase() })}
                  />
                )}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {totalElements > 0 ? (
        <Pager busy={query.isFetching} onPage={(page) => table.setPageIndex(page)} page={pagination.pageIndex} pageCount={totalPages} />
      ) : null}
    </section>
  );
}
