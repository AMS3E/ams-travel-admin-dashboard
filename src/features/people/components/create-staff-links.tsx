import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { STAFF_ROLES } from "@/features/people/workspace-roles";

export function CreateStaffLinks() {
  const t = useTranslations("people");
  return (
    <section aria-labelledby="create-staff-title" className="panel overflow-hidden">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-md font-semibold text-ink" id="create-staff-title">{t("createStaff.title")}</h2>
        <p className="mt-0.5 text-xs text-muted">{t("createStaff.description")}</p>
      </header>
      <ul className="grid sm:grid-cols-2 [&>li]:border-b [&>li]:border-line sm:[&>li:nth-child(odd)]:border-r">
        {STAFF_ROLES.map((role) => (
          <li key={role}>
            <Link className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand" href={`/people/new?role=${role}`}>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{t("createStaff.create", { role: t(`roleCodes.${role}`) })}</span>
                <span className="block text-xs text-muted">{t(`workspaceAccess.${role}`)}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
