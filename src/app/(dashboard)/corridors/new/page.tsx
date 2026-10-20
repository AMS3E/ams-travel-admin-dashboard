import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { canCreateResource, canPublishOnCreate } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { getReferenceOptions } from "@/features/catalog/api/catalog.server";
import { localizedResource } from "@/features/catalog/localize.server";
import { CORRIDOR_INTEREST_GROUP } from "@/features/catalog/resources";
import { getDestinationChoices, mapsSettings } from "@/features/corridors/api/corridors.server";
import { CorridorCreator } from "@/features/corridors/components/corridor-creator";
import { PageHeader } from "@/features/shell/components/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("corridors");
  return { title: t("create.title") };
}

/**
 * A corridor in one go: what it is, its days and stops with the map beside
 * them, and one button that creates it — published at once for someone who
 * curates corridors, unless they keep it a draft.
 */
export default async function NewCorridorPage() {
  const admin = await requireAdmin();
  if (!canCreateResource(admin.roles, "corridors")) notFound();
  const [destinations, references, t] = await Promise.all([
    getDestinationChoices(),
    localizedResource("corridors").then((definition) => getReferenceOptions(definition, "fields")),
    getTranslations("corridors"),
  ]);
  /* The Tourism Corridors shelf's interests, A to Z: the ones a corridor is listed under. */
  const interests = (references.interests ?? [])
    .filter((option) => option.group === CORRIDOR_INTEREST_GROUP && !option.inactive)
    .toSorted((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));

  return (
    <div className="mx-auto flex max-w-[92rem] flex-col gap-5">
      <PageHeader
        backHref="/corridors"
        backLabel={t("words.tourismCorridors")}
        description={t("create.description")}
        title={t("create.title")}
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
