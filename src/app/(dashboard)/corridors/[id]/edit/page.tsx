import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { canDeleteResource, canManageResource, canSetStatus } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { findRecord, getReferenceOptions } from "@/features/catalog/api/catalog.server";
import { ResourceForm } from "@/features/catalog/components/resource-form";
import { localizedResource } from "@/features/catalog/localize.server";
import { PageHeader } from "@/features/shell/components/page-header";
import { BackendApiError } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("corridors");
  return { title: t("edit.metaTitle") };
}

/** The corridor's overview: name, descriptions, cover, budget. Its days and stops are the builder's. */
export default async function EditCorridorPage(props: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await props.params;
  const admin = await requireAdmin();
  if (!canManageResource(admin.roles, "corridors") || !isUuid(id)) notFound();
  const [definition, t] = await Promise.all([localizedResource("corridors"), getTranslations("corridors")]);
  const record = await findRecord("corridors", id).catch((error: unknown) => {
    if (error instanceof BackendApiError && [400, 403, 404].includes(error.status)) notFound();
    throw error;
  });
  const name = typeof record.name === "string" ? record.name : t("edit.fallbackName");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <PageHeader backHref={`/corridors/${id}`} backLabel={name} description={t("edit.description")} title={t("edit.title")} />
      <ResourceForm
        afterSaveHref="/corridors/{id}"
        canDelete={canDeleteResource(admin.roles, "corridors")}
        canSetStatus={canSetStatus(admin.roles, "corridors")}
        cancelHref={`/corridors/${id}`}
        definition={definition}
        record={record}
        referenceOptions={await getReferenceOptions(definition, "fields")}
      />
    </div>
  );
}
