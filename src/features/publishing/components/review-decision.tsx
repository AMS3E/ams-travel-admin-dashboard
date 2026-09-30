"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Circle, Loader2, PencilLine, TriangleAlert, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatRelative } from "@/features/dashboard/format";
import {
  DESK_LABELS,
  REQUEST_LABELS,
  REQUEST_TONES,
  type PublishRequestResponse,
} from "@/features/publishing/api/contracts";
import { useDecidePublishRequestMutation, type PublishDecision } from "@/features/publishing/api/publishing-api";
import { NOTE_REQUIRED } from "@/features/publishing/components/decision-form";
import type { CheckedLine } from "@/features/publishing/review";
import { apiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

const DONE_WORDS: Readonly<Record<PublishDecision, (name: string, author: string) => string>> = {
  approve: (name) => `Approved. ${name} is live on the website.`,
  "request-changes": (_, author) => `Sent back. ${author} has your note and can send it again.`,
  reject: (_, author) => `Rejected. ${author} has your reason.`,
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
  const router = useRouter();
  const [decideRequest] = useDecidePublishRequestMutation();
  const [saving, startSaving] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState<PublishDecision | null>(null);
  const author = request.requestedByName ?? "The author";
  const done = lines.filter((line) => line.done).length;
  const requiredMissing = lines.filter((line) => line.required && !line.done).length;

  function decide(decision: PublishDecision) {
    setError(null);
    const missingNote = NOTE_REQUIRED[decision];
    if (missingNote && !note.trim()) {
      setError(missingNote);
      return;
    }
    startSaving(async () => {
      try {
        await decideRequest({ id: request.id, decision, decisionNote: note }).unwrap();
        setDecided(decision);
        setNote("");
        router.refresh();
      } catch (failure) {
        setError(apiErrorMessage(failure));
      }
    });
  }

  return (
    <Surface aria-labelledby="review-decision">
      <SurfaceHeader
        actions={<Badge dot tone={REQUEST_TONES[request.status]}>{REQUEST_LABELS[request.status]}</Badge>}
        id="review-decision"
        title="Decision"
      />

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 px-4 py-3 text-sm">
        <dt className="text-muted">From</dt>
        <dd className="truncate text-ink">{author}</dd>
        <dt className="text-muted">What</dt>
        <dd className="text-ink">{DESK_LABELS[request.desk]}</dd>
        <dt className="text-muted">Sent</dt>
        <dd className="text-ink" title={formatDateTime(request.requestedAt)}>{formatRelative(request.requestedAt)}</dd>
        {request.reviewedAt ? (
          <>
            <dt className="text-muted">Answered</dt>
            <dd className="text-ink" title={formatDateTime(request.reviewedAt)}>
              {request.reviewerName ?? "A reviewer"} · {formatRelative(request.reviewedAt)}
            </dd>
          </>
        ) : null}
      </dl>

      {request.reviewNote ? (
        <p className="mx-4 mb-3 rounded-md bg-sand px-3 py-2 text-sm text-ink-soft">
          <span className="font-medium text-ink">{request.status === "PENDING_REVIEW" ? "Earlier feedback" : "Note"}: </span>
          {request.reviewNote}
        </p>
      ) : null}

      <section aria-labelledby="review-checklist" className="border-t border-line px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="text-xs font-semibold text-ink-soft" id="review-checklist">Checklist</h3>
          <span className="text-xs text-muted tabular-nums">{done} of {lines.length}</span>
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
                {!line.done && line.required ? " — required" : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {decided ? (
        <div className="flex flex-col gap-2 border-t border-line px-4 py-3" role="status">
          <p className={cn("flex gap-2 text-sm", decided === "approve" ? "text-success" : "text-ink-soft")}>
            {decided === "approve" ? <Check aria-hidden className="mt-0.5 size-4 shrink-0" /> : <Undo2 aria-hidden className="mt-0.5 size-4 shrink-0" />}
            {DONE_WORDS[decided](request.targetName, author)}
          </p>
          <Link className="inline-flex items-center gap-1 text-sm font-medium text-teal-deep hover:underline" href={backHref}>
            <ArrowLeft aria-hidden className="size-3.5" />
            Back to {backLabel}
          </Link>
        </div>
      ) : canDecide && request.status === "PENDING_REVIEW" ? (
        <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
          {own ? (
            <p className="text-xs text-muted">
              Your own submission: you publish it yourself, without waiting for an administrator.
            </p>
          ) : null}
          {own ? null : <label className="text-xs font-semibold text-ink-soft" htmlFor="decision-note">Note to {author}</label>}
          {own ? null : (
            <Textarea
              id="decision-note"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Needed to send it back or reject it: what to change, or why."
              rows={3}
              value={note}
            />
          )}
          {requiredMissing ? (
            <p className="text-xs text-heritage">
              {requiredMissing === 1 ? "A required detail is" : `${requiredMissing} required details are`} missing. Send it back rather than publish it.
            </p>
          ) : null}
          <Button className="w-full" disabled={saving} onClick={() => decide("approve")} type="button">
            {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
            Approve and publish
          </Button>
          <div className={cn("grid grid-cols-2 gap-2", own && "hidden")}>
            <Button disabled={saving} onClick={() => decide("request-changes")} size="sm" type="button" variant="secondary">
              <Undo2 aria-hidden className="size-3.5" />
              Request changes
            </Button>
            <Button disabled={saving} onClick={() => decide("reject")} size="sm" type="button" variant="secondary">
              <X aria-hidden className="size-3.5" />
              Reject
            </Button>
          </div>
          {error ? <p className="text-xs font-medium text-heritage" role="alert">{error}</p> : null}
        </div>
      ) : null}

      {editHref ? (
        <p className="border-t border-line px-4 py-3 text-xs text-muted">
          {canDecide && request.status === "PENDING_REVIEW" && !decided ? "Something to correct first? Edit it yourself and you come back here to decide. " : ""}
          <Link className="inline-flex items-center gap-1 font-medium text-teal-deep hover:underline" href={editHref}>
            <PencilLine aria-hidden className="size-3" />
            {canDecide && request.status === "PENDING_REVIEW" && !decided ? "Edit before approving" : "Open it in the editor"}
          </Link>
        </p>
      ) : null}
    </Surface>
  );
}
