"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { Toolbar } from "@/components/ui/toolbar";
import type { AuditAction } from "@/features/dashboard/api/contracts";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_TONES,
  AUDIT_LIMITS,
  type AuditEntityOption,
  type AuditRow,
} from "@/features/dashboard/audit";
import { cn } from "@/lib/utils";

const ACTIONS: readonly AuditAction[] = ["CREATE", "UPDATE", "DELETE", "PURGE"];
/* Longer values (route lines, JSON) fold behind "Show all". */
const CLAMP = 140;

interface AuditLogProps {
  readonly rows: readonly AuditRow[];
  readonly typeOptions: readonly AuditEntityOption[];
  readonly entityType: string;
  readonly action: string;
  readonly limit: number;
  /** Set when the feed is narrowed to one person or one record from a row link. */
  readonly userLabel: string | null;
  readonly recordLabel: string | null;
}

/** Filters live in the URL, so a filtered view can be shared and reloaded. */
function useQueryLink() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (changes: Readonly<Record<string, string | null>>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
}

export function AuditLog({ rows, typeOptions, entityType, action, limit, userLabel, recordLabel }: AuditLogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const linkTo = useQueryLink();
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const filtered = Boolean(entityType || action || userLabel || recordLabel);

  function toggle(id: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <section className="panel min-w-0 overflow-hidden">
      <Toolbar>
        <Select
          aria-label="Filter by record type"
          className="h-8 w-48 text-sm"
          onChange={(event) => router.push(linkTo({ entityType: event.target.value || null }))}
          value={entityType}
        >
          <option value="">All records</option>
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filter by action"
          className="h-8 w-36 text-sm"
          onChange={(event) => router.push(linkTo({ action: event.target.value || null }))}
          value={action}
        >
          <option value="">All actions</option>
          {ACTIONS.map((value) => (
            <option key={value} value={value}>
              {AUDIT_ACTION_LABELS[value]}
            </option>
          ))}
        </Select>

        <Select
          aria-label="How many entries"
          className="h-8 w-32 text-sm"
          onChange={(event) => router.push(linkTo({ limit: event.target.value === "50" ? null : event.target.value }))}
          value={String(limit)}
        >
          {AUDIT_LIMITS.map((value) => (
            <option key={value} value={value}>
              Latest {value}
            </option>
          ))}
        </Select>

        {userLabel ? <FilterChip href={linkTo({ user: null })} label={`By ${userLabel}`} /> : null}
        {recordLabel ? <FilterChip href={linkTo({ record: null })} label={recordLabel} /> : null}

        <p aria-live="polite" className="ml-auto text-xs text-muted tabular-nums">
          {rows.length.toLocaleString()} {rows.length === 1 ? "entry" : "entries"}
        </p>
      </Toolbar>

      {rows.length ? (
        <Table>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              <TableHeaderCell className="w-20">Time</TableHeaderCell>
              <TableHeaderCell className="w-32">Action</TableHeaderCell>
              <TableHeaderCell>Record</TableHeaderCell>
              <TableHeaderCell>By</TableHeaderCell>
              <TableHeaderCell className="w-12">
                <span className="sr-only">Details</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              const expanded = open.has(row.id);
              const expandable = row.changes.length > 0 || row.entityId != null;
              const newDay = index === 0 || rows[index - 1].day !== row.day;
              return (
                <Fragment key={row.id}>
                  {newDay ? (
                    <tr className="bg-sand">
                      <th className="px-4 py-1.5 text-xs font-medium text-muted" colSpan={5} scope="colgroup">
                        {row.day}
                      </th>
                    </tr>
                  ) : null}

                  <TableRow
                    className={cn(expandable && "cursor-pointer", expanded && "bg-sand/60")}
                    onClick={(event) => {
                      /* Links and the toggle do their own thing. */
                      if (expandable && !(event.target as HTMLElement).closest("a, button")) toggle(row.id);
                    }}
                  >
                    <TableCell className="whitespace-nowrap text-muted tabular-nums" title={row.at}>
                      {row.time}
                    </TableCell>
                    <TableCell>
                      <Badge dot tone={AUDIT_ACTION_TONES[row.action]}>
                        {AUDIT_ACTION_LABELS[row.action]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-72">
                      <RecordName row={row} />
                      <span className="block truncate text-xs text-muted">{row.typeLabel}</span>
                    </TableCell>
                    <TableCell className="max-w-56">
                      {row.userId ? (
                        <Link
                          className="block truncate text-ink hover:text-teal-deep hover:underline"
                          href={linkTo({ user: row.userId })}
                          title={`Only changes by ${row.actor}`}
                        >
                          {row.actor}
                        </Link>
                      ) : (
                        <span className="block text-muted" title="An automatic change: seed data, route calculation or a scheduled job">
                          {row.actor}
                        </span>
                      )}
                      {row.actorEmail ? <span className="block truncate text-xs text-muted">{row.actorEmail}</span> : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {expandable ? (
                        <button
                          aria-expanded={expanded}
                          aria-label={expanded ? "Hide the changes" : "Show the changes"}
                          className="inline-grid size-7 place-items-center rounded-md text-muted hover:bg-sand-deep hover:text-ink"
                          onClick={() => toggle(row.id)}
                          type="button"
                        >
                          <ChevronDown
                            aria-hidden
                            className={cn("size-4 transition-transform", expanded && "rotate-180")}
                          />
                        </button>
                      ) : null}
                    </TableCell>
                  </TableRow>

                  {expanded ? (
                    <tr className="bg-sand/60">
                      <td className="px-4 pt-1 pb-4" colSpan={5}>
                        <AuditDetails linkTo={linkTo} row={row} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="px-4 py-10 text-center text-sm text-muted">
          <p>No changes match these filters.</p>
          {filtered ? (
            <Link className="mt-2 inline-block text-xs font-medium text-teal-deep hover:underline" href={pathname}>
              Clear filters
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}

function RecordName({ row }: { readonly row: AuditRow }) {
  const label = row.name ?? (row.entityId ? `#${row.entityId.slice(0, 8)}` : row.typeLabel);
  const className = cn("block truncate font-medium text-ink", !row.name && "font-mono text-xs");
  return row.href ? (
    <Link className={cn(className, "hover:text-teal-deep hover:underline")} href={row.href} title="Open this record">
      {label}
    </Link>
  ) : (
    <span className={className}>{label}</span>
  );
}

function FilterChip({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <Link
      aria-label={`Remove the filter: ${label}`}
      className="inline-flex h-8 max-w-64 items-center gap-1.5 rounded-md border border-line-strong bg-sand px-2.5 text-xs font-medium text-ink-soft hover:text-ink"
      href={href}
    >
      <span className="truncate">{label}</span>
      <X aria-hidden className="size-3.5 shrink-0" />
    </Link>
  );
}

function AuditDetails({
  row,
  linkTo,
}: {
  readonly row: AuditRow;
  readonly linkTo: (changes: Readonly<Record<string, string | null>>) => string;
}) {
  const showBefore = row.changes.some((change) => change.before !== undefined);
  const showAfter = row.changes.some((change) => change.after !== undefined);

  return (
    <div className="rounded-md border border-line bg-paper">
      {row.changes.length ? (
        <table className="w-full table-fixed text-left text-xs">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="w-48 px-3 py-2 font-medium">Field</th>
              {showBefore ? <th className="px-3 py-2 font-medium">Before</th> : null}
              {showAfter ? <th className="px-3 py-2 font-medium">After</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {row.changes.map((change) => (
              <tr className="align-top" key={change.field}>
                <th className="px-3 py-2 font-medium text-ink-soft" scope="row" title={change.field}>
                  {change.label}
                </th>
                {showBefore ? (
                  <td className="px-3 py-2 text-muted">
                    <AuditValue value={change.before} />
                  </td>
                ) : null}
                {showAfter ? (
                  <td className="px-3 py-2 text-ink">
                    <AuditValue value={change.after} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs text-muted",
          row.changes.length && "border-t border-line",
        )}
      >
        <span title={row.at}>{row.at}</span>
        {row.entityId ? (
          <>
            <span className="font-mono">{row.entityId}</span>
            <Link className="font-medium text-teal-deep hover:underline" href={linkTo({ record: row.entityId })}>
              All changes to this record
            </Link>
          </>
        ) : null}
        {row.ipAddress ? <span title={row.userAgent ?? undefined}>IP {row.ipAddress}</span> : null}
      </div>
    </div>
  );
}

function AuditValue({ value }: { readonly value: string | undefined }) {
  const [full, setFull] = useState(false);
  if (value === undefined) return <span>—</span>;
  const long = value.length > CLAMP;
  return (
    <span className="block font-mono break-all whitespace-pre-wrap">
      {long && !full ? `${value.slice(0, CLAMP)}…` : value}
      {long ? (
        <button
          className="ml-1.5 font-sans font-medium text-teal-deep hover:underline"
          onClick={() => setFull((shown) => !shown)}
          type="button"
        >
          {full ? "Show less" : "Show all"}
        </button>
      ) : null}
    </span>
  );
}
