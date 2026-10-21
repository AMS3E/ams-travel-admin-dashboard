import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/features/auth/session";
import { findRecord } from "@/features/catalog/api/catalog.server";
import { DestinationInsight, type PlaceResource } from "@/features/dashboard/components/destination-insight";
import { PageHeader } from "@/features/shell/components/page-header";
import { isUuid } from "@/lib/ids";

type Params = {
  readonly params: Promise<{ readonly resource: string; readonly id: string }>;
  readonly searchParams: Promise<{ readonly from?: string | string[] }>;
};

const RESOURCES: readonly PlaceResource[] = ["destinations", "stays", "foods", "activities"];
/** The pencil's words, `stats.detail`, by kind. */
const EDIT: Readonly<Record<PlaceResource, "edit" | "editStay" | "editFood" | "editActivity">> = { destinations: "edit", stays: "editStay", foods: "editFood", activities: "editActivity" };

type BackLabel = "backAll" | "back" | "backRegion";
/** Where the page was opened from, and so where Back goes: a tab of All Destinations, Destination Stats or a region's page; All Destinations otherwise. */
const BACK: Readonly<Record<string, { readonly href: string; readonly label: BackLabel }>> = {
  attractions: { href: "/destinations?type=attractions", label: "backAll" },
  food: { href: "/destinations?type=food", label: "backAll" },
  stays: { href: "/destinations?type=stays", label: "backAll" },
  activities: { href: "/destinations?type=activities", label: "backAll" },
  stats: { href: "/destination-stats", label: "back" },
};
const BACK_DEFAULT = { href: "/destinations", label: "backAll" } as const;

function backOf(from: string | string[] | undefined): { readonly href: string; readonly label: BackLabel } {
  if (typeof from !== "string") return BACK_DEFAULT;
  const region = from.startsWith("region:") ? from.slice("region:".length) : null;
  if (region && isUuid(region)) return { href: `/regions/${region}`, label: "backRegion" };
  return BACK[from] ?? BACK_DEFAULT;
}

function placeResource(resource: string): PlaceResource | null {
  return (RESOURCES as readonly string[]).includes(resource) ? (resource as PlaceResource) : null;
}

/** The listing's name, read once per request; null when no listing of that kind has the id. */
const nameOf = cache(async (resource: PlaceResource, id: string): Promise<string | null> => {
  try {
    const record = await findRecord(resource, id);
    return typeof record.name === "string" ? record.name : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { resource, id } = await params;
  const kind = placeResource(resource);
  const t = await getTranslations("stats.detail");
  return { title: (kind && isUuid(id) ? await nameOf(kind, id) : null) ?? t("notFound") };
}

/**
 * Content Management → All Destinations → one place, an attraction, a stay or
 * a food place: everything known about it, read-only, with the form one click
 * away. The place's own page, under its listing's address, so the sidebar
 * stays on All Destinations wherever it was opened from: a name on All
 * Destinations, on Destination Stats or on a region's page (`?from=` says
 * which, for the way back). The pencil on those lists keeps the form, since
 * editing is its job.
 */
export default async function DestinationDetailPage({ params, searchParams }: Params) {
  const [{ resource, id }, { from }] = await Promise.all([params, searchParams]);
  const kind = placeResource(resource);
  if (!kind || !isUuid(id)) notFound();
  const admin = await requireAdmin();
  const name = await nameOf(kind, id);
  if (!name) notFound();
  const back = backOf(from);
  const t = await getTranslations("stats.detail");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: "secondary" })} href={`/${kind}/${id}`}>
            <Pencil aria-hidden className="size-4" />
            {t(EDIT[kind])}
          </Link>
        }
        backHref={back.href}
        backLabel={t(back.label)}
        title={name}
      />
      <DestinationInsight grants={admin.roles} id={id} resource={kind} />
    </div>
  );
}
