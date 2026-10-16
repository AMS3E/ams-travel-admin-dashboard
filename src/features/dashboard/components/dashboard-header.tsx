import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { BusinessRole } from "@/features/auth/permissions";
import type { AdminUser } from "@/features/auth/types";
import { useRoleProfile } from "@/features/dashboard/roles";
import { PageHeader } from "@/features/shell/components/page-header";

interface DashboardHeaderProps {
  readonly admin: AdminUser;
  readonly role: BusinessRole;
  readonly actions?: ReactNode;
}

/**
 * Every dashboard opens the same way: who you are, and which of the five
 * screens this is. The role in the eyebrow is the only thing distinguishing two
 * otherwise similar-looking boards, so it is never omitted.
 */
export function DashboardHeader({ admin, role, actions }: DashboardHeaderProps) {
  const t = useTranslations("stats");
  const profile = useRoleProfile()(role);
  const firstName = admin.name.split(/\s+/)[0] || admin.username;

  return (
    <PageHeader
      actions={actions}
      description={profile.blurb}
      eyebrow={profile.title}
      title={t("welcome", { name: firstName })}
    />
  );
}
