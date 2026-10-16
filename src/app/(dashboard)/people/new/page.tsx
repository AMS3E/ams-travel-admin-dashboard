import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { hasPermission } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { AccountForm } from "@/features/people/components/account-form";
import { PageHeader } from "@/features/shell/components/page-header";
import { initialAccountRole } from "@/features/people/workspace-roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people.newAccount");
  return { title: t("title") };
}

export default async function NewAccountPage(props: PageProps<"/people/new">) {
  const admin = await requireAdmin();
  if (!hasPermission(admin.roles, "PERM_USER_MANAGE") || !hasPermission(admin.roles, "PERM_ROLE_ASSIGN")) notFound();
  const { role } = await props.searchParams;
  const initialRole = initialAccountRole(role);
  const t = await getTranslations("people");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        backHref="/people"
        backLabel={t("list.title")}
        description={t("newAccount.description")}
        title={t("newAccount.title")}
      />

      <AccountForm initialRole={initialRole} key={initialRole} />
    </div>
  );
}
