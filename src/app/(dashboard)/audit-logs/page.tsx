import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { hasPermission } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { getAuditEntries } from "@/features/dashboard/api/dashboard.server";
import type { AuditAction } from "@/features/dashboard/api/contracts";
import {
  actorOf,
  auditValueText,
  AUDIT_ACTION_TONES,
  AUDIT_ENTITY_TYPES,
  AUDIT_LIMITS,
  fieldChangesOf,
} from "@/features/dashboard/audit";
import { ClearAuditLog } from "@/features/dashboard/components/clear-audit-log";
import { EmptyRow } from "@/features/dashboard/components/entity-row";
import { formatDateTime } from "@/features/dashboard/format";
import { PageHeader } from "@/features/shell/components/page-header";
import { isUuid } from "@/lib/ids";

export const metadata: Metadata = { title: "Audit Logs" };

const ACTIONS: readonly AuditAction[] = ["CREATE", "UPDATE", "DELETE", "PURGE"];

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
  const userInput = one(params.user);
  /* The API filters by the `users` id; anything else would only come back empty. */
  const userId = isUuid(userInput) ? userInput : "";
  const requested = Number(one(params.limit));
  const limit = AUDIT_LIMITS.includes(requested as (typeof AUDIT_LIMITS)[number])
    ? requested
    : 50;

  const entries = await getAuditEntries({
    entityType,
    action,
    userId,
    limit,
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          hasPermission(admin.roles, "PERM_FULL_CONTROL") ? <ClearAuditLog /> : null
        }
        description="Who changed what, and when. Every catalogue write is recorded by one listener, so nothing has to remember to log itself. No entry can be amended, and none can be removed on its own — clearing the log is all-or-nothing and leaves a record that it happened."
        eyebrow="Administration"
        title="Audit Logs"
      />

      <form
        action="/audit-logs"
        className="panel flex flex-wrap items-end gap-3 px-3 py-3"
      >
        <label className="flex w-full flex-col gap-1 text-xs font-medium text-muted sm:w-48">
          Table
          <Select className="h-8 text-sm" defaultValue={entityType} name="entityType">
            <option value="">Everything</option>
            {AUDIT_ENTITY_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex w-full flex-col gap-1 text-xs font-medium text-muted sm:w-36">
          Action
          <Select className="h-8 text-sm" defaultValue={action} name="action">
            <option value="">Any</option>
            {ACTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium text-muted">
          User id
          <Input
            aria-invalid={userInput && !userId ? true : undefined}
            className="h-8 font-mono text-sm"
            defaultValue={userInput}
            name="user"
            placeholder="The account's id, e.g. 3f2c…"
            spellCheck={false}
          />
          {userInput && !userId ? (
            <small className="text-2xs font-medium text-heritage">
              That is not a user id, so the log is shown for everyone.
            </small>
          ) : null}
        </label>

        <label className="flex w-full flex-col gap-1 text-xs font-medium text-muted sm:w-24">
          Rows
          <Select className="h-8 text-sm" defaultValue={String(limit)} name="limit">
            {AUDIT_LIMITS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>

        <Button size="sm" type="submit" variant="secondary">
          <Filter aria-hidden className="size-3.5" />
          Apply filters
        </Button>
      </form>

      {entries.length ? (
        <div className="panel overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>When</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
                <TableHeaderCell>Row</TableHeaderCell>
                <TableHeaderCell>Actor</TableHeaderCell>
                <TableHeaderCell>Changed</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => {
                const changes = fieldChangesOf(entry);
                /* A CREATE has nothing before it and a DELETE nothing after; only an UPDATE needs both columns. */
                const hasBefore = entry.oldData != null;
                const hasAfter = entry.newData != null;
                const actor = actorOf(entry);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-muted">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge dot tone={AUDIT_ACTION_TONES[entry.action]}>{entry.action.charAt(0) + entry.action.slice(1).toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-ink">
                      {/* A purge names no row, so an id would read as a bug. */}
                      {entry.action === "PURGE" ? (
                        "The log itself"
                      ) : (
                        <>
                          {entry.entityType}
                          {entry.entityId ? (
                            <span className="mt-0.5 block font-mono text-2xs font-normal text-muted">
                              {entry.entityId}
                            </span>
                          ) : null}
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-muted">
                      {actor}
                      {/* The e-mail tells two people with one name apart; not repeated when it is the name. */}
                      {entry.userEmail && entry.userEmail !== actor ? (
                        <span className="mt-0.5 block text-2xs">{entry.userEmail}</span>
                      ) : null}
                      {entry.ipAddress ? (
                        <span className="mt-0.5 block text-2xs" title={entry.userAgent ?? undefined}>
                          {entry.ipAddress}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted">
                      {changes.length ? (
                        <details>
                          <summary className="cursor-pointer select-none">
                            {changes.map((change) => change.field).join(", ")}
                          </summary>
                          <table className="mt-2 w-full text-left text-2xs">
                            <thead>
                              <tr className="text-ink-soft">
                                <th className="py-1 pr-3 font-semibold">Field</th>
                                {hasBefore ? <th className="py-1 pr-3 font-semibold">Before</th> : null}
                                {hasAfter ? <th className="py-1 font-semibold">After</th> : null}
                              </tr>
                            </thead>
                            <tbody className="font-mono">
                              {changes.map((change) => (
                                <tr className="border-t border-line align-top" key={change.field}>
                                  <th className="py-1 pr-3 font-sans font-semibold text-ink-soft" scope="row">
                                    {change.field}
                                  </th>
                                  {hasBefore ? (
                                    <td className="py-1 pr-3 break-all whitespace-pre-wrap">
                                      {auditValueText(change.before)}
                                    </td>
                                  ) : null}
                                  {hasAfter ? (
                                    <td className="py-1 break-all whitespace-pre-wrap text-ink">
                                      {auditValueText(change.after)}
                                    </td>
                                  ) : null}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyRow>
          Nothing matches these filters. Auditing can also be switched off on
          the API.
        </EmptyRow>
      )}
    </div>
  );
}
