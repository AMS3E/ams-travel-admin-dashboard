"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSaveRecordMutation } from "@/features/catalog/api/catalog-api";
import type { FormValues } from "@/features/catalog/resource";
import { apiErrorMessage } from "@/store/api/api-error";

/**
 * The line above a region's Historical coverage, changed where it is read.
 * It is the region's own field, so the region is saved whole — its name, its
 * lists — with only the line changed.
 */
export function IntroEditor({
  regionId,
  values,
  canEdit,
}: {
  readonly regionId: string;
  /** The region as its form holds it. */
  readonly values: FormValues;
  readonly canEdit: boolean;
}) {
  const router = useRouter();
  const [saveRecord] = useSaveRecordMutation();
  const saved = typeof values.historyIntro === "string" ? values.historyIntro : "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveRecord({ resource: "regions", id: regionId, values: { ...values, historyIntro: draft } }).unwrap();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch (failure) {
      setError(apiErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3 px-4 py-2.5">
        <p className="text-xs text-muted">
          The line under the heading:{" "}
          {saved.trim() ? <span className="text-ink-soft">“{saved.trim()}”</span> : <span>none yet.</span>}
        </p>
        {canEdit ? (
          <Button
            onClick={() => {
              setDraft(saved);
              setEditing(true);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Pencil aria-hidden className="size-3.5" />
            Edit line
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <label className="text-xs font-medium text-ink-soft" htmlFor={`intro-${regionId}`}>
        The line under the heading
      </label>
      <Textarea id={`intro-${regionId}`} onChange={(event) => setDraft(event.target.value)} rows={2} value={draft} />
      <p className="text-xs text-muted">For example: The succession of royal capitals this region is built around — read it top to bottom.</p>
      {error ? (
        <p className="text-xs font-medium text-heritage" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button disabled={saving} onClick={() => void save()} size="sm" type="button">
          {saving ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
          Save line
        </Button>
        <Button onClick={() => setEditing(false)} size="sm" type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </div>
  );
}
