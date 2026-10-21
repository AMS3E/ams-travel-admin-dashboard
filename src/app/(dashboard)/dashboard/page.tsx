import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CmsDashboard } from "@/features/dashboard/components/cms-dashboard";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}
export default function DashboardPage() {
  return <CmsDashboard />;
}
