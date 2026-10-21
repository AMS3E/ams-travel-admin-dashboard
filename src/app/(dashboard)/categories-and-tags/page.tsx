import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  canCreateResource,
  canDeleteResource,
  canManageResource,
  canSetStatus,
} from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { getRecords, getReferenceOptions } from "@/features/catalog/api/catalog.server";
import { ListChips, type ListChip } from "@/features/catalog/components/list-chips";
import { ResourceTable } from "@/features/catalog/components/resource-table";
import { localizedResource } from "@/features/catalog/localize.server";
import { navWords } from "@/features/shell/nav-words";
import { navGroups, navigationForPath } from "@/features/shell/nav";
import { PageHeader } from "@/features/shell/components/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const nav = await getTranslations("shell.nav");
  const item = navigationForPath("/categories-and-tags");
  return { title: item ? navWords(nav).label(item.text) : "Tourism Regions" };
}

const regionsOf = (row: CatalogRecord): readonly string[] =>
  Array.isArray(row.tourismRegionIds) ? (row.tourismRegionIds as unknown[]).map(String) : [];

/**
 * Taxonomy → Tourism Regions: each region's own categories and tags, on one
 * page. The region chips on top narrow both standard tables at once; "New"
 * from a chip starts in that region. The lists stay two resources — only the
 * screen is shared.
 */
export default async function CategoriesAndTagsPage(props: PageProps<"/categories-and-tags">) {
  const admin = await requireAdmin();
  if (!canManageResource(admin.roles, "categories")) notFound();
  const [t, nav] = await Promise.all([getTranslations("shell.lists"), getTranslations("shell.nav")]);
  const words = navWords(nav);
  const [categories, tags] = await Promise.all([localizedResource("categories"), localizedResource("tags")]);
  const [references, categoryRows, tagRows, query] = await Promise.all([
    getReferenceOptions(categories, "fields"),
    getRecords("categories"),
    getRecords("tags"),
    props.searchParams,
  ]);

  /* One chip per tourism region, counting its categories and tags together. Rows that belong nowhere get their own. */
  const rows = [...categoryRows, ...tagRows];
  const owners = references["tourism-regions"] ?? [];
  const orphans = rows.filter((row) => regionsOf(row).length === 0).length;
  const chips: ListChip[] = [
    ...owners.map((owner) => ({ value: owner.value, label: owner.label, count: rows.filter((row) => regionsOf(row).includes(owner.value)).length })),
    ...(orphans ? [{ value: "none", label: t("chips.noRegion"), count: orphans }] : []),
  ];
  const chosen = chips.find((chip) => chip.value === query.region) ?? null;
  const plural = t("chips.terms");
  const hint = !chosen
    ? t("chips.chooseRegion", { plural })
    : chosen.value === "none"
      ? t("chips.noRegionHint")
      : t("chips.regionHint", { name: chosen.label, plural });
  /* "New" from a chip starts in it. */
  const preset = chosen && chosen.value !== "none" ? `?tourismRegionIds=${chosen.value}` : "";

  const item = navigationForPath("/categories-and-tags", admin.roles);
  const group = navGroups(admin.roles).find((each) => each.items.some((entry) => entry.href === "/categories-and-tags"));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        description={item ? words.description(item.text) : categories.description}
        eyebrow={group ? words.group(group) : undefined}
        title={item ? words.label(item.text) : categories.labelPlural}
      />

      <ListChips
        active={chosen?.value ?? null}
        allLabel={t("chips.allRegions")}
        chips={chips}
        hint={hint}
        href={(value) => (value ? `/categories-and-tags?region=${encodeURIComponent(value)}` : "/categories-and-tags")}
        label={t("chips.regions")}
        total={rows.length}
      />

      {[categories, tags].map((definition) => (
        <section aria-label={definition.labelPlural} className="flex flex-col gap-3" key={definition.key}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-md font-semibold text-ink">{definition.labelPlural}</h2>
              <p className="mt-0.5 text-xs text-muted">{definition.description}</p>
            </div>
            {canCreateResource(admin.roles, definition.key) ? (
              <Link className={buttonVariants({ size: "sm" })} href={`/${definition.key}/new${preset}`}>
                <Plus aria-hidden className="size-4" />
                {t("new", { label: definition.label.toLowerCase() })}
              </Link>
            ) : null}
          </div>
          <ResourceTable
            key={chosen?.value ?? "all"}
            within={chosen?.value ?? null}
            canDelete={canDeleteResource(admin.roles, definition.key)}
            canSetStatus={canSetStatus(admin.roles, definition.key)}
            definition={definition}
            grants={admin.roles}
            referenceOptions={{}}
            userId={null}
          />
        </section>
      ))}
    </div>
  );
}
