"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDecidePublishRequestMutation,
  type PublishDecision,
} from "@/features/publishing/api/publishing-api";
import { apiErrorMessage } from "@/store/api/api-error";

/**
 * The three answers a reviewer can give, in the row they belong to.
 *
 * Only approving needs no note. A rejection carries a reason and a request for
 * changes carries the changes — the API refuses either without one, because
 * being sent away with nothing to act on is not a workflow.
 */
export const NOTE_REQUIRED: Readonly<Record<PublishDecision, string | null>> = {
  approve: null,
  reject: "Add a reason before rejecting this request.",
  "request-changes": "Say what needs changing before sending this back.",
};

export function DecisionForm({ requestId }: { readonly requestId: string }) {
  const router = useRouter();
  const [decideRequest] = useDecidePublishRequestMutation();
  const [pending, startPending] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function decide(decision: PublishDecision) {
    setError(null);
    const missingNote = NOTE_REQUIRED[decision];
    if (missingNote && !note.trim()) { setError(missingNote); return; }
    startPending(async () => {
      try {
        await decideRequest({ id: requestId, decision, decisionNote: note }).unwrap();
        setNote("");
        router.refresh();
      } catch (error) {
        setError(apiErrorMessage(error));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Decision note"
          className="h-9 min-w-0 flex-1 text-sm"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note — required to reject or send back"
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
          Approve
        </Button>
        <Button
          disabled={pending}
          onClick={() => decide("request-changes")}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Undo2 aria-hidden className="size-4" />
          Request changes
        </Button>
        <Button
          disabled={pending}
          onClick={() => decide("reject")}
          size="sm"
          type="button"
          variant="secondary"
        >
          <X aria-hidden className="size-4" />
          Reject
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
