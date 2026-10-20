"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { ChevronRight, UserPlus } from "lucide-react";
import { useGetUsersQuery } from "@/features/people/api/people-api";
import {
  BUSINESS_ROLES,
  hasPermission,
  type BusinessRole,
} from "@/features/auth/permissions";
import { CustomerDirectory } from "@/features/people/components/customer-directory";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCompactTables } from "@/store/slices/ui-slice";
import { byName, getResource } from "@/features/catalog/resources";
import type { ResourceKey } from "@/features/catalog/resource";
import { localizeWith } from "@/features/catalog/localize";
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
 * The tables no sidebar lists: supporting rows an administrator still manages.
 * The last two are the gamification calendar — a season sets every badge's
 * period, so it sits beside the badges it drives.
 */
const advanced: ResourceKey[] = [
  "stay-media",
  "stay-rooms",
  "food-media",
  "food-menu-items",
  "corridor-media",
  "badge-definitions",
  "seasons",
];
export function SettingsPage() {
  const t = useTranslations("cms.settings");
  const messages = useMessages();
  /* Each table's name and line in the reader's language, A to Z in it. */
  const tables = useMemo(
    () =>
      advanced
        .map((key) => ({ key, definition: localizeWith(getResource(key), messages) }))
        .sort((a, b) => byName(a.definition.labelPlural, b.definition.labelPlural)),
    [messages],
  );
  const dispatch = useAppDispatch();
  const compact = useAppSelector((state) => state.ui.compactTables);
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Surface>
        <SurfaceHeader description={t("preferences.description")} title={t("preferences.title")} />
        <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-ink">{t("preferences.compact")}</span>
            <span className="block text-xs text-muted">{t("preferences.compactHint")}</span>
          </span>
          <span className="relative inline-flex shrink-0">
            <input
              checked={compact}
              className="peer sr-only"
              onChange={(event) => dispatch(setCompactTables(event.target.checked))}
              role="switch"
              type="checkbox"
            />
            <span aria-hidden className="h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-teal peer-focus-visible:ring-3 peer-focus-visible:ring-teal/25" />
            <span aria-hidden className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform peer-checked:translate-x-4" />
          </span>
        </label>
      </Surface>

      <Surface>
        <SurfaceHeader
          description={t("catalogue.description")}
          title={t("catalogue.title")}
        />
        <ul className="divide-y divide-line">
          {tables.map(({ key, definition }) => (
            <li key={key}>
              <Link className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand" href={"/" + key}>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{definition.labelPlural}</span>
                  <span className="block truncate text-xs text-muted">{definition.description}</span>
                </span>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Surface>

      <Surface>
        <SurfaceHeader
          actions={
            <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href="/profile">
              {t("account.edit")}
            </Link>
          }
          className="border-b-0"
          description={t("account.description")}
          title={t("account.title")}
        />
      </Surface>
    </div>
  );
}
