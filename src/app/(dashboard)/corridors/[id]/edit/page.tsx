import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canDeleteResource, canManageResource, canSetStatus } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { findRecord, getReferenceOptions } from "@/features/catalog/api/catalog.server";
import { ResourceForm } from "@/features/catalog/components/resource-form";
import { getResource } from "@/features/catalog/resources";
import { PageHeader } from "@/features/shell/components/page-header";
import { BackendApiError } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";

export const metadata: Metadata = { title: "Edit tourism corridor" };

/** The corridor's overview: name, descriptions, cover, budget. Its days and stops are the builder's. */
export default async function EditCorridorPage(props: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await props.params;
  const admin = await requireAdmin();
  if (!canManageResource(admin.roles, "corridors") || !isUuid(id)) notFound();
  const definition = getResource("corridors");
  const record = await findRecord("corridors", id).catch((error: unknown) => {
    if (error instanceof BackendApiError && [400, 403, 404].includes(error.status)) notFound();
    throw error;
  });
  const name = typeof record.name === "string" ? record.name : "Tourism corridor";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <PageHeader backHref={`/corridors/${id}`} backLabel={name} description="The overview travellers read first." title="Edit corridor details" />
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
