import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  canCreateResource,
  canDeleteResource,
  canSetStatus,
  hasAnyPermission,
  namesListingOwner,
  hasPermission,
  seesOwnListingsOnly,
  seesOwnRowsOnly,
} from "@/features/auth/permissions";
import { getBackendUserId } from "@/features/auth/session";
import {
  allRows,
  chosenType,
  createHref,
  destinationTypes,
  toRows,
  type DestinationRow,
  type DestinationType,
} from "@/features/catalog/all-destinations";
import { getRecords } from "@/features/catalog/api/catalog.server";
import { AllDestinationsTable } from "@/features/catalog/components/all-destinations-table";
import { ResourceTable } from "@/features/catalog/components/resource-table";
import { localizeDefinition, localizedResource } from "@/features/catalog/localize.server";
import { withoutField } from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import { PageHeader } from "@/features/shell/components/page-header";
import { listingTypeOf } from "@/features/publishing/api/contracts";
import { getMyRequests, getReviewQueue } from "@/features/publishing/api/publishing.server";
import { approvalMarks, reviewMarks, type ApprovalMark, type ReviewMark } from "@/features/publishing/marks";
import { submissionDesk } from "@/features/publishing/workflow";
import { cn } from "@/lib/utils";

/**
 * All Destinations — every attraction, place to eat and stay this account
 * works on, with a tab per main type. All reads them together; a type's
 * tab is that type's own table: its filters, publishing and deleting.
 *
 * Every listing with an open request says so, and one waiting on the viewer
 * is reviewed — read in full, edited if need be, and approved — rather than
 * switched on; an author who cannot publish sends theirs for review from here.
 */
