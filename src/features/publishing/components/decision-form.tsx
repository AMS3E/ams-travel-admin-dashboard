"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Loader2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDecidePublishRequestMutation,
  type PublishDecision,
} from "@/features/publishing/api/publishing-api";
import { useApiErrorMessage } from "@/store/api/api-error";

/**
 * The three answers a reviewer can give, in the row they belong to.
 *
 * Only approving needs no note. A rejection carries a reason and a request for
 * changes carries the changes — the API refuses either without one, because
 * being sent away with nothing to act on is not a workflow. The values are
 * `publishing.decision.noteRequired` keys.
 */
export const NOTE_REQUIRED: Readonly<Record<PublishDecision, "reject" | "requestChanges" | null>> = {
  approve: null,
  reject: "reject",
  "request-changes": "requestChanges",
};

export function DecisionForm({ requestId }: { readonly requestId: string }) {
  const t = useTranslations("publishing.decision");
  const errorMessage = useApiErrorMessage();
  const router = useRouter();
  const [decideRequest] = useDecidePublishRequestMutation();
  const [pending, startPending] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function decide(decision: PublishDecision) {
    setError(null);
    const missingNote = NOTE_REQUIRED[decision];
    if (missingNote && !note.trim()) { setError(t(`noteRequired.${missingNote}`)); return; }
    startPending(async () => {
      try {
        await decideRequest({ id: requestId, decision, decisionNote: note }).unwrap();
        setNote("");
        router.refresh();
      } catch (error) {
        setError(errorMessage(error));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={t("noteLabel")}
          className="h-9 min-w-0 flex-1 text-sm"
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("notePlaceholder")}
          value={note}
        />
        <Button
          disabled={pending}
          onClick={() => decide("approve")}
          size="sm"
          type="button"
        >
          {pending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Check aria-hidden className="size-4" />
          )}
          {t("approve")}
        </Button>
        <Button
          disabled={pending}
          onClick={() => decide("request-changes")}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Undo2 aria-hidden className="size-4" />
          {t("requestChanges")}
        </Button>
        <Button
          disabled={pending}
          onClick={() => decide("reject")}
          size="sm"
          type="button"
          variant="secondary"
        >
          <X aria-hidden className="size-4" />
          {t("reject")}
        </Button>
      </div>

      {error ? (
        <p className="text-2xs font-semibold text-heritage" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
