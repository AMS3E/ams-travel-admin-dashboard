"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BedDouble, ChevronLeft, ChevronRight, ImageIcon, Inbox, Loader2, MapPin, Pencil, Route, Search, Send, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { SearchField, Toolbar } from "@/components/ui/toolbar";
import type { DestinationRow, DestinationTypeKey } from "@/features/catalog/all-destinations";
import { byName } from "@/features/catalog/resources";
import { REQUEST_TONES, listingTypeOf } from "@/features/publishing/api/contracts";
import { useSubmitPublishRequestMutation } from "@/features/publishing/api/publishing-api";
import { MARK_LABELS, editHrefOf, type ReviewMark } from "@/features/publishing/marks";
import { apiErrorMessage } from "@/store/api/api-error";

const ICONS: Readonly<Record<DestinationTypeKey, LucideIcon>> = {
  destinations: MapPin,
  foods: UtensilsCrossed,
  stays: BedDouble,
  corridors: Route,
};

const PAGE_SIZE = 20;

/**
 * Every attraction, place to eat, stay and travel route together. Search,
 * narrow by status or by who created it, and open any row to edit it — its
 * own type's tab holds the rest of what can be done to it.
 *
 * A listing with a reviewer says so beside its status. One waiting on the
 * viewer offers Review, and editing it comes back to that review; one its
 * author may send offers Send for review.
 */
