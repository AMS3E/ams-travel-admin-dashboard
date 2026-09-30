import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canCreateResource, canPublishOnCreate } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { getReferenceOptions } from "@/features/catalog/api/catalog.server";
import { CORRIDOR_INTEREST_GROUP, getResource } from "@/features/catalog/resources";
import { getDestinationChoices, mapsSettings } from "@/features/corridors/api/corridors.server";
import { CorridorCreator } from "@/features/corridors/components/corridor-creator";
import { PageHeader } from "@/features/shell/components/page-header";

export const metadata: Metadata = { title: "New tourism corridor" };

/**
 * A corridor in one go: what it is, its days and stops with the map beside
 * them, and one button that creates it — published at once for someone who
 * curates corridors, unless they keep it a draft.
 */
export default async function NewCorridorPage() {
  const admin = await requireAdmin();
  if (!canCreateResource(admin.roles, "corridors")) notFound();
  const [destinations, references] = await Promise.all([getDestinationChoices(), getReferenceOptions(getResource("corridors"), "fields")]);
  /* The Tourism Corridors shelf's interests, A to Z: the ones a corridor is listed under. */
  const interests = (references.interests ?? [])
    .filter((option) => option.group === CORRIDOR_INTEREST_GROUP && !option.inactive)
    .toSorted((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));

  return (
    <div className="mx-auto flex max-w-[92rem] flex-col gap-5">
      <PageHeader
        backHref="/corridors"
        backLabel="Tourism Corridors"
        description="Name it, add the destinations day by day, and create it. Everything can be changed afterwards."
        title="New tourism corridor"
      />
      <CorridorCreator
        canPublish={canPublishOnCreate(admin.roles, "corridors")}
        destinations={destinations}
        interests={interests}
        maps={mapsSettings()}
      />
    </div>
  );
}
