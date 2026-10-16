import { useMessages, useTranslations } from "next-intl";
import { FileClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AuditLogResponse } from "@/features/dashboard/api/contracts";
import { actorOf, AUDIT_ACTION_TONES } from "@/features/dashboard/audit";
import { dateTimeOf, type DateWords } from "@/i18n/dates";

/** The audit feed in the board's row style: glyph, what and who, when, action. */
export function ActivityRows({
  entries,
}: {
  readonly entries: readonly AuditLogResponse[];
}) {
  const t = useTranslations("stats.activity");
  const messages = useMessages();
  if (!entries.length) {
    return (
      <p className="inset-row px-3 py-6 text-center text-sm text-muted">
        {t("empty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <li
          className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3 last:border-b-0 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_auto]"
          key={entry.id}
        >
          <span className="grid size-9 place-items-center rounded-sm bg-shell text-ink">
            <FileClock aria-hidden className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-ink">
              {entry.entityType}
            </span>
            <span className="truncate text-2xs text-muted">
              {actorOf(entry, messages.audit.words)}
            </span>
          </span>
          <span className="hidden text-2xs text-muted tabular-nums sm:block">
            {dateTimeOf(entry.createdAt, messages.common.dates as DateWords)}
          </span>
          <Badge tone={AUDIT_ACTION_TONES[entry.action]}>{entry.action}</Badge>
        </li>
      ))}
    </ul>
  );
}
