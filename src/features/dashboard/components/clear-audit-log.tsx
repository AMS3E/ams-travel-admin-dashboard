"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClearAuditLogMutation } from "@/features/dashboard/api/dashboard-api";
import { plural } from "@/features/dashboard/audit";
import { hasStatus } from "@/store/api/api-error";

/* Typed to confirm: this is the one control that destroys the record everything else answers to. */
const CONFIRM_WORD = "CLEAR";

/** Clears the whole audit log. Shown only for `PERM_FULL_CONTROL`; the API enforces the same. */
export function ClearAuditLog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {notice ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted" role="status">
          <CircleCheck aria-hidden className="size-3.5 text-success" />
          {notice}
          {refreshing ? " Refreshing…" : null}
        </p>
      ) : null}
      <Button
        aria-haspopup="dialog"
        className="border-heritage/30 text-heritage hover:border-heritage/50 hover:bg-heritage-soft hover:text-heritage"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="secondary"
      >
        <Trash2 aria-hidden className="size-3.5" />
        Clear logs
      </Button>
      {open ? (
        <ClearDialog
          onCleared={(removed) => {
            setOpen(false);
            setNotice(removed == null ? "Cleared the log." : `Cleared ${plural(removed, "entry", "entries")}.`);
            /* The table is server-rendered, so the page is asked again. */
            startRefresh(() => router.refresh());
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ClearDialog({
  onClose,
  onCleared,
}: {
  readonly onClose: () => void;
  readonly onCleared: (removed: number | null) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [clearAuditLog, { isLoading }] = useClearAuditLogMutation();
  const titleId = useId();
  const textId = useId();
  const inputId = useId();
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  async function clear() {
    if (!confirmed || isLoading) return;
    setFailure(null);
    try {
      /* The API answers the PURGE entry it left; `newData.removed` says how many went. */
      const entry = await clearAuditLog().unwrap();
      const removed = entry?.newData?.removed;
      onCleared(typeof removed === "number" ? removed : null);
    } catch (error) {
      setFailure(
        hasStatus(error, 403) ? "Clearing the log needs full control." : "The log could not be cleared. Nothing was removed. Try again.",
      );
    }
  }

  return (
    <dialog
      aria-describedby={textId}
      aria-labelledby={titleId}
      className="glass fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-line p-0 text-ink shadow-pop backdrop:bg-scrim"
      onCancel={(event) => {
        event.preventDefault();
        if (!isLoading) onClose();
      }}
      ref={dialog}
      role="alertdialog"
    >
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void clear();
        }}
      >
        <div className="flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-heritage-soft text-heritage">
            <TriangleAlert aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="heading text-lg font-semibold text-ink" id={titleId}>
              Clear the entire audit log?
            </h2>
            <div className="mt-1.5 flex flex-col gap-2 text-sm text-muted" id={textId}>
              <p>
                Every entry is permanently deleted: who created, changed or deleted each record, when, and from where.
                Past changes can no longer be investigated, and this cannot be undone.
              </p>
              <p>One new entry will record that you cleared the log and how many entries were removed.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-soft" htmlFor={inputId}>
            Type <span className="font-mono font-semibold text-ink">{CONFIRM_WORD}</span> to confirm
          </label>
          <Input
            autoCapitalize="characters"
            autoComplete="off"
            className="h-9"
            disabled={isLoading}
            id={inputId}
            onChange={(event) => setTyped(event.target.value)}
            spellCheck={false}
            value={typed}
          />
        </div>

        {failure ? (
          <p className="rounded-md bg-heritage-soft px-3 py-2 text-sm text-heritage" role="alert">
            {failure}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button autoFocus disabled={isLoading} onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={!confirmed || isLoading} type="submit" variant="destructive">
            {isLoading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Trash2 aria-hidden className="size-4" />}
            Clear all entries
          </Button>
        </div>
      </form>
    </dialog>
  );
}
