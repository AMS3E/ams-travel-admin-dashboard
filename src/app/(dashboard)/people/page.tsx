import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasPermission, type BusinessRole } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import {
  EmptyRow,
  EntityRow,
  RowList,
} from "@/features/dashboard/components/entity-row";
import { backOfficePeople, searchPeople, type Person } from "@/features/people/people.server";
import { PageHeader } from "@/features/shell/components/page-header";
import { CreateStaffLinks } from "@/features/people/components/create-staff-links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people.list");
  return { title: t("title") };
}

/** The roles as badges; `labels` names each role and says when there is none. */
function roleBadges(person: Person, labels: { readonly role: (role: BusinessRole) => string; readonly none: string }) {
  if (!person.roles.length) {
    return <Badge tone="neutral">{labels.none}</Badge>;
  }
  return person.roles.map((role) => (
    <Badge key={role} tone={role === "ADMIN" ? "gold" : "active"}>
      {labels.role(role)}
    </Badge>
  ));
}

export default async function PeoplePage(props: PageProps<"/people">) {
  const admin = await requireAdmin();
  /* The screen is hidden rather than refused: it does not exist for this role. */
  if (!hasPermission(admin.roles, "PERM_USER_MANAGE")) notFound();
  const mayCreate = hasPermission(admin.roles, "PERM_ROLE_ASSIGN");
  const t = await getTranslations("people");
  const roleLabels = { role: (role: BusinessRole) => t(`roleCodes.${role}`), none: t("list.noRole") };

  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const header = (
    <PageHeader
      actions={
        mayCreate ? <Link className={buttonVariants({ size: "sm" })} href="/people/new">
          <UserPlus aria-hidden className="size-4" />
          {t("list.newAccount")}
        </Link> : null
      }
      description={t("list.description")}
      eyebrow={t("list.eyebrow")}
      title={t("list.title")}
    />
  );

  /*
   * The API answers null when Keycloak administration is switched off or
   * Keycloak is unreachable — a different screen from "nobody holds a role
   * yet", so the two are not collapsed together.
   */
  const found = query ? await searchPeople(query) : await backOfficePeople();
  const people: readonly Person[] = found ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      {header}

      {mayCreate ? <CreateStaffLinks /> : null}

      <form action="/people" className="flex gap-2">
        <Input
          aria-label={t("list.searchLabel")}
          defaultValue={query}
          name="q"
          placeholder={t("list.searchPlaceholder")}
        />
        <Button type="submit" variant="secondary">
          <Search aria-hidden className="size-4" />
          {t("list.search")}
        </Button>
        {query ? (
          <Link className={buttonVariants({ variant: "ghost" })} href="/people">
            {t("list.clear")}
          </Link>
        ) : null}
      </form>

      {found === null ? (
        <div className="panel p-4 text-sm text-muted">
          <p className="font-semibold text-ink">{t("list.unreachableTitle")}</p>
          <p className="mt-2">
            {t.rich("list.unreachable", { code: (chunks) => <code>{chunks}</code> })}
          </p>
        </div>
      ) : people.length ? (
        <RowList>
          {people.map((person) => (
            <EntityRow
              badges={roleBadges(person, roleLabels)}
              href={`/people/${person.id}`}
              key={person.id}
              subtitle={[person.username, person.email].filter(Boolean).join(" · ")}
              title={person.name}
              trailing={person.enabled ? undefined : t("status.disabled")}
            />
          ))}
        </RowList>
      ) : (
        <EmptyRow>
          {query ? t("list.noMatch") : t("list.empty")}
        </EmptyRow>
      )}
    </div>
  );
}
