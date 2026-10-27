"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { ChevronRight, UserPen, UserPlus, type LucideIcon } from "lucide-react";
import { useGetUsersQuery } from "@/features/people/api/people-api";
import { useGetCurrentUserQuery } from "@/features/auth/api/auth-api";
import {
  BUSINESS_ROLES,
  hasPermission,
  primaryRole,
  type BusinessRole,
} from "@/features/auth/permissions";
import { CustomerDirectory } from "@/features/people/components/customer-directory";
import { byName, getResource } from "@/features/catalog/resources";
import type { ResourceKey } from "@/features/catalog/resource";
import { localizeWith } from "@/features/catalog/localize";
import { resourceIcon } from "@/features/shell/nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { ProfileAvatar } from "@/features/profile/components/avatar-picker";
import { cn } from "@/lib/utils";
import { QueryState } from "./query-state";

/**
 * Customers of the public site. The directory is the People feature's; this 
 * only decides whether the viewer may create, edit and delete — all
 * USER_MANAGE's, which the API enforces the same way.
 */
export function CustomersPage({ grants }: { readonly grants: readonly string[] }) {
  return <CustomerDirectory canManage={hasPermission(grants, "PERM_USER_MANAGE")} />;
}

/** Widest remit first, so the list reads top-down like the org does. */
const ROLE_ORDER: readonly BusinessRole[] = [
  "ADMIN",
  "EDITOR",
  "BDO",
  "CONTRIBUTOR",
  "PARTNER",
];
const isBusinessRole = (value: string): value is BusinessRole => (BUSINESS_ROLES as readonly string[]).includes(value);

/**
 * The back office, grouped by the role each person holds.
 *
 * Keycloak does not expand composites on a role mapping, so an administrator
 * appears under Administrator alone rather than under all five — see
 * `KeycloakUserServiceImpl.businessRolesOf`. Somebody granted two roles does
 * appear twice, which is the truth about them rather than a duplicate.
 */
export function RolesPage({ grants }: { readonly grants: readonly string[] }) {
  const t = useTranslations("cms.roles");
  const locale = useLocale();
  /* English keeps the role codes it always showed; other languages name the role. */
  const roleWord = (held: string) => (locale !== "en" && isBusinessRole(held) ? t(`labels.${held}`) : held);
  const query = useGetUsersQuery("");
  const people = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {query.isLoading ? t("loading") : t("summary", { count: people.length, roles: ROLE_ORDER.length })}
        </p>
        {hasPermission(grants, "PERM_ROLE_ASSIGN") ? (
          <Link className={buttonVariants({ size: "sm" })} href="/people/new">
            <UserPlus aria-hidden className="size-3.5" />
            {t("newAccount")}
          </Link>
        ) : null}
      </div>
      <QueryState error={query.error} loading={query.isLoading} retry={query.refetch} />
      {ROLE_ORDER.map((role) => {
        const members = people.filter((person) => person.roles.includes(role));
        return (
          <Surface className="scroll-mt-20" id={`role-${role.toLowerCase()}`} key={role}>
            <SurfaceHeader
              description={t(`access.${role}`)}
              title={
                <span className="flex items-center gap-2">
                  {t(`labels.${role}`)}
                  <Badge>{members.length}</Badge>
                </span>
              }
            />
            {members.length ? (
              <ul className="divide-y divide-line">
                {members.map((person) => {
                  const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username;
                  return (
                    <li key={person.id}>
                      <Link className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand" href={"/people/" + person.id}>
                        <ProfileAvatar
                          className={cn("size-8 text-xs", !person.enabled && "opacity-60 grayscale")}
                          name={name}
                          src={person.avatarUrl ?? ""}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{name}</span>
                          <span className="block truncate text-xs text-muted">{person.email || person.username}</span>
                        </span>
                        {person.roles.length > 1 ? (
                          <span className="hidden text-xs text-muted sm:inline">
                            {t("also", { roles: person.roles.filter((held) => held !== role).map(roleWord).join(", ") })}
                          </span>
                        ) : null}
                        {!person.enabled ? <Badge dot tone="danger">{t("disabled")}</Badge> : null}
                        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-muted">{t("nobody")}</p>
            )}
          </Surface>
        );
      })}
    </div>
  );
}

/**
 * The badge calendar: a season sets every badge's period. Neither table has a
 * sidebar entry, so Settings is where an administrator reaches them.
 */
const tables = [
  { key: "badge-definitions", tile: "bg-gold-soft text-gold-deep" },
  { key: "seasons", tile: "bg-success-soft text-success" },
] as const satisfies readonly { key: ResourceKey; tile: string }[];

function IconTile({ icon: Icon, className }: { readonly icon: LucideIcon; readonly className: string }) {
  return (
    <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-lg", className)}>
      <Icon className="size-4.5" />
    </span>
  );
}

export function SettingsPage() {
  const t = useTranslations("cms.settings");
  const roleWords = useTranslations("cms.roles");
  const messages = useMessages();
  /* Each table's name in the reader's language, A to Z in it. */
  const rows = useMemo(
    () =>
      tables
        .map((table) => ({ ...table, label: localizeWith(getResource(table.key), messages).labelPlural }))
        .sort((a, b) => byName(a.label, b.label)),
    [messages],
  );
  const me = useGetCurrentUserQuery();
  const role = me.data ? primaryRole(me.data.roles) : null;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Surface aria-labelledby="settings-catalogue" className="overflow-hidden">
        <SurfaceHeader description={t("catalogue.description")} id="settings-catalogue" title={t("catalogue.title")} />
        <ul className="divide-y divide-line">
          {rows.map(({ key, tile, label }) => (
            <li key={key}>
              <Link
                className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-sand focus-visible:bg-sand focus-visible:-outline-offset-2"
                href={"/" + key}
              >
                <IconTile className={tile} icon={resourceIcon(key)} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{label}</span>
                  <span className="block text-muted">{t(`catalogue.items.${key}`)}</span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink-soft"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Surface>

      <Surface aria-labelledby="settings-account" className="overflow-hidden">
        <SurfaceHeader description={t("account.description")} id="settings-account" title={t("account.title")} />
        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
          {me.data ? (
            <>
              <ProfileAvatar className="size-10 text-sm" name={me.data.name} src={me.data.avatarUrl ?? ""} />
              <span className="min-w-48 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate font-medium text-ink">{me.data.name}</span>
                  {role ? <Badge tone="info">{roleWords(`labels.${role}`)}</Badge> : null}
                </span>
                <span className="block truncate text-muted">{me.data.email || me.data.username}</span>
              </span>
            </>
          ) : (
            <span aria-hidden className="flex min-w-48 flex-1 items-center gap-3">
              <span className="size-10 shrink-0 rounded-full bg-sand-deep" />
              <span className="flex flex-1 flex-col gap-2">
                <span className="h-3.5 w-40 max-w-full rounded-sm bg-sand-deep" />
                <span className="h-3 w-56 max-w-full rounded-sm bg-sand-deep" />
              </span>
            </span>
          )}
          <Link className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "w-full sm:w-auto")} href="/profile">
            <UserPen aria-hidden className="size-3.5" />
            {t("account.edit")}
          </Link>
        </div>
      </Surface>
    </div>
  );
}
