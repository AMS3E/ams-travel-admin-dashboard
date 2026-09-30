import { requireAdmin } from "@/features/auth/session";
import { displayName } from "@/features/auth/types";
import { AppShell } from "@/features/shell/components/app-shell";
import { getCurrentProfile } from "@/features/auth/profile.server";

/**
 * The real gate. `proxy.ts` only checks that a cookie exists; this proves the
 * signature and the ADMIN role before any dashboard route renders, and every
 * screen below it can then assume an administrator is present.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();
  const profile = await getCurrentProfile().catch(() => null);
  const account = profile
    ? { ...admin, name: displayName(profile), email: profile.email, avatarUrl: profile.avatarUrl }
    : admin;

  return <AppShell admin={account}>{children}</AppShell>;
}
