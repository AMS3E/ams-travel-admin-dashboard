import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canManageResource } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { AllHistoricalCoverage } from "@/features/heritage/components/heritage-page";
import { HERITAGE_TABS, HERITAGE_TAGS } from "@/features/heritage/heritage-tabs";

export const metadata: Metadata = { title: "All historical coverage" };

/**
 * History & Heritage: each tourism region's Historical coverage, as its page
 * shows it. The kings, eras, faiths and styles once on its tabs are Heritage
 * Tags now, so an old link to one of those tabs opens it there.
 */
export default async function HistoricalCoveragePage(props: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { type } = await props.searchParams;
  const moved = HERITAGE_TABS.find((tab) => tab.tab === type);
  if (moved) redirect(`${HERITAGE_TAGS}?type=${moved.tab}`);
  const admin = await requireAdmin();
  if (!canManageResource(admin.roles, "region-coverage")) notFound();
  return <AllHistoricalCoverage roles={admin.roles} />;
}
