import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Shapes } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { canManageResource } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { findRecord } from "@/features/catalog/api/catalog.server";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { RegionDetail } from "@/features/catalog/components/region-detail";
import { PageHeader } from "@/features/shell/components/page-header";

type Params = { readonly params: Promise<{ readonly id: string }> };

/** The region, if it is a tourism region: a zone the provinces sit in has no page among them. */
async function tourismRegion(id: string): Promise<CatalogRecord | null> {
  try {
    const record = await findRecord("regions", id);
    return record.kind === "TOURISM" ? record : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const region = await tourismRegion(id);
  return { title: region && typeof region.name === "string" ? region.name : "Not found" };
}

/**
 * Content Management → Tourism Regions → one region: what its page in the
 * app shows, read-only, with its form and its lists one click away each.
 */
export default async function RegionPage({ params }: Params) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!canManageResource(admin.roles, "regions")) notFound();
  const region = await tourismRegion(id);
  if (!region || typeof region.name !== "string") notFound();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          <>
            <Link className={buttonVariants({ variant: "ghost" })} href="/categories-and-tags">
              <Shapes aria-hidden className="size-4" />
              Manage categories & tags
            </Link>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/regions/${id}/edit`}>
              <Pencil aria-hidden className="size-4" />
              Edit region
            </Link>
          </>
        }
        backHref="/regions"
        backLabel="Back to Tourism Regions"
        description={typeof region.code === "string" ? region.code : undefined}
        title={region.name}
      />
      <RegionDetail id={id} />
    </div>
  );
}
