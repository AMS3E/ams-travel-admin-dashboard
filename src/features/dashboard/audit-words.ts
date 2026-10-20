import type auditMessages from "@locales/en/audit.json";
import type commonMessages from "@locales/en/common.json";
import type { AuditAction } from "@/features/dashboard/api/contracts";
import { auditTypeLabel, fieldLabel, type AuditWords } from "@/features/dashboard/audit";

type AuditMessages = typeof auditMessages;
interface Messages {
  readonly audit: AuditMessages;
  readonly common: typeof commonMessages;
}

/** The Intl locale dates and numbers are written in: British English as before, Khmer as Cambodia writes it. */
export function intlLocaleOf(locale: string): string {
  return locale === "km" ? "km-KH" : "en-GB";
}

/**
 * A row's words from the audit messages. Record and field names come from
 * the message file, so a type or field it does not name yet keeps its
 * English name rather than showing a key.
 */
export function auditWordsOf({ audit: messages, common }: Messages, locale: string, removed: (count: number) => string): AuditWords {
  const records = messages.records as Readonly<Record<string, { readonly one: string } | undefined>>;
  const fields = messages.fields as Readonly<Record<string, string | undefined>>;
  return {
    locale: intlLocaleOf(locale),
    dates: common.dates,
    today: messages.words.today,
    yesterday: messages.words.yesterday,
    system: messages.words.system,
    deletedAccount: messages.words.deletedAccount,
    newRecord: messages.words.newRecord,
    recordRemoved: messages.words.recordRemoved,
    noFieldChanges: messages.words.noFieldChanges,
    allRemoved: messages.words.allRemoved,
    removed,
    action: (action: AuditAction) => messages.actions[action],
    typeLabel: (entityType) => records[entityType]?.one ?? auditTypeLabel(entityType),
    fieldLabel: (field) => fields[field] ?? fieldLabel(field),
  };
}

/** A record type's plural name, for the Record type filter. */
export function auditTypePlural(messages: AuditMessages, entityType: string, fallback: string): string {
  const records = messages.records as Readonly<Record<string, { readonly other: string } | undefined>>;
  return records[entityType]?.other ?? fallback;
}
