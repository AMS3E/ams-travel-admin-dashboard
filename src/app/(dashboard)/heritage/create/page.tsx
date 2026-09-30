import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landmark } from "lucide-react";
import { canCreateResource, canDeleteResource, canManageResource } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { getRecords } from "@/features/catalog/api/catalog.server";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { toFormValues, type ReferenceOption } from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import { CoverageBuilder } from "@/features/heritage/components/coverage-builder";
import { KindChooser } from "@/features/shell/components/kind-chooser";
import { PageHeader } from "@/features/shell/components/page-header";

export const metadata: Metadata = { title: "Create historical coverage" };

/** Where the website answers, for the link to a region's page. */
const WEBSITE_URL = (process.env.WEBSITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const byName = (a: CatalogRecord, b: CatalogRecord) => text(a.name).localeCompare(text(b.name), "en", { sensitivity: "base" });
/** A region's summary, cut at its first sentence so every card reads the same length. */
const firstSentence = (value: string) => (value.match(/^.*?[.!?](\s|$)/)?.[0] ?? value).trim();

/**
 * Create Historical Coverage. First "Which region's page?" — the active tourism
 * regions, in their numbered order, each with how many entries its list has. Then that region's
 * list, built step by step: A is No. 1, B is No. 2, and so on.
 */
export default async function CreateHeritagePage(props: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  if (!canCreateResource(admin.roles, "region-coverage")) notFound();
  const { region: wanted } = await props.searchParams;
  const [regions, entries] = await Promise.all([getRecords("regions"), getRecords("region-coverage")]);
  /* In their numbered order, 1 to 9, as Discover shows them. */
  const tourism = regions.filter((region) => region.kind === "TOURISM" && region.isActive !== false);
  const count = (id: string) => entries.filter((entry) => entry.regionId === id).length;
  const chosen = typeof wanted === "string" ? tourism.find((region) => text(region.code).toLowerCase() === wanted.toLowerCase() || region.id === wanted) : undefined;

  if (chosen) {
    const places = await getRecords("destinations");
    /* The region's own destinations, and any place one of its entries already opens. */
    const linked = new Set(entries.filter((entry) => entry.regionId === chosen.id).map((entry) => text(entry.destinationId)).filter(Boolean));
    const sites: ReferenceOption[] = places
      .filter(
        (place) =>
          (Array.isArray(place.tourismRegionIds) && place.tourismRegionIds.map(String).includes(chosen.id)) ||
          place.theme === chosen.code ||
          linked.has(place.id),
      )
      .toSorted(byName)
      .map((place) => ({ value: place.id, label: text(place.name), inactive: false, ...(place.status !== "PUBLISHED" ? { detail: "Draft" } : {}) }));

    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <PageHeader
          backHref="/heritage/create"
          backLabel="Choose another region"
          description="Its Historical coverage, step by step: A is No. 1 on the page, B is No. 2, and so on for as many as it needs. Each step is saved when you move on."
          eyebrow="Create Historical Coverage"
          title={text(chosen.name)}
        />
        <CoverageBuilder
          canDelete={canDeleteResource(admin.roles, "region-coverage")}
          canEdit={canManageResource(admin.roles, "region-coverage")}
          canEditIntro={canManageResource(admin.roles, "regions")}
          region={{ id: chosen.id, name: text(chosen.name), code: text(chosen.code) }}
          regionValues={toFormValues(getResource("regions"), chosen)}
          sites={sites}
          websiteHref={`${WEBSITE_URL}/regions/${text(chosen.code).toLowerCase()}`}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <PageHeader
        backHref="/heritage"
        backLabel="All Historical Coverage"
        description="Choose the region whose page it is for. Its Historical coverage is then made step by step — No. 1, No. 2, No. 3 — for as many as it needs."
        eyebrow="History & Heritage"
        title="Which region's Historical coverage?"
      />
      <KindChooser
        kinds={tourism.map((region) => {
          const entriesSoFar = count(region.id);
          return {
            key: region.id,
            title: text(region.name),
            description: firstSentence(text(region.description)) || "A tourism region.",
            href: `/heritage/create?region=${text(region.code).toLowerCase()}`,
            icon: Landmark,
            meta: entriesSoFar ? `${entriesSoFar} ${entriesSoFar === 1 ? "entry" : "entries"} — continue it` : "None yet — start with No. 1",
          };
        })}
      />
    </div>
  );
}
