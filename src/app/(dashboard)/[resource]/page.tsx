import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { chipValues, galleryOf, mediaPath } from "@/features/catalog/resource";
import { isResourceKey } from "@/features/catalog/resources";
import { localizedResource } from "@/features/catalog/localize.server";
import { navWords } from "@/features/shell/nav-words";
import { dashboardItem } from "@/features/shell/nav";
import { PageHeader } from "@/features/shell/components/page-header";
import { navGroups, navigationForPath } from "@/features/shell/nav";
import { CmsPage } from "@/features/cms/components/cms-page";
import { AllDestinationsPage } from "@/features/catalog/components/all-destinations-page";
import { MediaGallery } from "@/features/catalog/components/media-gallery/media-gallery";
import { listPageOf } from "@/features/catalog/all-destinations";
import { getRecords, getReferenceOptions } from "@/features/catalog/api/catalog.server";
import { ListChips, type ListChip } from "@/features/catalog/components/list-chips";
import { InterestGroupCards } from "@/features/catalog/components/interest-group-cards";
import type { InterestGroupResponse } from "@/features/catalog/api/contracts";
import { backendRequest } from "@/lib/backend-api.server";

export async function generateMetadata(
  props: PageProps<"/[resource]">,
): Promise<Metadata> {
  const { resource } = await props.params;
  const [t, nav] = await Promise.all([getTranslations("shell.lists"), getTranslations("shell.nav")]);
  const words = navWords(nav);
  /* The sidebar's name where the page has an entry: All Destinations, Tourism Regions, a desk's page. */
  const item = navigationForPath("/" + resource);
  return {
    title: item && item.href !== dashboardItem.href
      ? words.label(item.text)
      : isResourceKey(resource)
        ? (await localizedResource(resource)).labelPlural
        : t("notFound"),
  };
}

export default async function ResourceListPage(
  props: PageProps<"/[resource]">,
) {
  const { resource } = await props.params;
  const admin = await requireAdmin();
  const [t, nav] = await Promise.all([getTranslations("shell.lists"), getTranslations("shell.nav")]);
  const words = navWords(nav);
  if (!isResourceKey(resource)) {
    const group = navGroups(admin.roles, true).find((entry) =>
      entry.items.some((item) => item.href === "/" + resource),
    );
    const item = group?.items.find((entry) => entry.href === "/" + resource);
    if (!item || !group) notFound();
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <PageHeader
          eyebrow={words.group(group)}
          title={words.label(item.text)}
          description={words.description(item.text)}
          icon={resource === "settings" ? item.icon : undefined}
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

  /* Categories and tags live together on Taxonomy → Tourism Regions; the old list addresses land there. */
  if (resource === "categories" || resource === "tags") {
    const { region } = await props.searchParams;
    redirect(typeof region === "string" && region ? `/categories-and-tags?region=${encodeURIComponent(region)}` : "/categories-and-tags");
  }

  /* Every attraction, place to eat and stay, with a tab per main type. */
  if (resource === "destinations") {
    return <AllDestinationsPage roles={admin.roles} tab={(await props.searchParams).type} />;
  }

  /* A destination's photos are browsed as a gallery, the way a media library shows its files. */
  if (resource === "destination-media") {
    return (
      <MediaGallery
        canAdd={canCreateResource(admin.roles, resource)}
        canDelete={canDeleteResource(admin.roles, resource)}
        canEdit={canManageResource(admin.roles, resource)}
        canSetStatus={canSetStatus(admin.roles, resource)}
        grants={admin.roles}
      />
    );
  }

  const definition = await localizedResource(resource);
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
  /* A list may name its own chips, one covering several values: the badges' Adventurer holds both kinds of stamps. */
  const groupChips = definition.groupBy?.chips;
  const owners = linkField ? (references?.[linkField.ref!] ?? []) : (groupChips ?? groupField?.options ?? []);
  const orphans = rows.filter((row) => belongsTo(row).length === 0).length;
  /* An interest group's card shows the picture an editor set for it. */
  const groupPictures: Readonly<Record<string, string>> = resource === "interests"
    ? Object.fromEntries(
        (await backendRequest<InterestGroupResponse[]>("/interest-groups").catch(() => []))
          .filter((group) => group.coverKey)
          .map((group) => [group.name, mediaPath(group.coverKey!)]),
      )
    : {};
  const chips: ListChip[] = [
    ...owners.map((owner) => ({
      value: owner.value,
      label: owner.label,
      count: rows.filter((row) => chipValues(groupChips, owner.value).some((value) => belongsTo(row).includes(value))).length,
      image: groupPictures[owner.value],
    })),
    ...(orphans ? [{ value: "none", label: linkField ? t("chips.noRegion") : t("chips.noGroup"), count: orphans }] : []),
  ];
  const chipParam = linkField ? "region" : "group";
  const chosen = chips.find((chip) => chip.value === query[chipParam]) ?? null;
  const plural = definition.labelPlural.toLowerCase();
  /* Only interests have a tab that lists them by group; amenities and badges are just filtered. */
  const interests = resource === "interests";
  const chipHint = !chosen
    ? t(linkField ? "chips.chooseRegion" : "chips.chooseGroup", { plural })
    : chosen.value === "none"
      ? t(linkField ? "chips.noRegionHint" : interests ? "chips.noInterestGroupHint" : "chips.noGroupHint")
      : t(linkField ? "chips.regionHint" : interests ? "chips.interestGroupHint" : "chips.groupHint", { name: chosen.label, plural });
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
              {t("new", { label: definition.label.toLowerCase() })}
            </Link>
          ) : null
        }
        description={
          scoped
            ? t("scopedCreated", { description: definition.description })
            : ownListings
              ? t("scopedOwned", { description: definition.description })
              : definition.description
        }
        eyebrow={(() => {
          const group = navGroups(admin.roles).find((each) => each.items.some((item) => item.href === "/" + resource));
          return group ? words.group(group) : nav("items.settings.label");
        })()}
        title={(() => {
          const item = navigationForPath("/" + resource, admin.roles);
          return item ? words.label(item.text) : definition.labelPlural;
        })()}
      />

      {gallery && canCreateResource(admin.roles, resource) ? (
        <BulkPhotoUpload definition={definition} gallery={gallery} />
      ) : null}

      {/* The interest groups as cards with their pictures, changed from here. */}
      {chips.length && resource === "interests" ? (
        <InterestGroupCards
          active={chosen?.value ?? null}
          allLabel={t("chips.allGroups")}
          canChange={canManageResource(admin.roles, resource)}
          chips={chips}
          hint={chipHint}
          label={t("chips.groups")}
          path={`/${resource}`}
          total={rows.length}
        />
      ) : chips.length ? (
        <ListChips
          active={chosen?.value ?? null}
          allLabel={linkField ? t("chips.allRegions") : t("chips.allGroups")}
          chips={chips}
          hint={chipHint}
          href={(value) => (value ? `/${resource}?${chipParam}=${encodeURIComponent(value)}` : `/${resource}`)}
          label={linkField ? t("chips.regions") : t("chips.groups")}
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
