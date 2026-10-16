import Image from "next/image";
import { useMessages, useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dateTimeOf } from "@/i18n/dates";
import type { DestinationVerificationResponse } from "../api/contracts";
import { evidenceHref, isPdfEvidence } from "../evidence";

interface VerificationHistoryProps {
  readonly history: readonly DestinationVerificationResponse[];
}

/**
 * Every verification decision on one destination, newest first, with the
 * evidence each was made on. Rows are never edited — a renewal or a
 * revocation is a new one — so this reads as the record of who decided what,
 * and why.
 */
export function VerificationHistory({ history }: VerificationHistoryProps) {
  const t = useTranslations("verification");
  const dates = useMessages().common.dates;
  return (
    <section className="panel overflow-hidden">
      <h2 className="border-b border-line p-4 font-semibold">{t("history.title")}</h2>

      {history.length ? (
        <ol className="divide-y divide-line">
          {history.map((entry) => {
            const evidence = evidenceHref(entry.evidenceKey);
            return (
              <li className="flex flex-wrap items-start gap-4 p-4" key={entry.id}>
                {evidence && isPdfEvidence(entry.evidenceKey) ? (
                  <a
                    className="grid size-20 shrink-0 place-items-center rounded-md border border-line bg-paper text-heritage hover:border-line-hover"
                    href={evidence}
                    rel="noreferrer"
                    target="_blank"
                    title={t("history.openPdf")}
                  >
                    <span className="flex flex-col items-center gap-1">
                      <FileText aria-hidden className="size-7" strokeWidth={1.5} />
                      <span className="text-2xs font-semibold">{t("evidence.kindPdf")}</span>
                    </span>
                  </a>
                ) : evidence ? (
                  <a
                    className="shrink-0"
                    href={evidence}
                    rel="noreferrer"
                    target="_blank"
                    title={t("history.openEvidence")}
                  >
                    <Image
                      alt={t("history.evidenceAlt", { date: dateTimeOf(entry.createdAt, dates) })}
                      className="size-20 rounded-md border border-line object-cover"
                      height={80}
                      src={evidence}
                      unoptimized
                      width={80}
                    />
                  </a>
                ) : (
                  <span className="grid size-20 shrink-0 place-items-center rounded-md border border-dashed border-line px-1 text-center text-2xs text-muted">
                    {t("history.noFile")}
                  </span>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={entry.verified ? "gold" : "inactive"}>
                      {entry.verified ? t("badge.verifiedBasis", { basis: t(`basis.${entry.basis ?? "PAID"}`) }) : t("badge.revoked")}
                    </Badge>
                    {entry.reference ? (
                      <span className="font-mono text-xs text-ink-soft">{entry.reference}</span>
                    ) : null}
                  </div>
                  {entry.note ? (
                    <p className="text-sm whitespace-pre-line text-ink-soft">{entry.note}</p>
                  ) : null}
                  <p className="text-xs text-muted">
                    {entry.decidedByName ?? t("history.deletedAccount")} · {dateTimeOf(entry.createdAt, dates)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="p-4 text-sm text-muted">{t("noDecision")}</p>
      )}
    </section>
  );
}
