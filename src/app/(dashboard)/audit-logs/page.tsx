import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasPermission } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { getAuditEntries } from "@/features/dashboard/api/dashboard.server";
import { AUDIT_ENTITY_TYPES, AUDIT_LIMITS, actorOf, auditRowsOf } from "@/features/dashboard/audit";
import { AuditLog } from "@/features/dashboard/components/audit-log";
import { ClearAuditLog } from "@/features/dashboard/components/clear-audit-log";
import { PageHeader } from "@/features/shell/components/page-header";
import { isUuid } from "@/lib/ids";

export const metadata: Metadata = { title: "Audit Logs" };

const ACTIONS = new Set(["CREATE", "UPDATE", "DELETE", "PURGE"]);

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AuditLogsPage(props: PageProps<"/audit-logs">) {
  const admin = await requireAdmin();
  /* Hidden rather than refused — the endpoint behind it answers 403 anyway. */
  if (!hasPermission(admin.roles, "PERM_AUDIT_VIEW")) notFound();

  const params = await props.searchParams;
  const entityType = AUDIT_ENTITY_TYPES.some((option) => option.value === one(params.entityType)) ? one(params.entityType) : "";
  const action = ACTIONS.has(one(params.action)) ? one(params.action) : "";
  /* The API filters by ids; anything else would only come back empty. */
  const userId = isUuid(one(params.user)) ? one(params.user) : "";
  const entityId = isUuid(one(params.record)) ? one(params.record) : "";
  const requested = Number(one(params.limit));
  const limit = AUDIT_LIMITS.includes(requested as (typeof AUDIT_LIMITS)[number]) ? requested : 50;

  const entries = await getAuditEntries({ entityType, entityId, action, userId, limit });
  const rows = auditRowsOf(entries);
  const record = rows.find((row) => row.name);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={hasPermission(admin.roles, "PERM_FULL_CONTROL") ? <ClearAuditLog /> : null}
        description="Every change to the catalogue: what changed, who changed it, and when. Entries cannot be edited."
        eyebrow="Administration"
        title="Audit Logs"
      />

      <AuditLog
        action={action}
        entityType={entityType}
        limit={limit}
        recordLabel={entityId ? (record?.name ?? `Record #${entityId.slice(0, 8)}`) : null}
        rows={rows}
        typeOptions={AUDIT_ENTITY_TYPES}
        userLabel={userId ? (entries[0] ? actorOf(entries[0]) : "this account") : null}
      />
    </div>
  );
}
