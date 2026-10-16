import { useMessages } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { AuditLogResponse } from "@/features/dashboard/api/contracts";
import { actorOf, AUDIT_ACTION_TONES, changedFieldsOf } from "@/features/dashboard/audit";
import {
  EmptyRow,
  EntityRow,
  RowList,
} from "@/features/dashboard/components/entity-row";
import { dateTimeOf, type DateWords } from "@/i18n/dates";

interface AuditRowsProps {
  readonly entries: readonly AuditLogResponse[];
  readonly empty: string;
}

/**
 * A row names the properties a write touched, not their values: a feed that
 * showed both would be a second copy of the table it describes. The values
 * are in the audit log itself.
 */
export function AuditRows({ entries, empty }: AuditRowsProps) {
  const messages = useMessages();
  const dates = messages.common.dates as DateWords;
  if (!entries.length) return <EmptyRow>{empty}</EmptyRow>;

  return (
    <RowList>
      {entries.map((entry) => {
        const fields = changedFieldsOf(entry);
        return (
          <EntityRow
            badges={<Badge tone={AUDIT_ACTION_TONES[entry.action]}>{entry.action}</Badge>}
            key={entry.id}
            subtitle={[actorOf(entry, messages.audit.words), fields.length ? fields.join(", ") : undefined]
              .filter(Boolean)
              .join(" · ")}
            title={entry.entityId ? `${entry.entityType} ${entry.entityId}` : entry.entityType}
            trailing={dateTimeOf(entry.createdAt, dates)}
          />
        );
      })}
    </RowList>
  );
}