export function AllDestinationsTable({ rows, userId, marks = [], sendable = [] }: {
  readonly rows: readonly DestinationRow[];
  readonly userId: string | null;
  /** Each listing's open request, where it has one. */
  readonly marks?: readonly ReviewMark[];
  /** The listings this account may send for review from here. */
  readonly sendable?: readonly string[];
}) {
  const router = useRouter();
  const [submit, submission] = useSubmitPublishRequestMutation();
  const [problem, setProblem] = useState<string | null>(null);
  const markOf = useMemo(() => new Map(marks.map((mark) => [mark.listingId, mark])), [marks]);
  const mayChoose = useMemo(() => new Set(sendable), [sendable]);
  const waitingOnYou = marks.filter((mark) => mark.yours).length;
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [mine, setMine] = useState(false);
  const [newest, setNewest] = useState(false);
  const [page, setPage] = useState(0);

  /* The statuses these rows are in, A to Z by how they read. */
  const statuses = useMemo(
    () => [...new Map(rows.filter((row) => row.status).map((row) => [row.status!, row.statusLabel])).entries()].sort((a, b) => byName(a[1], b[1])),
    [rows],
  );

  const needle = term.trim().toLowerCase();
  const shown = useMemo(() => {
    const matching = rows.filter(
      (row) =>
        (!needle || `${row.name} ${row.place ?? ""} ${row.kind ?? ""}`.toLowerCase().includes(needle)) &&
        (status === "all" || (status === "review" ? markOf.get(row.id)?.yours === true : row.status === status)) &&
        (!mine || (userId !== null && row.createdBy === userId)),
    );
    return newest
      ? matching.toSorted((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "") || byName(a.name, b.name))
      : matching;
  }, [rows, needle, status, markOf, mine, userId, newest]);

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const at = Math.min(page, pages - 1);
  const visible = shown.slice(at * PAGE_SIZE, (at + 1) * PAGE_SIZE);
  const filtered = Boolean(needle) || status !== "all" || mine;
  const reset = (change: () => void) => {
    change();
    setPage(0);
  };

  async function send(row: DestinationRow) {
    const listingType = listingTypeOf(row.type);
    if (!listingType) return;
    setProblem(null);
    try {
      await submit({ targetType: listingType, targetId: row.id }).unwrap();
      router.refresh();
    } catch (error) {
      setProblem(`${row.name} could not be sent for review: ${apiErrorMessage(error)}`);
    }
  }

  return (
    <section className="panel min-w-0 overflow-hidden">
      <Toolbar>
        <SearchField
          className="max-w-sm"
          label="Search all destinations"
          onChange={(value) => reset(() => setTerm(value))}
          placeholder="Search by name or place…"
          value={term}
        />
        <Select aria-label="Filter by status" className="h-8 w-52 text-sm" onChange={(event) => reset(() => setStatus(event.target.value))} value={status}>
          <option value="all">All statuses</option>
          {waitingOnYou ? <option value="review">Waiting for your review ({waitingOnYou})</option> : null}
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {userId ? (
          <Select aria-label="Filter by who created it" className="h-8 w-44 text-sm" onChange={(event) => reset(() => setMine(event.target.value === "me"))} value={mine ? "me" : "anyone"}>
            <option value="anyone">Created by anyone</option>
            <option value="me">Created by me</option>
          </Select>
        ) : null}
        <Select aria-label="Sort" className="h-8 w-40 text-sm" onChange={(event) => reset(() => setNewest(event.target.value === "newest"))} value={newest ? "newest" : "name"}>
          <option value="name">Name A–Z</option>
          <option value="newest">Newest first</option>
        </Select>
        <p aria-live="polite" className="ml-auto text-xs text-muted tabular-nums">
          {shown.length} {shown.length === 1 ? "destination" : "destinations"}
        </p>
      </Toolbar>
      {problem ? <p className="border-b border-heritage/20 bg-heritage-soft px-4 py-2 text-sm text-heritage" role="alert">{problem}</p> : null}

      <Table>
        <TableHead>
          <TableRow className="hover:bg-transparent">
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell className="hidden md:table-cell">Kind</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visible.map((row) => {
            const Icon = ICONS[row.type];
            const mark = markOf.get(row.id);
            const editHref = editHrefOf(row.href, mark);
            /* The name opens what matters most: the review when it waits on the viewer. */
            const mainHref = mark?.yours ? mark.reviewHref : editHref;
            return (
              <TableRow className="group" key={`${row.type}-${row.id}`}>
                <TableCell className="max-w-0 min-w-56">
                  <span className="flex items-center gap-3">
                    <Link aria-hidden className="relative hidden h-9 w-12 shrink-0 overflow-hidden rounded border border-line bg-sand-deep sm:block" href={mainHref} tabIndex={-1}>
                      {row.cover ? (
                        <Image alt="" className="object-cover" fill sizes="48px" src={row.cover} unoptimized />
                      ) : (
                        <ImageIcon className="absolute inset-0 m-auto size-3.5 text-muted" strokeWidth={1.75} />
                      )}
                    </Link>
                    <span className="min-w-0">
                      <Link className="block truncate font-medium text-ink hover:text-teal-deep hover:underline" href={mainHref}>
                        {row.name}
                      </Link>
                      {row.place ? <span className="block truncate text-xs text-muted">{row.place}</span> : null}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
                    <Icon aria-hidden className="size-4 text-muted" strokeWidth={1.75} />
                    {row.typeLabel}
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm text-ink-soft md:table-cell">{row.kind ?? <span className="text-muted">—</span>}</TableCell>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge dot tone={row.statusTone}>
                      {row.statusLabel}
                    </Badge>
                    {mark ? <Badge dot tone={REQUEST_TONES[mark.status]}>{MARK_LABELS[mark.status]}</Badge> : null}
                  </span>
                </TableCell>
                <TableCell className="py-1.5 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {mark?.yours ? (
                      <Link className={buttonVariants({ size: "sm" })} href={mark.reviewHref}>
                        Review
                        <ArrowRight aria-hidden className="size-3.5" />
                      </Link>
                    ) : null}
                    {mayChoose.has(row.id) ? (
                      <Button disabled={submission.isLoading} onClick={() => void send(row)} size="sm" type="button" variant="secondary">
                        {submission.isLoading && submission.originalArgs?.targetId === row.id ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Send aria-hidden className="size-3.5" />}
                        {mark?.status === "DRAFT" ? "Send again" : "Send for review"}
                      </Button>
                    ) : null}
                    <Link
                      aria-label={`Edit ${row.name}`}
                      className="inline-grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sand-deep hover:text-ink"
                      href={editHref}
                      title={mark?.yours ? "Edit before approving" : "Edit"}
                    >
                      <Pencil aria-hidden className="size-4" />
                    </Link>
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
          {visible.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell className="p-0" colSpan={5}>
                <EmptyState
                  action={
                    filtered ? (
                      <Button
                        onClick={() => {
                          setTerm("");
                          setStatus("all");
                          setMine(false);
                          setPage(0);
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        Clear filters
                      </Button>
                    ) : null
                  }
                  description={filtered ? "Try another search, or show every status." : "Destinations appear here once they are created."}
                  icon={filtered ? Search : Inbox}
                  title={filtered ? "Nothing matches those filters" : "No destinations yet"}
                />
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {pages > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
          <p className="text-xs text-muted tabular-nums">
            Page {at + 1} of {pages}
          </p>
          <div className="flex gap-2">
            <Button disabled={at === 0} onClick={() => setPage(at - 1)} size="sm" variant="secondary">
              <ChevronLeft aria-hidden className="size-4" />
              Previous
            </Button>
            <Button disabled={at >= pages - 1} onClick={() => setPage(at + 1)} size="sm" variant="secondary">
              Next
              <ChevronRight aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
