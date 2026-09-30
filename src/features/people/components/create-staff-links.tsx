import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { STAFF_ROLES, WORKSPACE_ACCESS } from "@/features/people/workspace-roles";

export function CreateStaffLinks() {
  return (
    <section aria-labelledby="create-staff-title" className="panel overflow-hidden">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-md font-semibold text-ink" id="create-staff-title">Create a team account</h2>
        <p className="mt-0.5 text-xs text-muted">Choose a role. Their login opens the dashboard for that role.</p>
      </header>
      <ul className="grid sm:grid-cols-2 [&>li]:border-b [&>li]:border-line sm:[&>li:nth-child(odd)]:border-r">
        {STAFF_ROLES.map((role) => (
          <li key={role}>
            <Link className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand" href={`/people/new?role=${role}`}>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">Create {role}</span>
                <span className="block text-xs text-muted">{WORKSPACE_ACCESS[role]}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
