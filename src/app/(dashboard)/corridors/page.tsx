import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  canCreateResource,
  canDeleteResource,
  canManageResource,
  canSetStatus,
} from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { ResourceTable } from "@/features/catalog/components/resource-table";
import { getResource } from "@/features/catalog/resources";
import { PageHeader } from "@/features/shell/components/page-header";

export const metadata: Metadata = { title: "Tourism Corridors" };

/** Every corridor, drafts included, with how far its itinerary and route have come. */
export default async function CorridorListPage() {
  const admin = await requireAdmin();
  if (!canManageResource(admin.roles, "corridors")) notFound();
  const definition = getResource("corridors");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          canCreateResource(admin.roles, "corridors") ? (
            <Link className={buttonVariants()} href="/corridors/new">
              <Plus aria-hidden className="size-4" />
              New corridor
            </Link>
          ) : null
        }
        description={definition.description}
        eyebrow="Content Management"
        title="Tourism Corridors"
      />
      <ResourceTable
        canDelete={canDeleteResource(admin.roles, "corridors")}
        canSetStatus={canSetStatus(admin.roles, "corridors")}
        definition={definition}
        grants={admin.roles}
        referenceOptions={{}}
        userId={null}
      />
    </div>
  );
}
