"use client";
import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";
import { useGetUsersQuery } from "@/features/people/api/people-api";
import {
  hasPermission,
  type BusinessRole,
} from "@/features/auth/permissions";
import { CustomerDirectory } from "@/features/people/components/customer-directory";
import { WORKSPACE_ACCESS } from "@/features/people/workspace-roles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCompactTables } from "@/store/slices/ui-slice";
import { byName, getResource } from "@/features/catalog/resources";
import type { ResourceKey } from "@/features/catalog/resource";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { initials } from "@/features/auth/types";
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
const ROLE_LABELS: Readonly<Record<BusinessRole, string>> = {
  ADMIN: "Administrator",
  EDITOR: "Editor",
  BDO: "BDO",
  CONTRIBUTOR: "Contributor",
  PARTNER: "Partner",
};

/**
 * The back office, grouped by the role each person holds.
 *
 * Keycloak does not expand composites on a role mapping, so an administrator
 * appears under Administrator alone rather than under all five — see
 * `KeycloakUserServiceImpl.businessRolesOf`. Somebody granted two roles does
 * appear twice, which is the truth about them rather than a duplicate.
 */
export function RolesPage({ grants }: { readonly grants: readonly string[] }) {
  const query = useGetUsersQuery("");
  const people = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {query.isLoading ? "Loading team members…" : `${people.length} team ${people.length === 1 ? "member" : "members"} across ${ROLE_ORDER.length} roles`}
        </p>
        {hasPermission(grants, "PERM_ROLE_ASSIGN") ? (
          <Link className={buttonVariants({ size: "sm" })} href="/people/new">
            <UserPlus aria-hidden className="size-3.5" />
            New account
          </Link>
        ) : null}
      </div>
      <QueryState error={query.error} loading={query.isLoading} retry={query.refetch} />
      {ROLE_ORDER.map((role) => {
        const members = people.filter((person) => person.roles.includes(role));
        return (
          <Surface className="scroll-mt-20" id={`role-${role.toLowerCase()}`} key={role}>
            <SurfaceHeader
              description={WORKSPACE_ACCESS[role]}
              title={
                <span className="flex items-center gap-2">
                  {ROLE_LABELS[role]}
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
                        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-sand-deep text-xs font-semibold text-ink-soft">
                          {initials(name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{name}</span>
                          <span className="block truncate text-xs text-muted">{person.email || person.username}</span>
                        </span>
                        {person.roles.length > 1 ? (
                          <span className="hidden text-xs text-muted sm:inline">
                            Also {person.roles.filter((held) => held !== role).join(", ")}
                          </span>
                        ) : null}
                        {!person.enabled ? <Badge dot tone="danger">Disabled</Badge> : null}
                        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-muted">Nobody holds this role yet.</p>
            )}
          </Surface>
        );
      })}
    </div>
  );
}

/**
 * The tables no sidebar lists: supporting rows an administrator still manages.
 * The last three are the gamification calendar — seasons set every badge's
 * periods, so they sit beside the badges they drive.
 */
const advanced: ResourceKey[] = [
  "stay-media",
  "stay-rooms",
  "food-media",
  "food-menu-items",
  "badge-definitions",
  "badge-periods",
  "seasons",
];
export function SettingsPage() {
  const dispatch = useAppDispatch();
  const compact = useAppSelector((state) => state.ui.compactTables);
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Surface>
        <SurfaceHeader description="Preferences apply to this browser session." title="Workspace preferences" />
        <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-ink">Compact tables</span>
            <span className="block text-xs text-muted">Fit more catalogue rows on your screen.</span>
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
          description="Stay and food photography, badges, the periods they are earned in, and the seasons that set those periods."
          title="Catalogue configuration"
        />
        <ul className="divide-y divide-line">
          {[...advanced].sort((a, b) => byName(getResource(a).labelPlural, getResource(b).labelPlural)).map((key) => (
            <li key={key}>
              <Link className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand" href={"/" + key}>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{getResource(key).labelPlural}</span>
                  <span className="block truncate text-xs text-muted">{getResource(key).description}</span>
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
              Edit profile
            </Link>
          }
          className="border-b-0"
          description="Update your name, contact details, and profile image."
          title="Account"
        />
      </Surface>
    </div>
  );
}
