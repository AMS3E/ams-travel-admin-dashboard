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
import { CoverageForm } from "@/features/heritage/components/coverage-form";
import { getResource, isResourceKey } from "@/features/catalog/resources";
import { galleryOf, withoutField, type FieldValue, type FormValues } from "@/features/catalog/resource";
import { PageHeader } from "@/features/shell/components/page-header";
import { isUuid } from "@/lib/ids";

/** How a type reads in a sentence, where its option label would not. */
const TYPE_NOUNS: Readonly<Record<string, string>> = { CAFE: "cafe", STREET_FOOD: "street-food stall" };

export async function generateMetadata(
  props: PageProps<"/[resource]/new">,
): Promise<Metadata> {
  const { resource } = await props.params;
  return {
    title: isResourceKey(resource)
      ? `New ${getResource(resource).label.toLowerCase()}`
      : "Not found",
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
  const definition = namesListingOwner(admin.roles, resource)
    ? getResource(resource)
    : withoutField(getResource(resource), "ownerUserId");
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
  /* A timeline entry added from a destination goes back to that destination. */
  const origin =
    resource === "destination-histories" && typeof presets.destinationId === "string"
      ? `/destinations/${presets.destinationId}`
      : undefined;
  /* Opened from the "What are you adding?" chooser: Back goes back to it. */
  const chooser = query.from === "create" ? { href: "/create", label: "Create destination" } : null;
  /* A listing opened as a type says so: "List a new cafe", not "List a new food listing". */
  const typeOption = definition.fields.find((field) => field.name === "type")?.options?.find((option) => option.value === presets.type);
  const noun = typeOption && typeOption.value !== "OTHER"
    ? (TYPE_NOUNS[typeOption.value] ?? typeOption.label.toLowerCase())
    : resource === "destinations"
      ? "attraction"
      : definition.label.toLowerCase();

  /* An attraction, a stay or a food listing goes to its desk's reviewer from the form: an editor's or a BDO's to an administrator. */
  const sendsTo = listingTypeOf(resource) && (!canSetStatus(admin.roles, resource) || sendsOwnToAdmin(admin.roles)) ? submissionDesk(admin.roles) : null;
  const formProps = {
    afterSaveHref: origin ?? (sendsTo && ["PARTNER", "CONTRIBUTOR", "EDITOR", "BDO"].includes(primaryRole(admin.roles) ?? "") ? publishingHref(admin.roles) : undefined),
    canPublishOnCreate: publishes,
    canSetStatus: canSetStatus(admin.roles, resource),
    cancelHref: origin,
    definition,
    presets,
    record: null,
    referenceOptions,
    reviewer: sendsTo ? DESK_REVIEWERS[sendsTo] : undefined,
  };
  /* A destination, a stay or a food is listed step by step; everything else is one form. */
  const listing = isListing(resource);
  /* A gallery photo is rarely added alone: offer the many-at-once uploader above the single form. */
  const gallery = galleryOf(definition);
  const galleryOwner = gallery ? presets[gallery.owner.name] : undefined;

  return (
    <div className={`mx-auto flex flex-col gap-5 ${listing || resource === "region-coverage" ? "max-w-7xl" : "max-w-4xl"}`}>
      <PageHeader
        backHref={origin ?? chooser?.href ?? listPageOf(resource)}
        backLabel={origin ? "Destination" : chooser ? chooser.label : listPageLabel(resource, definition.labelPlural)}
        description={listing ? `List a new ${definition.label.toLowerCase()} in a few short steps. ${definition.description}` : definition.description}
        title={listing ? `List a new ${noun}` : resource === "region-coverage" ? "Add a royal capital" : `New ${definition.label.toLowerCase()}`}
      />

      {gallery ? (
        <BulkPhotoUpload
          definition={definition}
          gallery={gallery}
          owner={typeof galleryOwner === "string" ? galleryOwner : undefined}
        />
      ) : null}

      {/* A royal capital is made beside its region's list as the website shows it. */}
      {resource === "region-coverage" ? (
        <CoverageForm
          canDelete={canDeleteResource(admin.roles, resource)}
          record={null}
          referenceOptions={referenceOptions}
          place={typeof query.place === "string" && /^\d{1,3}$/.test(query.place) ? Number(query.place) : undefined}
          regionId={typeof presets.regionId === "string" ? presets.regionId : undefined}
        />
      ) : listing ? (
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
