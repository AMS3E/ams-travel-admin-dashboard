"use client";

import { useMemo, useState } from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Eye, EyeOff, ImageIcon, Inbox, Pencil, Search, Trash2 } from "lucide-react";
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
import { formatDateTime } from "@/features/dashboard/format";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import {
  useGetCatalogPageQuery,
  useGetReferenceOptionsQuery,
  useDeleteRecordMutation,
  useSetRecordStatusMutation,
} from "@/features/catalog/api/catalog-api";
import { REQUEST_TONES } from "@/features/publishing/api/contracts";
import { useGetVerifiedStatusesQuery } from "@/features/verification/api/verification-api";
import { MARK_LABELS, editHrefOf, type ApprovalMark, type ReviewMark } from "@/features/publishing/marks";
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
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/store/api/api-error";

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
}

export function ResourceTable({
  definition,
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
}: ResourceTableProps) {
  const status = definition.status;
  const markOf = useMemo(() => new Map((marks ?? []).map((mark) => [mark.listingId, mark])), [marks]);
  const approvedBy = useMemo(() => new Map((approvals ?? []).map((mark) => [mark.listingId, mark])), [approvals]);
  /* A row with a cover is recognised by it: attractions, stays, food listings and travel routes lead with theirs. */
  const thumbs = definition.fields.some((field) => field.name === "coverKey" && field.kind === "image");
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
  const [removeRecord, remove] = useDeleteRecordMutation();
  const [changeStatus, setStatus] = useSetRecordStatusMutation();
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

  function renderCell(record: CatalogRecord, column: ResourceColumn) {
    const value = record[column.name];

    switch (column.kind) {
      /* Who answered the listing's request, and when — the table knows, the row does not. */
      case "approval": {
        const approval = approvedBy.get(record.id);
        return approval ? (
          <span title={formatDateTime(approval.at)}>{approval.by}</span>
        ) : (
          <span className="text-muted">—</span>
        );
      }

      case "verified":
        return verifiedIds.has(record.id) ? (
          <Badge dot tone="success">Verified</Badge>
        ) : (
          <span className="text-muted">{verified.isLoading ? "…" : "Not verified"}</span>
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
          <Badge tone="info">Yes</Badge>
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
          <span className="text-xs">
            {list.length} {list.length === 1 ? "item" : "items"}
          </span>
        );
      }

      case "number":
        return value == null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className="tabular-nums">{String(value)}</span>
        );

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
    <section aria-busy={query.isFetching} className="panel min-w-0 overflow-hidden">
      <Toolbar>
        <SearchField
          className="max-w-sm"
          label={`Search ${definition.labelPlural.toLowerCase()}`}
          onChange={(value) => {
            setTerm(value);
            table.setPageIndex(0);
          }}
          placeholder={`Search ${definition.labelPlural.toLowerCase()}…`}
          value={term}
        />

        {status ? (
          <Select
            aria-label="Filter by status"
            className="h-8 w-40 text-sm"
            onChange={(event) => {
              setStatusFilter(event.target.value);
              table.setPageIndex(0);
            }}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            {status.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ) : null}

        {kinds.length ? (
          <Select
            aria-label="Filter by type"
            className="h-8 w-40 text-sm"
            onChange={(event) => {
              setKindFilter(event.target.value);
              table.setPageIndex(0);
            }}
            value={kindFilter}
          >
            <option value="all">All types</option>
            {kinds.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === "CAFE" ? "Cafe" : option.label}
              </option>
            ))}
          </Select>
        ) : null}

        {ownerFilter && userId ? (
          <Select
            aria-label="Filter by who created it"
            className="h-8 w-44 text-sm"
            onChange={(event) => {
              setOnlyMine(event.target.value === "me");
              table.setPageIndex(0);
            }}
            value={onlyMine ? "me" : "anyone"}
          >
            <option value="anyone">Created by anyone</option>
            <option value="me">Created by me</option>
          </Select>
        ) : null}

        {/* A to Z first; a row added a moment ago is found with "Newest first". */}
        <Select
          aria-label="Sort"
          className="h-8 w-40 text-sm"
          onChange={(event) => {
            setOrder(isResourceOrder(event.target.value) ? event.target.value : "name");
            table.setPageIndex(0);
          }}
          value={order}
        >
          <option value="name">Name A–Z</option>
          {regionOrder ? (
            <option value="shown">In the region&apos;s order</option>
          ) : definition.orderField ? (
            <option value="shown">{definition.orderField.endsWith("Year") ? "By date" : "In shown order"}</option>
          ) : null}
          <option value="newest">Newest first</option>
        </Select>

        <p aria-live="polite" className="ml-auto text-xs text-muted tabular-nums">
          {query.isFetching
            ? "Updating…"
            : `${totalElements.toLocaleString()} ${totalElements === 1 ? "record" : "records"}`}
        </p>
      </Toolbar>

      {failure ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-heritage/20 bg-heritage-soft px-4 py-2 text-sm text-heritage" role="alert">
          <span className="min-w-0 flex-1">{apiErrorMessage(failure)}</span>
          {query.isError ? (
            <Button onClick={() => query.refetch()} size="sm" variant="secondary">
              Retry
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
              <span className="sr-only">Actions</span>
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
                          <Link aria-hidden className="relative hidden h-9 w-12 shrink-0 overflow-hidden rounded border border-line bg-sand-deep sm:block" href={mark?.yours ? mark.reviewHref : editHref} tabIndex={-1}>
                            {cover ? (
                              <Image alt="" className="object-cover" fill sizes="48px" src={cover} unoptimized />
                            ) : (
                              <ImageIcon className="absolute inset-0 m-auto size-3.5 text-muted" strokeWidth={1.75} />
                            )}
                          </Link>
                        ) : null}
                        <span className="min-w-0">
                          <Link
                            className="hover:text-teal-deep hover:underline"
                            href={mark?.yours ? mark.reviewHref : editHref}
                          >
                            {renderCell(record, column)}
                          </Link>
                          {mark ? (
                            <Badge className="ml-2 align-middle" dot tone={REQUEST_TONES[mark.status]}>{MARK_LABELS[mark.status]}</Badge>
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
                      <span className="text-xs text-muted">Delete permanently?</span>
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
                        Delete
                      </Button>
                      <Button onClick={() => setConfirming(null)} size="sm" variant="ghost">
                        Cancel
                      </Button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      {/* Waiting on the viewer, it goes live by approving the request, not by this switch. */}
                      {mark?.yours ? (
                        <Link className={buttonVariants({ size: "sm", className: "mr-1" })} href={mark.reviewHref}>
                          Review
                          <ArrowRight aria-hidden className="size-3.5" />
                        </Link>
                      ) : status && canSetStatus && (live || mayRestore) ? (
                        <Button
                          aria-label={live ? "Take off the site" : "Put on the site"}
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
                              ? `${statusOption(definition, status.retired)?.label ?? "Retire"} — hide this from the public site`
                              : `${statusOption(definition, status.live)?.label ?? "Restore"} — show this on the public site`
                          }
                          variant="ghost"
                        >
                          {live ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                        </Button>
                      ) : null}

                      <Link
                        aria-label="Edit"
                        className="inline-grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sand-deep hover:text-ink"
                        href={editHref}
                        title={mark?.yours ? "Edit before approving" : "Edit"}
                      >
                        <Pencil aria-hidden className="size-4" />
                      </Link>

                      {deletable ? (
                        <Button
                          aria-label="Delete"
                          className="text-muted hover:bg-heritage-soft hover:text-heritage"
                          disabled={remove.isLoading || setStatus.isLoading}
                          onClick={() => setConfirming(record.id)}
                          size="icon-sm"
                          title="Delete permanently"
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
                  <p className="py-10 text-center text-sm text-muted">Loading records…</p>
                ) : query.isError ? (
                  <p className="py-10 text-center text-sm text-muted">Records could not be loaded.</p>
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
                          Clear filters
                        </Button>
                      ) : null
                    }
                    description={
                      mineOnly && !term.trim() && statusFilter === "all"
                        ? `${definition.labelPlural} you create appear here.`
                        : filtered
                        ? "Try another search, or show every status."
                        : `${definition.labelPlural} will appear here once they are created.`
                    }
                    icon={filtered ? Search : Inbox}
                    title={filtered ? "Nothing matches those filters" : `No ${definition.labelPlural.toLowerCase()} yet`}
                  />
                )}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {totalElements > 0 ? (
        <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-xs text-muted">
          <span className="tabular-nums">
            Page {pagination.pageIndex + 1} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <Button
              disabled={!table.getCanPreviousPage() || query.isFetching}
              onClick={() => table.previousPage()}
              size="sm"
              variant="secondary"
            >
              <ChevronLeft aria-hidden className="size-3.5" />
              Previous
            </Button>
            <Button
              disabled={!table.getCanNextPage() || query.isFetching}
              onClick={() => table.nextPage()}
              size="sm"
              variant="secondary"
            >
              Next
              <ChevronRight aria-hidden className="size-3.5" />
            </Button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
