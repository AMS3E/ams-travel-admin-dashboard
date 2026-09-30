import type { Metadata } from "next";
import { CmsDashboard } from "@/features/dashboard/components/cms-dashboard";
export const metadata: Metadata = { title: "Dashboard" };
export default function DashboardPage() {
  return <CmsDashboard />;
}
