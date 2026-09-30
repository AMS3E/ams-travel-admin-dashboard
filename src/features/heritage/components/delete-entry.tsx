"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteRecordMutation } from "@/features/catalog/api/catalog-api";
import { apiErrorMessage } from "@/store/api/api-error";

/**
 * Delete on a row of a region's Historical coverage: a second click deletes it,
 * and the list reloads with the others renumbered.
 */
export function DeleteEntry({ id, title, number }: { readonly id: string; readonly title: string; readonly number: number }) {
  const router = useRouter();
  const [deleteRecord] = useDeleteRecordMutation();
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function destroy() {
    setProblem(null);
    startDelete(async () => {
      try {
        await deleteRecord({ resource: "region-coverage", id }).unwrap();
        router.refresh();
      } catch (error) {
        setProblem(apiErrorMessage(error));
        setAsking(false);
      }
    });
  }

  if (asking) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5" role="group">
        <span className="text-xs text-muted">Delete No. {number}?</span>
        <Button disabled={deleting} onClick={() => setAsking(false)} size="sm" type="button" variant="ghost">
          Keep it
        </Button>
        <Button disabled={deleting} onClick={destroy} size="sm" type="button" variant="destructive">
          {deleting ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
          Yes, delete
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        aria-label={`Delete No. ${number}, ${title}`}
        className="text-heritage hover:bg-heritage-soft hover:text-heritage"
        onClick={() => setAsking(true)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden className="size-3.5" />
        Delete
      </Button>
      {problem ? (
        <p className="max-w-56 text-right text-xs font-medium text-heritage" role="alert">
          {problem}
        </p>
      ) : null}
    </>
  );
}
