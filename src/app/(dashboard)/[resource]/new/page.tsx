import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPageLabel, listPageOf } from "@/features/catalog/all-destinations";
import {
  canCreateResource,
  canDeleteResource,
  canPublishOnCreate,
  canSetStatus,
  namesListingOwner,
  primaryRole,
} from "@/features/auth/permissions";
import { publishingHref, sendsOwnToAdmin, submissionDesk } from "@/features/publishing/workflow";
import { DESK_REVIEWERS, listingTypeOf } from "@/features/publishing/api/contracts";
import { requireAdmin } from "@/features/auth/session";
import { getReferenceOptions } from "@/features/catalog/api/catalog.server";
import { BulkPhotoUpload } from "@/features/catalog/components/bulk-photo-upload";
import { ListingForm } from "@/features/catalog/components/listing-form/listing-form";
import { LISTING_GALLERIES, isListing } from "@/features/catalog/components/listing-form/steps";
import { ResourceForm } from "@/features/catalog/components/resource-form";
import { getResource, isResourceKey } from "@/features/catalog/resources";
import { getTranslations } from "next-intl/server";
import { localizeDefinition, localizedResource } from "@/features/catalog/localize.server";
import { galleryOf, withoutField, type FieldValue, type FormValues } from "@/features/catalog/resource";
import { PageHeader } from "@/features/shell/components/page-header";
import { isUuid } from "@/lib/ids";

/** Types that read in a sentence differently from their option label; their words are in shell.json, under lists.nouns. */
const TYPE_NOUNS: ReadonlySet<string> = new Set(["CAFE", "STREET_FOOD"]);

export async function generateMetadata(
  props: PageProps<"/[resource]/new">,
): Promise<Metadata> {
  const { resource } = await props.params;
  const t = await getTranslations("shell.lists");
  return {
    title: isResourceKey(resource)
      ? t("new", { label: (await localizedResource(resource)).label.toLowerCase() })
      : t("notFound"),
  };
}

export default async function NewRecordPage(
  props: PageProps<"/[resource]/new">,
) {
  const { resource } = await props.params;
  if (!isResourceKey(resource)) notFound();

  const admin = await requireAdmin();
  /* No create permission, no create screen — the API would answer 403. */
  if (!canCreateResource(admin.roles, resource)) notFound();

  /* Who runs it is asked only of a desk that lists for others; an owner is their own. */
  const t = await getTranslations("shell.lists");
  const allDestinations = (await getTranslations("catalog"))("allDestinations.title");
  const definition = await localizeDefinition(
    namesListingOwner(admin.roles, resource) ? getResource(resource) : withoutField(getResource(resource), "ownerUserId"),
  );
  const [referenceOptions, query] = await Promise.all([
    getReferenceOptions(definition, "fields"),
    props.searchParams,
  ]);

  /*
   * A link can choose a reference for the new row — `?destinationId=` from a
   * destination's heritage panel, `?tourismRegionIds=` from Create New. Only a
   * UUID is taken, and only for a `ref` or `refs` field; the API still
   * decides whether that row may be pointed at. `?type=` chooses a listing's
   * type, and only one of the values that field offers.
   */
  const publishes = canPublishOnCreate(admin.roles, resource);
  const presets: FormValues = {
    ...Object.fromEntries(
      definition.fields.flatMap((field): [string, FieldValue][] => {
        const value = query[field.name];
        if (field.kind === "ref" && isUuid(value)) return [[field.name, value]];
        if (field.kind === "refs" && isUuid(value)) return [[field.name, [value]]];
        if (
          field.kind === "enum" &&
          (field.name === "type" || field.name === definition.groupBy?.field) &&
          typeof value === "string" &&
          field.options?.some((option) => option.value === value)
        ) {
          return [[field.name, value]];
        }
        return [];
      }),
    ),
    /* An administrator's new destination, stay or food starts out live; they may pick Draft instead. */
    ...(publishes && definition.status ? { status: definition.status.live } : {}),
  };
  /* Opened from the "What are you adding?" chooser: Back goes back to it. */
  const chooser = query.from === "create" ? { href: "/create", label: t("backToCreate") } : null;
  /* A listing opened as a type says so: "List a new cafe", not "List a new food listing". */
  const typeOption = definition.fields.find((field) => field.name === "type")?.options?.find((option) => option.value === presets.type);
  const noun = typeOption && typeOption.value !== "OTHER"
    ? (TYPE_NOUNS.has(typeOption.value) ? t(`nouns.${typeOption.value as "CAFE" | "STREET_FOOD"}`) : typeOption.label.toLowerCase())
    : resource === "destinations"
      ? t("nouns.attraction")
      : definition.label.toLowerCase();

  /* An attraction, a stay or a food listing goes to its desk's reviewer from the form: an editor's or a BDO's to an administrator. */
  const sendsTo = listingTypeOf(resource) && (!canSetStatus(admin.roles, resource) || sendsOwnToAdmin(admin.roles)) ? submissionDesk(admin.roles) : null;
  const formProps = {
    afterSaveHref: sendsTo && ["PARTNER", "CONTRIBUTOR", "EDITOR", "BDO"].includes(primaryRole(admin.roles) ?? "") ? publishingHref(admin.roles) : undefined,
    canPublishOnCreate: publishes,
    canSetStatus: canSetStatus(admin.roles, resource),
    definition,
    presets,
    record: null,
    referenceOptions,
    reviewer: sendsTo ? DESK_REVIEWERS[sendsTo] : undefined,
  };
  /* A destination, a stay or a food has the listing form, with its sections and checklist; everything else the plain one. */
  const listing = isListing(resource);
  /* A gallery photo is rarely added alone: offer the many-at-once uploader above the single form. */
  const gallery = galleryOf(definition);
  const galleryOwner = gallery ? presets[gallery.owner.name] : undefined;

  return (
    <div className={`mx-auto flex flex-col gap-5 ${listing ? "max-w-7xl" : "max-w-4xl"}`}>
      <PageHeader
        backHref={chooser?.href ?? listPageOf(resource)}
        backLabel={chooser ? chooser.label : listPageLabel(resource, definition.labelPlural, allDestinations)}
        description={definition.description}
        title={listing ? t("listNew", { noun }) : t("new", { label: definition.label.toLowerCase() })}
      />

      {gallery ? (
        <BulkPhotoUpload
          definition={definition}
          gallery={gallery}
          owner={typeof galleryOwner === "string" ? galleryOwner : undefined}
        />
      ) : null}

      {listing ? (
        <ListingForm
          {...formProps}
          gallery={{
            canAdd: canCreateResource(admin.roles, LISTING_GALLERIES[resource]),
            canDelete: canDeleteResource(admin.roles, LISTING_GALLERIES[resource]),
          }}
        />
      ) : (
        <ResourceForm {...formProps} />
      )}
    </div>
  );
}
