import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/auth/session";
import { HeritageTags, heritageTagTabs } from "@/features/heritage/components/heritage-tags-page";

export const metadata: Metadata = { title: "Heritage tags" };

/**
 * History & Heritage → Heritage Tags: the architecture styles, historical
 * periods, kings and religions an ancient site's tags offer, a tab each.
 */
export default async function HeritageTagsPage(props: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  if (!heritageTagTabs(admin.roles).length) notFound();
  return <HeritageTags roles={admin.roles} tab={(await props.searchParams).type} />;
}
