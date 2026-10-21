"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BadgeCheck, History, MapPin, RefreshCw, Search, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, QueryState } from "@/features/cms/components/query-state";
import { useDates } from "@/i18n/use-dates";
import {
  PUBLISH_DESKS,
  type PublishDesk,
} from "@/features/publishing/api/contracts";
import { byName } from "@/features/catalog/resources";
import { useGetVerificationQueueQuery } from "../api/verification-api";
import { decidedVerified, type VerificationQueueItem, RESOURCE_OF_TARGET } from "../api/contracts";
import { VerifyDrawer, type DrawerFocus } from "./verify-drawer";
import { SegmentedControl } from "@/components/ui/toolbar";

type Filter = "all" | "verified" | "notVerified";

/** The filters, in order; their words are `verification.queue.filters`. "Not verified" is a fact, not a request: nobody applies for verification. */
const FILTERS: readonly Filter[] = ["all", "verified", "notVerified"];

const STATUS_TONES: Readonly<Record<VerificationQueueItem["destinationStatus"], "active" | "neutral" | "inactive">> = {
  PUBLISHED: "active",
  DRAFT: "neutral",
  ARCHIVED: "neutral",
};

/** A translator for `verification`, from `useTranslations`. */
type Words = ReturnType<typeof useTranslations<"verification">>;

/**
 * Content Management → Verification: where a desk verifies.
 *
 * The API decides what is in it — partner listings for a BDO, contributor
 * drafts for an editor, everything for an administrator — so this screen only
 * filters and searches. Verifying, renewing and revoking open the drawer over
 * it, with the destination's history underneath.
 */
export function VerificationQueue({ grants }: { readonly grants: readonly string[] }) {
  const t = useTranslations("verification");
  const query = useGetVerificationQueueQuery();
  const [filter, setFilter] = useState<Filter>("all");
  const [desk, setDesk] = useState<PublishDesk | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<{ readonly id: string; readonly focus: DrawerFocus } | null>(null);

  const all = query.data ?? [];
  const desks = PUBLISH_DESKS.filter((each) => all.some((item) => item.desk === each));
  const items = all.filter((item) => desk === "all" || item.desk === desk);
  const counts: Readonly<Record<Filter, number>> = {
    all: items.length,
    verified: items.filter((item) => item.verified).length,
    notVerified: items.filter((item) => !item.verified).length,
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
    <section aria-label={t("queue.label")} className="panel min-w-0 overflow-hidden">
      <p className="border-b border-line bg-sand px-4 py-2 text-xs text-muted">
        {t("queue.intro", {
          scope: grants.includes("PERM_FULL_CONTROL") ? t("queue.scopeAdmin") : t("queue.scopeDesk"),
        })}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <SegmentedControl
          label={t("queue.filterLabel")}
          onChange={setFilter}
          options={FILTERS.map((option) => ({ value: option, label: t(`queue.filters.${option}`), count: counts[option] }))}
          value={filter}
        />

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {/* Only worth a control when the queue spans more than one desk. */}
          {desks.length > 1 ? (
            <Select
              aria-label={t("queue.deskFilterLabel")}
              className="h-8 w-52 text-sm"
              onChange={(event) => setDesk(event.target.value as PublishDesk | "all")}
              value={desk}
            >
              <option value="all">{t("queue.writtenByAnyone")}</option>
              {desks.map((each) => (
                <option key={each} value={each}>
                  {t(`queue.writtenByFilter.${each}`)}
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
              aria-label={t("queue.searchLabel")}
              className="h-8 pl-8 text-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("queue.searchPlaceholder")}
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
        <EmptyState>{needle ? t("queue.empty.noMatch") : t(`queue.empty.${filter}`)}</EmptyState>
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
function decisionLine(item: VerificationQueueItem, t: Words, dateTime: (value: string) => string): string {
  const name = item.decidedByName ?? t("line.deletedAccount");
  const decision =
    item.id != null && item.createdAt
      ? [
          decidedVerified(item) ? t("line.verifiedBy", { name }) : t("line.revokedBy", { name }),
          dateTime(item.createdAt),
          item.reference,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
  /* The travellers' seal verifies it whatever the last decision was, so it comes first. */
  if (item.basis === "TRAVELER_SCORE") return [t("line.byTravellers"), decision].filter(Boolean).join(" · ");
  return decision ?? t("line.never");
}

/** The star ratings behind the travellers' seal, or on the way to it. */
function ratingsLine(item: VerificationQueueItem, t: Words): string | null {
  if (!item.ratingCount) return null;
  return item.averageRating != null
    ? t("line.ratingsAt", { count: item.ratingCount, average: String(item.averageRating) })
    : t("line.ratings", { count: item.ratingCount });
}

function QueueRow({
  item,
  onOpen,
}: {
  readonly item: VerificationQueueItem;
  readonly onOpen: (focus: DrawerFocus) => void;
}) {
  const t = useTranslations("verification");
  const { dateTime } = useDates();
  const tone = STATUS_TONES[item.destinationStatus];
  const ratings = ratingsLine(item, t);
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
        <p className="mt-0.5 text-xs text-ink-soft">{decisionLine(item, t, dateTime)}</p>
        {item.note ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{item.note}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Which kind of place, then who wrote it, not which desk approves it: "Staff content" said nothing to anybody. */}
        <Badge tone="neutral">{t(`queue.kind.${item.targetType}`)}</Badge>
        <Badge>{t(`queue.writtenBy.${item.desk}`)}</Badge>
        <Badge dot tone={tone ?? "neutral"}>{tone ? t(`destinationStatus.${item.destinationStatus}`) : item.destinationStatus}</Badge>
        {item.travelerRecommended ? <Badge tone="success">{t("badge.travelerRecommended")}</Badge> : null}
        <span className="flex flex-col items-start gap-0.5">
          <Badge tone={item.verified ? "info" : "neutral"}>
            {item.verified && item.basis ? t("badge.verifiedBasis", { basis: t(`basis.${item.basis}`) }) : item.verified ? t("badge.verified") : t("badge.notVerified")}
          </Badge>
          {decidedVerified(item) && item.decidedByName ? (
            <span className="text-2xs text-muted" title={item.createdAt ? dateTime(item.createdAt) : undefined}>
              {t("queue.by", { name: item.decidedByName })}
            </span>
          ) : ratings ? (
            <span className="text-2xs text-muted">{ratings}</span>
          ) : null}
        </span>

        <Button
          aria-label={t("queue.historyOf", { name: item.destinationName })}
          onClick={() => onOpen("history")}
          size="icon-sm"
          title={t("actions.history")}
          type="button"
          variant="ghost"
        >
          <History aria-hidden className="size-4" />
        </Button>
        {decidedVerified(item) ? (
          <>
            <Button onClick={() => onOpen("verify")} size="sm" type="button" variant="secondary">
              <RefreshCw aria-hidden className="size-3.5" />
              {t("actions.renew")}
            </Button>
            <Button onClick={() => onOpen("revoke")} size="sm" type="button" variant="ghost">
              <ShieldOff aria-hidden className="size-3.5 text-heritage" />
              {t("actions.revoke")}
            </Button>
          </>
        ) : (
          <Button onClick={() => onOpen("verify")} size="sm" type="button">
            <BadgeCheck aria-hidden className="size-3.5" />
            {t("actions.verify")}
          </Button>
        )}
      </div>
    </li>
  );
}
