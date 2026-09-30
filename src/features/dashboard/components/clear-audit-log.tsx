"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClearAuditLogMutation } from "@/features/dashboard/api/dashboard-api";
import { hasStatus } from "@/store/api/api-error";

/**
 * Clears the whole audit log.
 *
 * <p>Two steps rather than one, and the second says what is about to happen in
 * plain words: this is the only control in the dashboard that destroys a record
 * rather than a row, and the log is what everything else is answerable to.</p>
 *
 * Rendered only for `PERM_FULL_CONTROL`. The API enforces the same thing — the
 * button being absent is a courtesy, not the boundary.
 */
export function ClearAuditLog() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startClearing] = useTransition();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  /* `count` is null when the API answered 204 and did not say how many went. */
  const [cleared, setCleared] = useState<{ readonly count: number | null } | null>(null);
  const [clearAuditLog] = useClearAuditLogMutation();

  function clear() {
    setFailure(null);
    setBusy(true);
    void (async () => {
      try {
        /* The API answers the PURGE entry it left, which says in `newData` how many went. */
        const entry = await clearAuditLog().unwrap();
        const removed = entry?.newData?.removed;
        setCleared({ count: typeof removed === "number" ? removed : null });
        setConfirming(false);
        /* The table is server-rendered, so the page has to be asked again. */
        startClearing(() => router.refresh());
      } catch (error) {
        setFailure(hasStatus(error, 403) ? "Clearing the log needs full control." : "The log could not be cleared. Try again.");
      } finally {
        setBusy(false);
      }
    })();
  }

  if (cleared !== null && !confirming) {
    return (
      <p className="text-xs text-muted">
        {cleared.count === null
          ? "Cleared the log."
          : `Cleared ${cleared.count} ${cleared.count === 1 ? "entry" : "entries"}.`}
        {pending ? " Refreshing…" : null}
      </p>
    );
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          onClick={() => setConfirming(true)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Trash2 aria-hidden className="size-4" />
          Clear log
        </Button>
        {failure ? (
          <p className="text-xs text-heritage" role="alert">
            {failure}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-lg bg-heritage-soft p-4 text-heritage sm:max-w-md"
      role="alertdialog"
      aria-label="Clear the audit log"
    >
      <div className="flex gap-3">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Delete every entry in the audit log?</p>
          <p className="mt-1 text-xs leading-relaxed">
            This cannot be undone. All that survives is a single entry recording
            that you cleared it, and how many entries went.
          </p>
        </div>
      </div>

      {failure ? (
        <p className="text-xs font-semibold" role="alert">
          {failure}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          disabled={busy}
          onClick={clear}
          size="sm"
          type="button"
          variant="destructive"
        >
          {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          Yes, clear it
        </Button>
        <Button
          disabled={busy}
          onClick={() => {
            setConfirming(false);
            setFailure(null);
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