export async function AllDestinationsPage({ roles, tab }: { readonly roles: readonly string[]; readonly tab: unknown }) {
  const t = await getTranslations("catalog");
  const types = destinationTypes(roles);
  const chosen = chosenType(tab, types);
  const userId = await getBackendUserId();

  /* Each type's rows, for the counts on the tabs and the All table. A type the API will not list shows no count. */
  const reviewer = hasAnyPermission(roles, ["PERM_PARTNER_PUBLISH_APPROVE", "PERM_CONTRIBUTOR_PUBLISH_APPROVE"]);
  const submitter = hasPermission(roles, "PERM_PUBLISH_REQUEST_VIEW_OWN");
  const [queue, mine, [provinces, ...lists], definitions] = await Promise.all([
    reviewer ? getReviewQueue() : [],
    submitter ? getMyRequests() : [],
    Promise.allSettled([getRecords("provinces"), ...types.map((type) => getRecords(type.key))]),
    Promise.all(types.map((type) => localizedResource(type.key))),
  ]);
  const marks = reviewMarks([...queue, ...mine], roles, userId);
  const approvals = approvalMarks([...queue, ...mine], (await getTranslations("publishing"))("decision.aReviewer"));
  const provinceNames = new Map(
    provinces.status === "fulfilled" ? provinces.value.map((row) => [row.id, String(row.name ?? "")]) : [],
  );
  const rowsByType = new Map<DestinationType["key"], DestinationRow[]>(
    types.flatMap((type, index) => {
      const list = lists[index];
      if (list.status !== "fulfilled") return [];
      /* A partner's stays and foods are theirs alone. */
      const records = seesOwnListingsOnly(roles, type.key) ? list.value.filter((row) => row.ownerUserId === userId) : list.value;
      const words = {
        definition: definitions[index],
        typeLabel: t(`types.${type.key}.one`),
        untitled: t(`types.${type.key}.untitled`),
        kindWords: { CAFE: t("kinds.CAFE") },
      };
      return [[type.key, toRows(type.key, records, words, provinceNames)] as const];
    }),
  );
  const rows = allRows([...rowsByType.values()]);
  /*
   * What this account may send for review from here: its own attractions,
   * stays and food listings, not live and not already waiting — for an author
   * who cannot publish them.
   */
  const waiting = new Set(marks.filter((mark) => mark.status === "PENDING_REVIEW").map((mark) => mark.listingId));
  const sends = submissionDesk(roles) !== null && !hasAnyPermission(roles, ["PERM_DESTINATION_EDIT_ANY", "PERM_FULL_CONTROL"]);
  const sendable = sends && userId
    ? rows.filter((row) => listingTypeOf(row.type) && row.status !== "PUBLISHED" && row.authors.includes(userId) && !waiting.has(row.id)).map((row) => row.id)
    : [];
  const missing = types.filter((type) => !rowsByType.has(type.key));

  const scoped = seesOwnRowsOnly(roles, "destinations") || types.some((type) => seesOwnListingsOnly(roles, type.key));
  const create = createHref(roles, chosen);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          create ? (
            <Link className={buttonVariants()} href={create}>
              <Plus aria-hidden className="size-4" />
              {chosen ? t(`types.${chosen.key}.new`) : t("allDestinations.create")}
            </Link>
          ) : null
        }
        description={scoped ? t("allDestinations.descriptionScoped") : t("allDestinations.description")}
        eyebrow={t("contentManagement")}
        title={t("allDestinations.title")}
      />

      {types.length > 1 ? (
        <nav aria-label={t("allDestinations.mainTypes")} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
          {[null, ...types].map((type) => {
            const on = (type?.tab ?? null) === (chosen?.tab ?? null);
            const count = type ? rowsByType.get(type.key)?.length : rows.length;
            return (
              <Link
                aria-current={on ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                  on ? "border-ink text-ink" : "border-transparent text-muted hover:border-line-strong hover:text-ink",
                )}
                href={type ? `/destinations?type=${type.tab}` : "/destinations"}
                key={type?.tab ?? "all"}
              >
                {type ? t(`types.${type.key}.tab`) : t("allDestinations.all")}
                <span className={cn("rounded-full px-1.5 text-xs tabular-nums", on ? "bg-sand-deep text-ink-soft" : "bg-sand text-muted")}>
                  {count ?? "–"}
                </span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {missing.length && !chosen ? (
        <p className="rounded-md border border-heritage/20 bg-heritage-soft px-3 py-2 text-sm text-heritage" role="alert">
          {t("allDestinations.missing", { list: missing.map((type) => t(`types.${type.key}.tab`)).join(", ") })}
        </p>
      ) : null}

      {chosen ? (
        <TypeTable approvals={approvals} marks={marks} roles={roles} type={chosen} userId={userId} />
      ) : (
        <AllDestinationsTable
          marks={marks}
          rows={rows}
          sendable={sendable}
          userId={canCreateResource(roles, "destinations") && !scoped ? userId : null}
        />
      )}
    </div>
  );
}

/** A type's own table, with everything its list can do. */
async function TypeTable({ roles, type, userId, marks, approvals }: {
  readonly roles: readonly string[];
  readonly type: DestinationType;
  readonly userId: string | null;
  readonly marks: readonly ReviewMark[];
  readonly approvals: readonly ApprovalMark[];
}) {
  const attractions = type.key === "destinations";
  const scoped = seesOwnRowsOnly(roles, type.key);
  /* A reviewer's workspace is neither everything nor their own — say which. */
  const reviewing = attractions && !hasPermission(roles, "PERM_DESTINATION_EDIT_ANY") && hasPermission(roles, "PERM_PARTNER_LISTING_EDIT");
  const t = await getTranslations("catalog.allDestinations");
  const definition = await localizeDefinition(
    namesListingOwner(roles, type.key) ? getResource(type.key) : withoutField(getResource(type.key), "ownerUserId"),
  );
  return (
    <>
      {reviewing ? <p className="text-sm text-muted">{t("reviewing")}</p> : null}
      <ResourceTable
        canDelete={canDeleteResource(roles, type.key)}
        canSetStatus={canSetStatus(roles, type.key)}
        definition={definition}
        grants={roles}
        key={type.key}
        approvals={approvals}
        marks={marks}
        ownedBy={seesOwnListingsOnly(roles, type.key) ? userId : null}
        verifiable={attractions}
        ownerFilter={attractions && !scoped && canCreateResource(roles, type.key)}
        referenceOptions={{}}
        userId={attractions ? userId : null}
      />
    </>
  );
}
