"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Circle, Loader2, PencilLine, TriangleAlert, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import { useDates } from "@/i18n/use-dates";
import {
  REQUEST_TONES,
  type PublishRequestResponse,
} from "@/features/publishing/api/contracts";
import { useDecidePublishRequestMutation, type PublishDecision } from "@/features/publishing/api/publishing-api";
import { NOTE_REQUIRED } from "@/features/publishing/components/decision-form";
import type { CheckedLine } from "@/features/publishing/review";
import { useApiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

/** The `publishing.decision.done` key each answer is reported with. */
const DONE_WORDS: Readonly<Record<PublishDecision, "approve" | "requestChanges" | "reject">> = {
  approve: "approve",
  "request-changes": "requestChanges",
  reject: "reject",
};

/**
 * Beside the listing: who sent it and when, what the form's checklist makes
 * of it, and — for the desk that answers it — the decision itself. Approving
 * publishes it in the same step; sending it back or rejecting it needs a note,
 * because an author sent away with nothing to act on cannot act.
 */
export function ReviewDecision({ request, canDecide, own = false, lines, editHref, backHref, backLabel }: {
  readonly request: PublishRequestResponse;
  readonly canDecide: boolean;
  /** The viewer's own submission: an editor or a BDO publishes it themselves, and answers to nobody for it. */
  readonly own?: boolean;
  readonly lines: readonly CheckedLine[];
  /** The listing's form, for a reviewer who may correct something small first. */
  readonly editHref: string | null;
  readonly backHref: string;
  readonly backLabel: string;
}) {
  const t = useTranslations("publishing.decision");
  const labels = useTranslations("publishing");
  const errorMessage = useApiErrorMessage();
  const { relative, dateTime } = useDates();
  const router = useRouter();
  const [decideRequest] = useDecidePublishRequestMutation();
  const [saving, startSaving] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState<PublishDecision | null>(null);
  const author = request.requestedByName ?? t("theAuthor");
  const done = lines.filter((line) => line.done).length;
  const requiredMissing = lines.filter((line) => line.required && !line.done).length;
  const editing = canDecide && request.status === "PENDING_REVIEW" && !decided;

  function decide(decision: PublishDecision) {
    setError(null);
    const missingNote = NOTE_REQUIRED[decision];
    if (missingNote && !note.trim()) {
      setError(t(`noteRequired.${missingNote}`));
      return;
    }
    startSaving(async () => {
      try {
        await decideRequest({ id: request.id, decision, decisionNote: note }).unwrap();
        setDecided(decision);
        setNote("");
        router.refresh();
      } catch (failure) {
        setError(errorMessage(failure));
      }
    });
  }

  return (
    <Surface aria-labelledby="review-decision">
      <SurfaceHeader
        actions={<Badge dot tone={REQUEST_TONES[request.status]}>{labels(`status.${request.status}`)}</Badge>}
        id="review-decision"
        title={t("title")}
      />

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 px-4 py-3 text-sm">
        <dt className="text-muted">{t("from")}</dt>
        <dd className="truncate text-ink">{author}</dd>
        <dt className="text-muted">{t("what")}</dt>
        <dd className="text-ink">{labels(`desk.${request.desk}`)}</dd>
        <dt className="text-muted">{t("sent")}</dt>
        <dd className="text-ink" title={dateTime(request.requestedAt)}>{relative(request.requestedAt)}</dd>
        {request.reviewedAt ? (
          <>
            <dt className="text-muted">{t("answered")}</dt>
            <dd className="text-ink" title={dateTime(request.reviewedAt)}>
              {request.reviewerName ?? t("aReviewer")} · {relative(request.reviewedAt)}
            </dd>
          </>
        ) : null}
      </dl>

      {request.reviewNote ? (
        <p className="mx-4 mb-3 rounded-md bg-sand px-3 py-2 text-sm text-ink-soft">
          <span className="font-medium text-ink">{request.status === "PENDING_REVIEW" ? t("earlierFeedback") : t("note")}: </span>
          {request.reviewNote}
        </p>
      ) : null}

      <section aria-labelledby="review-checklist" className="border-t border-line px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="text-xs font-semibold text-ink-soft" id="review-checklist">{t("checklist")}</h3>
          <span className="text-xs text-muted tabular-nums">{t("checklistCount", { done, total: lines.length })}</span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {lines.map((line) => (
            <li className="flex items-start gap-2 text-sm" key={line.label}>
              {line.done ? (
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
              ) : line.required ? (
                <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-heritage" />
              ) : (
                <Circle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted" />
              )}
              <span className={cn(line.done ? "text-ink" : line.required ? "font-medium text-heritage" : "text-muted")}>
                {line.label}
                {!line.done && line.required ? ` — ${t("required")}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {decided ? (
        <div className="flex flex-col gap-2 border-t border-line px-4 py-3" role="status">
          <p className={cn("flex gap-2 text-sm", decided === "approve" ? "text-success" : "text-ink-soft")}>
            {decided === "approve" ? <Check aria-hidden className="mt-0.5 size-4 shrink-0" /> : <Undo2 aria-hidden className="mt-0.5 size-4 shrink-0" />}
            {t(`done.${DONE_WORDS[decided]}`, { name: request.targetName, author })}
          </p>
          <Link className="inline-flex items-center gap-1 text-sm font-medium text-teal-deep hover:underline" href={backHref}>
            <ArrowLeft aria-hidden className="size-3.5" />
            {t("backTo", { label: backLabel })}
          </Link>
        </div>
      ) : canDecide && request.status === "PENDING_REVIEW" ? (
        <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
          {own ? (
            <p className="text-xs text-muted">
              {t("own")}
            </p>
          ) : null}
          {own ? null : <label className="text-xs font-semibold text-ink-soft" htmlFor="decision-note">{t("noteTo", { author })}</label>}
          {own ? null : (
            <Textarea
              id="decision-note"
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePrompt")}
              rows={3}
              value={note}
            />
          )}
          {requiredMissing ? (
            <p className="text-xs text-heritage">
              {t("requiredMissing", { count: requiredMissing })}
            </p>
          ) : null}
          <Button className="w-full" disabled={saving} onClick={() => decide("approve")} type="button">
            {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
            {t("approveAndPublish")}
          </Button>
          <div className={cn("grid grid-cols-2 gap-2", own && "hidden")}>
            <Button disabled={saving} onClick={() => decide("request-changes")} size="sm" type="button" variant="secondary">
              <Undo2 aria-hidden className="size-3.5" />
              {t("requestChanges")}
            </Button>
            <Button disabled={saving} onClick={() => decide("reject")} size="sm" type="button" variant="secondary">
              <X aria-hidden className="size-3.5" />
              {t("reject")}
            </Button>
          </div>
          {error ? <p className="text-xs font-medium text-heritage" role="alert">{error}</p> : null}
        </div>
      ) : null}

      {editHref ? (
        <p className="border-t border-line px-4 py-3 text-xs text-muted">
          {editing ? `${t("editPrompt")} ` : ""}
          <Link className="inline-flex items-center gap-1 font-medium text-teal-deep hover:underline" href={editHref}>
            <PencilLine aria-hidden className="size-3" />
            {editing ? t("editBeforeApproving") : t("openInEditor")}
          </Link>
        </p>
      ) : null}
    </Surface>
  );
}
