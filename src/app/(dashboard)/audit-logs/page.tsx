import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasPermission } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { getAuditEntries } from "@/features/dashboard/api/dashboard.server";
import type { AuditAction } from "@/features/dashboard/api/contracts";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AUDIT_FETCH_LIMIT,
  peopleOf,
  type AuditServerFilters,
} from "@/features/dashboard/audit";
import { AuditLog } from "@/features/dashboard/components/audit-log";
import { ClearAuditLog } from "@/features/dashboard/components/clear-audit-log";
import { PageHeader } from "@/features/shell/components/page-header";
import { isUuid } from "@/lib/ids";

export const metadata: Metadata = { title: "Audit Logs" };

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AuditLogsPage(props: PageProps<"/audit-logs">) {
  const admin = await requireAdmin();
  /* Hidden rather than refused — the endpoint behind it answers 403 anyway. */
  if (!hasPermission(admin.roles, "PERM_AUDIT_VIEW")) notFound();

  const params = await props.searchParams;
  const entityType = one(params.entityType);
  const action = one(params.action);
  const filters: AuditServerFilters = {
    entityType: AUDIT_ENTITY_TYPES.some((option) => option.value === entityType) ? entityType : "",
    action: (AUDIT_ACTIONS as readonly string[]).includes(action) ? (action as AuditAction) : "",
    /* The API filters by ids; anything else would only come back empty. */
    userId: isUuid(one(params.user)) ? one(params.user).toLowerCase() : "",
    entityId: isUuid(one(params.record)) ? one(params.record).toLowerCase() : "",
  };

  /* Always the API's maximum: it has no paging, so the page pages and searches these. */
  const entries = await getAuditEntries({ ...filters, limit: AUDIT_FETCH_LIMIT });
  /* The By list names everyone, not only the person already chosen. */
  const everyone = filters.userId ? await getAuditEntries({ ...filters, userId: "", limit: AUDIT_FETCH_LIMIT }) : entries;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={hasPermission(admin.roles, "PERM_FULL_CONTROL") ? <ClearAuditLog /> : null}
        description="Every change to the catalogue: what changed, who made it, and when."
        eyebrow="Administration"
        title="Audit Logs"
      />

      <AuditLog
        entries={entries}
        filters={filters}
        now={new Date().toISOString()}
        people={peopleOf([...(everyone ?? []), ...(entries ?? [])])}
        typeOptions={AUDIT_ENTITY_TYPES}
      />
    </div>
  );
}
