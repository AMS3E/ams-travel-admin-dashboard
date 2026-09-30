import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasPermission } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { AccountForm } from "@/features/people/components/account-form";
import { PageHeader } from "@/features/shell/components/page-header";
import { initialAccountRole } from "@/features/people/workspace-roles";

export const metadata: Metadata = { title: "New account" };

export default async function NewAccountPage(props: PageProps<"/people/new">) {
  const admin = await requireAdmin();
  if (!hasPermission(admin.roles, "PERM_USER_MANAGE") || !hasPermission(admin.roles, "PERM_ROLE_ASSIGN")) notFound();
  const { role } = await props.searchParams;
  const initialRole = initialAccountRole(role);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        backHref="/people"
        backLabel="People"
        description="Choose their role and sign-in details. They will start in the workspace for their role."
        title="New account"
      />

      <AccountForm initialRole={initialRole} key={initialRole} />
    </div>
  );
}
