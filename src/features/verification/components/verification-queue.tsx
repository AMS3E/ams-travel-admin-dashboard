"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, History, MapPin, RefreshCw, Search, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, QueryState } from "@/features/cms/components/query-state";
import { formatDateTime } from "@/features/dashboard/format";
import {
  PUBLISH_DESKS,
  type PublishDesk,
} from "@/features/publishing/api/contracts";
import { cn } from "@/lib/utils";
import { byName } from "@/features/catalog/resources";
import { useGetVerificationQueueQuery } from "../api/verification-api";
import { BASIS_LABELS, decidedVerified, type VerificationQueueItem, RESOURCE_OF_TARGET, TARGET_LABELS } from "../api/contracts";
import { VerifyDrawer, type DrawerFocus } from "./verify-drawer";

type Filter = "awaiting" | "verified" | "all";

const FILTERS: readonly { readonly value: Filter; readonly label: string }[] = [
  { value: "awaiting", label: "Awaiting verification" },
  { value: "verified", label: "Verified" },
  { value: "all", label: "All" },
];

/**
 * Whose place it is, in the words this screen needs: not which desk approves
 * it — that is the publishing side — but who wrote the thing whose invoice a
 * verifier is about to read. "Staff content" said nothing to anybody.
 */
const WRITTEN_BY: Readonly<Record<PublishDesk, string>> = {
  PARTNER: "Written by a partner",
  CONTRIBUTOR: "Written by a contributor",
  STAFF: "Written by our team",
};

/** The same, as a line in the filter beside it. */
const WRITTEN_BY_FILTER: Readonly<Record<PublishDesk, string>> = {
  PARTNER: "By a partner",
  CONTRIBUTOR: "By a contributor",
  STAFF: "By our team",
};

const EMPTY: Readonly<Record<Filter, string>> = {
  awaiting: "Nothing is waiting: every destination here has been verified.",
  verified: "No destination is verified yet. Verify one on what it rests on: an official site, a partnership, or an invoice.",
  all: "There is no destination to verify yet.",
};

const STATUS: Readonly<
  Record<VerificationQueueItem["destinationStatus"], { label: string; tone: "active" | "neutral" | "inactive" }>
> = {
  PUBLISHED: { label: "Published", tone: "active" },
  DRAFT: { label: "Draft", tone: "neutral" },
  ARCHIVED: { label: "Archived", tone: "inactive" },
};

/** Who this account verifies, in the words the rule is stated in. */
function scopeOf(grants: readonly string[]): string {
  return grants.includes("PERM_FULL_CONTROL")
    ? "As an administrator you verify every destination, staff content included."
    : "You verify every destination, whoever wrote it — a partner's, a contributor's and the team's own.";
}

/**
 * Content Management → Verification: where a desk verifies.
 *
 * The API decides what is in it — partner listings for a BDO, contributor
 * drafts for an editor, everything for an administrator — so this screen only
 * filters and searches. Verifying, renewing and revoking open the drawer over
 * it, with the destination's history underneath.
 */
