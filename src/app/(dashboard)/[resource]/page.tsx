import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  canCreateResource,
  canDeleteResource,
  canManageResource,
  canSetStatus,
  seesOwnListingsOnly,
  seesOwnRowsOnly,
} from "@/features/auth/permissions";
import { getBackendUserId, requireAdmin } from "@/features/auth/session";
import { BulkPhotoUpload } from "@/features/catalog/components/bulk-photo-upload";
import { ResourceTable } from "@/features/catalog/components/resource-table";
import { galleryOf } from "@/features/catalog/resource";
import { getResource, isResourceKey } from "@/features/catalog/resources";
import { PageHeader } from "@/features/shell/components/page-header";
import { navGroups, navigationForPath } from "@/features/shell/nav";
import { CmsPage } from "@/features/cms/components/cms-page";
import { AllDestinationsPage } from "@/features/catalog/components/all-destinations-page";
import { listPageOf } from "@/features/catalog/all-destinations";
import { getRecords, getReferenceOptions } from "@/features/catalog/api/catalog.server";
import { ListChips, type ListChip } from "@/features/catalog/components/list-chips";

export async function generateMetadata(
  props: PageProps<"/[resource]">,
): Promise<Metadata> {
  const { resource } = await props.params;
  return {
    title: isResourceKey(resource)
      ? resource === "destinations"
        ? "All Destinations"
        : resource === "regions"
        ? "Tourism Regions"
        : getResource(resource).labelPlural
      : (navigationForPath("/" + resource)?.label ?? "Not found"),
  };
}

export default async function ResourceListPage(
  props: PageProps<"/[resource]">,
) {
  const { resource } = await props.params;
  const admin = await requireAdmin();
  if (!isResourceKey(resource)) {
    const group = navGroups(admin.roles, true).find((entry) =>
      entry.items.some((item) => item.href === "/" + resource),
    );
    const item = group?.items.find((entry) => entry.href === "/" + resource);
    if (!item || !group) notFound();
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <PageHeader
          eyebrow={group.title}
          title={item.label}
          description={item.description}
        />
        <CmsPage key={resource} grants={admin.roles} resource={resource} userId={await getBackendUserId()} />
      </div>
    );
  }
  /*
   * The sidebar already leaves this table out for a role that cannot manage it;
   * this is the same answer for anyone who types the URL. Not found rather than
   * forbidden — the screen does not exist for them.
   */
  if (!canManageResource(admin.roles, resource)) notFound();

  /* Stays and food listings, and every kind of history, are listed on a tab; an old link lands there. */
  if (listPageOf(resource) !== `/${resource}`) redirect(listPageOf(resource));

  /* Every attraction, place to eat, stay and travel route, with a tab per main type. */
  if (resource === "destinations") {
    return <AllDestinationsPage roles={admin.roles} tab={(await props.searchParams).type} />;
  }

  const definition = getResource(resource);
  /* A gallery is filled, not written: offer many photographs at once. */
  const gallery = galleryOf(definition);
  /* Only destinations are shown to their author alone, and they are listed on All Destinations. */
  const scoped = seesOwnRowsOnly(admin.roles, resource);
  /* A partner's stays and foods are theirs alone. */
  const ownListings = seesOwnListingsOnly(admin.roles, resource);

  /*
   * A list narrowed by what its rows belong to: a category's or a tag's tourism
   * regions — the only ones those regions' pages and destinations are offered —
   * or an interest's group on the Interests tab. Rows that belong nowhere get a
   * chip of their own, so they are easy to find and give one.
   */
  const linkField = definition.groupBy ? undefined : definition.fields.find((field) => field.inverse && field.ref);
  const groupField = definition.groupBy
    ? definition.fields.find((field) => field.name === definition.groupBy!.field && field.options?.length)
    : undefined;
  const query = await props.searchParams;
  const [references, rows] = linkField || groupField
    ? await Promise.all([linkField ? getReferenceOptions(definition, "fields") : null, getRecords(resource)])
    : [null, []];
  const belongsTo = (row: (typeof rows)[number]): readonly string[] => {
    if (linkField) return Array.isArray(row[linkField.name]) ? (row[linkField.name] as unknown[]).map(String) : [];
    const value = groupField ? row[groupField.name] : null;
    return typeof value === "string" && value ? [value] : [];
  };
  const owners = linkField ? (references?.[linkField.ref!] ?? []) : (groupField?.options ?? []);
  const noun = linkField ? "region" : "group";
  const orphans = rows.filter((row) => belongsTo(row).length === 0).length;
  const chips: ListChip[] = [
    ...owners.map((owner) => ({ value: owner.value, label: owner.label, count: rows.filter((row) => belongsTo(row).includes(owner.value)).length })),
    ...(orphans ? [{ value: "none", label: `No ${noun}`, count: orphans }] : []),
  ];
  const chipParam = linkField ? "region" : "group";
  const chosen = chips.find((chip) => chip.value === query[chipParam]) ?? null;
  const plural = definition.labelPlural.toLowerCase();
  const chipHint = !chosen
    ? `Choose a ${linkField ? "tourism region" : "group"} to see its own ${plural}.`
    : chosen.value === "none"
      ? linkField
        ? `In no tourism region yet, so no region's page offers them. Open one and choose its regions.`
        : `In no group yet, so the Interests tab does not list them. Open one and choose its group.`
      : linkField
        ? `${chosen.label}'s own ${plural} — the only ones its page and its destinations are offered.`
        : `The ${chosen.label} group's own ${plural} — the Interests tab lists them under ${chosen.label}.`;
  /* "New" from a chip starts in it. */
  const preset = chosen && chosen.value !== "none"
    ? linkField
      ? `?${linkField.name}=${chosen.value}`
      : groupField
        ? `?${groupField.name}=${encodeURIComponent(chosen.value)}`
        : ""
    : "";

  // The client table requests scoped rows and reference options through RTK Query.

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          canCreateResource(admin.roles, resource) ? (
            <Link className={buttonVariants()} href={`/${resource}/new${preset}`}>
              <Plus aria-hidden className="size-4" />
              New {definition.label.toLowerCase()}
            </Link>
          ) : null
        }
        description={
          scoped
            ? `${definition.description} You are shown the ones you created.`
            : ownListings
              ? `${definition.description} You are shown the ones you own.`
              : definition.description
        }
        eyebrow={
          navGroups(admin.roles).find((group) => group.items.some((item) => item.href === "/" + resource))?.title ?? "Settings"
        }
        title={
          navigationForPath("/" + resource, admin.roles)?.label ?? definition.labelPlural
        }
      />

      {gallery && canCreateResource(admin.roles, resource) ? (
        <BulkPhotoUpload definition={definition} gallery={gallery} />
      ) : null}

      {chips.length ? (
        <ListChips
          active={chosen?.value ?? null}
          allLabel={linkField ? "All regions" : "All groups"}
          chips={chips}
          hint={chipHint}
          href={(value) => (value ? `/${resource}?${chipParam}=${encodeURIComponent(value)}` : `/${resource}`)}
          label={linkField ? "Tourism regions" : "Groups"}
          total={rows.length}
        />
      ) : null}

      <ResourceTable
        key={chosen?.value ?? "all"}
        within={chosen?.value ?? null}
        canDelete={canDeleteResource(admin.roles, resource)}
        canSetStatus={canSetStatus(admin.roles, resource)}
        definition={definition}
        grants={admin.roles}
        ownedBy={ownListings ? await getBackendUserId() : null}
        referenceOptions={{}}
        userId={null}
      />
    </div>
  );
}
