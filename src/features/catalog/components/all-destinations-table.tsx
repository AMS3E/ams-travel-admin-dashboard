"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, BedDouble, ImageIcon, Inbox, Loader2, MapPin, Pencil, Search, Send, UtensilsCrossed, type LucideIcon } from "lucide-react";
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
import { editHrefOf, type ReviewMark } from "@/features/publishing/marks";
import { useGetVerifiedStatusesQuery } from "@/features/verification/api/verification-api";
import { useGetReferenceOptionsQuery } from "@/features/catalog/api/catalog-api";
import { useApiErrorMessage } from "@/store/api/api-error";
import { Pager } from "@/components/ui/pager";

const ICONS: Readonly<Record<DestinationTypeKey, LucideIcon>> = {
  destinations: MapPin,
  foods: UtensilsCrossed,
  stays: BedDouble,
};

const PAGE_SIZE = 20;

/**
 * Every attraction, place to eat and stay together. Search,
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
  const t = useTranslations("catalog");
  const errorMessage = useApiErrorMessage();
  const router = useRouter();
  const [submit, submission] = useSubmitPublishRequestMutation();
  const [problem, setProblem] = useState<string | null>(null);
  const markOf = useMemo(() => new Map(marks.map((mark) => [mark.listingId, mark])), [marks]);
  const mayChoose = useMemo(() => new Set(sendable), [sendable]);
  const waitingOnYou = marks.filter((mark) => mark.yours).length;
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [mine, setMine] = useState(false);
  /* Newest first: what was just made is what someone came to see. */
  const [newest, setNewest] = useState(true);
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
  /* Verified on evidence, for the rows on this page alone, whatever their kind. */
  const visibleIds = visible.map((row) => row.id);
  const verified = useGetVerifiedStatusesQuery(visibleIds, { skip: visibleIds.length === 0 });
  const verifiedIds = new Set((verified.data ?? []).filter((status) => status.verified).map((status) => status.destinationId));
  /* Who wrote each row, by name: the attractions table's own reference list names every account. */
  const references = useGetReferenceOptionsQuery({ resource: "destinations", include: "columns" });
  const userNames = useMemo(() => new Map((references.data?.users ?? []).map((option) => [option.value, option.label])), [references.data]);
  /** The account a row is credited to: who created it, or the partner a stay or a food place is listed for. */
  const creatorOf = (row: DestinationRow) => {
    const id = row.createdBy ?? row.authors[0] ?? null;
    return id ? (userNames.get(id) ?? null) : null;
  };
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
      setProblem(t("allDestinations.sendFailed", { name: row.name, reason: errorMessage(error) }));
    }
  }

  return (
    <section className="panel min-w-0 overflow-hidden">
      <Toolbar>
        <SearchField
          className="max-w-sm"
          label={t("allDestinations.search")}
          onChange={(value) => reset(() => setTerm(value))}
          placeholder={t("allDestinations.searchPlaceholder")}
          value={term}
        />
        <Select aria-label={t("list.filterStatus")} className="h-8 w-52 text-sm" onChange={(event) => reset(() => setStatus(event.target.value))} value={status}>
          <option value="all">{t("list.allStatuses")}</option>
          {waitingOnYou ? <option value="review">{t("allDestinations.waitingForYou", { count: waitingOnYou })}</option> : null}
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {userId ? (
          <Select aria-label={t("list.filterCreator")} className="h-8 w-44 text-sm" onChange={(event) => reset(() => setMine(event.target.value === "me"))} value={mine ? "me" : "anyone"}>
            <option value="anyone">{t("list.createdByAnyone")}</option>
            <option value="me">{t("list.createdByMe")}</option>
          </Select>
        ) : null}
        <Select aria-label={t("list.sort")} className="h-8 w-40 text-sm" onChange={(event) => reset(() => setNewest(event.target.value === "newest"))} value={newest ? "newest" : "name"}>
          <option value="name">{t("list.sortName")}</option>
          <option value="newest">{t("list.sortNewest")}</option>
        </Select>
        <p aria-live="polite" className="ml-auto text-xs text-muted tabular-nums">
          {t("allDestinations.count", { count: shown.length })}
        </p>
      </Toolbar>
      {problem ? <p className="border-b border-heritage/20 bg-heritage-soft px-4 py-2 text-sm text-heritage" role="alert">{problem}</p> : null}

      <Table>
        <TableHead>
          <TableRow className="hover:bg-transparent">
            <TableHeaderCell>{t("allDestinations.name")}</TableHeaderCell>
            <TableHeaderCell>{t("allDestinations.type")}</TableHeaderCell>
            <TableHeaderCell className="hidden md:table-cell">{t("allDestinations.createdBy")}</TableHeaderCell>
            <TableHeaderCell className="hidden md:table-cell">{t("allDestinations.verified")}</TableHeaderCell>
            <TableHeaderCell>{t("allDestinations.status")}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              <span className="sr-only">{t("list.actions")}</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visible.map((row) => {
            const Icon = ICONS[row.type];
            const mark = markOf.get(row.id);
            const editHref = editHrefOf(row.href, mark);
            /* The name opens the detail page when the row has one; otherwise what matters most: the review when it waits on the viewer. */
            const mainHref = row.detailHref ?? (mark?.yours ? mark.reviewHref : editHref);
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
                <TableCell className="hidden md:table-cell">
                  {creatorOf(row) ?? <span className="text-muted">—</span>}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {verifiedIds.has(row.id) ? (
                    <Badge dot tone="success">{t("allDestinations.verified")}</Badge>
                  ) : (
                    <span className="text-muted">{verified.isLoading ? "…" : t("allDestinations.notVerified")}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge dot tone={row.statusTone}>
                      {row.statusLabel}
                    </Badge>
                    {mark ? <Badge dot tone={REQUEST_TONES[mark.status]}>{t(`marks.${mark.status}`)}</Badge> : null}
                    {row.khmerMissing ? <Badge dot tone="warning">{t("table.khmerMissing", { count: row.khmerMissing })}</Badge> : null}
                  </span>
                </TableCell>
                <TableCell className="py-1.5 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {mark?.yours ? (
                      <Link className={buttonVariants({ size: "sm" })} href={mark.reviewHref}>
                        {t("list.review")}
                        <ArrowRight aria-hidden className="size-3.5" />
                      </Link>
                    ) : null}
                    {mayChoose.has(row.id) ? (
                      <Button disabled={submission.isLoading} onClick={() => void send(row)} size="sm" type="button" variant="secondary">
                        {submission.isLoading && submission.originalArgs?.targetId === row.id ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Send aria-hidden className="size-3.5" />}
                        {mark?.status === "DRAFT" ? t("allDestinations.sendAgain") : t("allDestinations.sendForReview")}
                      </Button>
                    ) : null}
                    <Link
                      aria-label={t("allDestinations.editName", { name: row.name })}
                      className="inline-grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sand-deep hover:text-ink"
                      href={editHref}
                      title={mark?.yours ? t("list.editBeforeApproving") : t("list.edit")}
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
                        {t("list.clearFilters")}
                      </Button>
                    ) : null
                  }
                  description={filtered ? t("list.noMatchText") : t("allDestinations.emptyText")}
                  icon={filtered ? Search : Inbox}
                  title={filtered ? t("list.noMatchTitle") : t("allDestinations.emptyTitle")}
                />
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {pages > 1 ? <Pager onPage={setPage} page={at} pageCount={pages} /> : null}
    </section>
  );
}