export function VerificationQueue({ grants }: { readonly grants: readonly string[] }) {
  const query = useGetVerificationQueueQuery();
  const [filter, setFilter] = useState<Filter>("awaiting");
  const [desk, setDesk] = useState<PublishDesk | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<{ readonly id: string; readonly focus: DrawerFocus } | null>(null);

  const all = query.data ?? [];
  const desks = PUBLISH_DESKS.filter((each) => all.some((item) => item.desk === each));
  const items = all.filter((item) => desk === "all" || item.desk === desk);
  const counts: Readonly<Record<Filter, number>> = {
    awaiting: items.filter((item) => !item.verified).length,
    verified: items.filter((item) => item.verified).length,
    all: items.length,
  };
  const needle = search.trim().toLowerCase();
  /* The work first: what waits on a decision, then the rest, each A to Z. */
  const rows = items
    .filter(
      (item) =>
        (filter === "all" || (filter === "verified") === item.verified) &&
        (!needle ||
          item.destinationName.toLowerCase().includes(needle) ||
          (item.destinationSlug ?? "").toLowerCase().includes(needle)),
    )
    .toSorted((a, b) => Number(a.verified) - Number(b.verified) || byName(a.destinationName, b.destinationName));
  /* Looked up each render, so the drawer follows the row once a decision lands. */
  const current = open ? all.find((item) => item.destinationId === open.id) : undefined;

  return (
    <section aria-label="Verification queue" className="panel min-w-0 overflow-hidden">
      <p className="border-b border-line bg-sand px-4 py-2 text-xs text-muted">
        {scopeOf(grants)} A verified place shows as Recommended by AMS Travel
        in the app. Verify on what it rests on: an official site needs no
        paperwork, a partner&apos;s listing its agreement, a paid one its invoice
        or receipt; renew when new paperwork comes in, and say why when you
        revoke. Recommended by Traveler is earned from reviews and is nobody&apos;s
        to file or revoke.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <div
          aria-label="Filter by verification"
          className="inline-flex h-8 flex-wrap items-center rounded-md border border-line-strong bg-sand p-0.5"
          role="group"
        >
          {FILTERS.map((option) => (
            <button
              aria-pressed={filter === option.value}
              className={cn(
                "inline-flex h-full items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                filter === option.value ? "bg-paper text-ink shadow-xs ring-1 ring-line" : "text-muted hover:text-ink",
              )}
              key={option.value}
              onClick={() => setFilter(option.value)}
              type="button"
            >
              {option.label}
              <span className="text-muted tabular-nums">{counts[option.value]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {/* Only worth a control when the queue spans more than one desk. */}
          {desks.length > 1 ? (
            <Select
              aria-label="Filter by who wrote it"
              className="h-8 w-52 text-sm"
              onChange={(event) => setDesk(event.target.value as PublishDesk | "all")}
              value={desk}
            >
              <option value="all">Written by anyone</option>
              {desks.map((each) => (
                <option key={each} value={each}>
                  {WRITTEN_BY_FILTER[each]}
                </option>
              ))}
            </Select>
          ) : null}
          <div className="relative w-full sm:w-60">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted"
            />
            <Input
              aria-label="Search destinations"
              className="h-8 pl-8 text-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search destinations…"
              type="search"
              value={search}
            />
          </div>
        </div>
      </div>

      {query.error || query.isLoading ? (
        <div className="p-3">
          <QueryState error={query.error} loading={query.isLoading} retry={query.refetch} />
        </div>
      ) : null}

      {rows.length ? (
        <ul className="divide-y divide-line">
          {rows.map((item) => (
            <QueueRow
              item={item}
              key={item.destinationId}
              onOpen={(focus) => setOpen({ id: item.destinationId, focus })}
            />
          ))}
        </ul>
      ) : !query.isLoading && !query.error ? (
        <EmptyState>{needle ? "No destination matches that search." : EMPTY[filter]}</EmptyState>
      ) : null}

      {open && current ? (
        <VerifyDrawer
          destination={{ id: current.destinationId, name: current.destinationName, verified: decidedVerified(current), desk: current.desk, resource: RESOURCE_OF_TARGET[current.targetType] }}
          focus={open.focus}
          key={`${open.id}-${open.focus}`}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}

/**
 * The latest decision, as one line: who decided, when, and on what paperwork.
 * A place nobody has decided on yet says so. The badge beside it carries the
 * verifier's name too, because "verified" without a name is a state rather
 * than somebody's decision.
 */
function decisionLine(item: VerificationQueueItem): string {
  const decision =
    item.id != null && item.createdAt
      ? [
          `${decidedVerified(item) ? "Verified" : "Revoked"} by ${item.decidedByName ?? "a deleted account"}`,
          formatDateTime(item.createdAt),
          item.reference,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
  /* The travellers' seal verifies it whatever the last decision was, so it comes first. */
  if (item.basis === "TRAVELER_SCORE") return ["Verified by the travellers' reviews", decision].filter(Boolean).join(" · ");
  return decision ?? "Never verified";
}

/** The star ratings behind the travellers' seal, or on the way to it. */
function ratingsLine(item: VerificationQueueItem): string | null {
  if (!item.ratingCount) return null;
  return `${item.ratingCount.toLocaleString()} ${item.ratingCount === 1 ? "rating" : "ratings"}${item.averageRating != null ? ` at ${item.averageRating}` : ""}`;
}

function QueueRow({
  item,
  onOpen,
}: {
  readonly item: VerificationQueueItem;
  readonly onOpen: (focus: DrawerFocus) => void;
}) {
  const status = STATUS[item.destinationStatus];
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2.5">
      {item.destinationCoverUrl ? (
        <Image
          alt=""
          className="size-10 shrink-0 rounded-md object-cover ring-1 ring-line"
          height={40}
          src={item.destinationCoverUrl}
          unoptimized
          width={40}
        />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-sand-deep text-muted">
          <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <Link
          className="text-sm font-medium text-ink hover:text-teal-deep hover:underline"
          href={`/${RESOURCE_OF_TARGET[item.targetType]}/${item.destinationId}`}
        >
          {item.destinationName}
        </Link>
        <p className="truncate font-mono text-2xs text-muted">{item.destinationSlug}</p>
        <p className="mt-0.5 text-xs text-ink-soft">{decisionLine(item)}</p>
        {item.note ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{item.note}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{TARGET_LABELS[item.targetType]}</Badge>
        <Badge>{WRITTEN_BY[item.desk]}</Badge>
        <Badge dot tone={status?.tone ?? "neutral"}>{status?.label ?? item.destinationStatus}</Badge>
        {item.travelerRecommended ? <Badge tone="success">Recommended by Traveler</Badge> : null}
        <span className="flex flex-col items-start gap-0.5">
          <Badge tone={item.verified ? "info" : "neutral"}>
            {item.verified && item.basis ? `Verified · ${BASIS_LABELS[item.basis]}` : item.verified ? "Verified" : "Not verified"}
          </Badge>
          {decidedVerified(item) && item.decidedByName ? (
            <span className="text-2xs text-muted" title={item.createdAt ? formatDateTime(item.createdAt) : undefined}>
              by {item.decidedByName}
            </span>
          ) : ratingsLine(item) ? (
            <span className="text-2xs text-muted">{ratingsLine(item)}</span>
          ) : null}
        </span>

        <Button
          aria-label={`History of ${item.destinationName}`}
          onClick={() => onOpen("history")}
          size="icon-sm"
          title="History"
          type="button"
          variant="ghost"
        >
          <History aria-hidden className="size-4" />
        </Button>
        {decidedVerified(item) ? (
          <>
            <Button onClick={() => onOpen("verify")} size="sm" type="button" variant="secondary">
              <RefreshCw aria-hidden className="size-3.5" />
              Renew
            </Button>
            <Button onClick={() => onOpen("revoke")} size="sm" type="button" variant="ghost">
              <ShieldOff aria-hidden className="size-3.5 text-heritage" />
              Revoke
            </Button>
          </>
        ) : (
          <Button onClick={() => onOpen("verify")} size="sm" type="button">
            <BadgeCheck aria-hidden className="size-3.5" />
            Verify
          </Button>
        )}
      </div>
    </li>
  );
}
