import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/session";
import { findRecord } from "@/features/catalog/api/catalog.server";
import { DestinationInsight } from "@/features/dashboard/components/destination-insight";
import { PageHeader } from "@/features/shell/components/page-header";

type Params = { readonly params: Promise<{ readonly id: string }> };

async function nameOf(id: string): Promise<string | null> {
  try {
    const record = await findRecord("destinations", id);
    return typeof record.name === "string" ? record.name : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: (await nameOf(id)) ?? "Not found" };
}

/**
 * Content Management → Destination Stats → one destination: everything
 * known about it, read-only, with the form one click away. Opened from a
 * name on Destination Stats; All Destinations keeps opening the form,
 * since editing is its job.
 */
export default async function DestinationInsightPage({ params }: Params) {
  const { id } = await params;
  const admin = await requireAdmin();
  const name = await nameOf(id);
  if (!name) notFound();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: "secondary" })} href={`/destinations/${id}`}>
            <Pencil aria-hidden className="size-4" />
            Edit destination
          </Link>
        }
        backHref="/destination-stats"
        backLabel="Back to Destination Stats"
        title={name}
      />
      <DestinationInsight grants={admin.roles} id={id} />
    </div>
  );
}
