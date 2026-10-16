import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { hasPermission } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { AccountProfileForm } from "@/features/people/components/account-profile-form";
import { RoleForm } from "@/features/people/components/role-form";
import { findPerson } from "@/features/people/people.server";
import { PageHeader } from "@/features/shell/components/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people.account");
  return { title: t("title") };
}

export default async function AccountPage(props: PageProps<"/people/[id]">) {
  const admin = await requireAdmin();
  if (!hasPermission(admin.roles, "PERM_USER_MANAGE")) notFound();

  const { id } = await props.params;
  const person = await findPerson(id);
  if (!person) notFound();
  const t = await getTranslations("people");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        actions={
          person.enabled ? null : <Badge tone="inactive">{t("status.disabled")}</Badge>
        }
        backHref="/people"
        backLabel={t("list.title")}
        description={[person.username, person.email].filter(Boolean).join(" · ")}
        title={person.name}
      />

      <section aria-labelledby="profile">
        <h2 className="mb-2 text-md font-semibold text-ink" id="profile">
          {t("account.profile")}
        </h2>
        <AccountProfileForm person={person} self={person.id === admin.id} />
      </section>

      <section aria-labelledby="roles">
        <h2 className="mb-2 text-md font-semibold text-ink" id="roles">
          {t("account.roles")}
        </h2>

        {hasPermission(admin.roles, "PERM_ROLE_ASSIGN") ? (
          /*
           * The signed-in id is the Keycloak subject, which is exactly what
           * this route is keyed by — so the two compare directly.
           */
          <RoleForm
            personId={person.id}
            roles={person.roles}
            self={person.id === admin.id}
          />
        ) : (
          <div className="panel flex flex-wrap gap-2 p-4">
            {person.roles.length ? (
              person.roles.map((role) => (
                <Badge key={role} tone={role === "ADMIN" ? "gold" : "active"}>
                  {t(`roleCodes.${role}`)}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted">{t("account.noRole")}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
