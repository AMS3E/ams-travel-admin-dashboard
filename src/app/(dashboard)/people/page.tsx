import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasPermission } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import {
  EmptyRow,
  EntityRow,
  RowList,
} from "@/features/dashboard/components/entity-row";
import { backOfficePeople, searchPeople, type Person } from "@/features/people/people.server";
import { PageHeader } from "@/features/shell/components/page-header";
import { CreateStaffLinks } from "@/features/people/components/create-staff-links";

export const metadata: Metadata = { title: "People" };

function roleBadges(person: Person) {
  if (!person.roles.length) {
    return <Badge tone="neutral">No back-office role</Badge>;
  }
  return person.roles.map((role) => (
    <Badge key={role} tone={role === "ADMIN" ? "gold" : "active"}>
      {role}
    </Badge>
  ));
}

export default async function PeoplePage(props: PageProps<"/people">) {
  const admin = await requireAdmin();
  /* The screen is hidden rather than refused: it does not exist for this role. */
  if (!hasPermission(admin.roles, "PERM_USER_MANAGE")) notFound();
  const mayCreate = hasPermission(admin.roles, "PERM_ROLE_ASSIGN");

  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const header = (
    <PageHeader
      actions={
        mayCreate ? <Link className={buttonVariants({ size: "sm" })} href="/people/new">
          <UserPlus aria-hidden className="size-4" />
          New account
        </Link> : null
      }
      description="Create team accounts and control which workspace each person can access."
      eyebrow="Administration"
      title="People"
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
          aria-label="Search accounts"
          defaultValue={query}
          name="q"
          placeholder="Search every account by name, username, or e-mail"
        />
        <Button type="submit" variant="secondary">
          <Search aria-hidden className="size-4" />
          Search
        </Button>
        {query ? (
          <Link className={buttonVariants({ variant: "ghost" })} href="/people">
            Clear
          </Link>
        ) : null}
      </form>

      {found === null ? (
        <div className="panel p-4 text-sm text-muted">
          <p className="font-semibold text-ink">
            The API could not reach Keycloak.
          </p>
          <p className="mt-2">
            Accounts live in Keycloak, and the API talks to it with the Keycloak
            Admin Client. Check that <code>KEYCLOAK_ADMIN_ENABLED</code> is true
            on the API, that its credentials are valid, and that Keycloak is
            running.
          </p>
        </div>
      ) : people.length ? (
        <RowList>
          {people.map((person) => (
            <EntityRow
              badges={roleBadges(person)}
              href={`/people/${person.id}`}
              key={person.id}
              subtitle={[person.username, person.email].filter(Boolean).join(" · ")}
              title={person.name}
              trailing={person.enabled ? undefined : "Disabled"}
            />
          ))}
        </RowList>
      ) : (
        <EmptyRow>
          {query
            ? "No account matches that search."
            : "Nobody holds a back-office role yet. Create the first account."}
        </EmptyRow>
      )}
    </div>
  );
}
