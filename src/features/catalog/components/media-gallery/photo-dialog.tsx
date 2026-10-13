"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Copy, Loader2, Star, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteRecordMutation, useSaveRecordMutation } from "@/features/catalog/api/catalog-api";
import { toFormValues, type ResourceDefinition } from "@/features/catalog/resource";
import type { Photo } from "@/features/catalog/components/media-gallery/photos";
import { apiErrorMessage } from "@/store/api/api-error";

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

interface PhotoDialogProps {
  readonly definition: ResourceDefinition;
  readonly photo: Photo;
  /** Where it stands in the photos being shown: "3 of 122". */
  readonly index: number;
  readonly total: number;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly onClose: () => void;
  /** Absent at either end of the list. */
  readonly onPrevious?: () => void;
  readonly onNext?: () => void;
  /** The photo is gone: the gallery moves on or closes. */
  readonly onDeleted: () => void;
}

/**
 * One photo, large, over the gallery — a media library's "attachment
 * details". The arrows walk through the photos as they are shown; the panel
 * beside the picture says whose it is and lets it be captioned, moved, made
 * the cover, linked to or deleted, without leaving the gallery.
 */
export function PhotoDialog({ definition, photo, index, total, canEdit, canDelete, onClose, onPrevious, onNext, onDeleted }: PhotoDialogProps) {
  const [saveRow, saving] = useSaveRecordMutation();
  const [deleteRow, deleting] = useDeleteRecordMutation();
  const [caption, setCaption] = useState(photo.caption);
  const [position, setPosition] = useState(String(photo.order));
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [marking, setMarking] = useState(false);

  const dirty = caption.trim() !== photo.caption || position.trim() !== String(photo.order);
  const busy = saving.isLoading || deleting.isLoading || marking;

  /* The page behind stays put; Escape closes; the arrows walk the list unless something is being typed. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (event.key === "Escape") onClose();
      else if (!typing && event.key === "ArrowLeft") onPrevious?.();
      else if (!typing && event.key === "ArrowRight") onNext?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, onPrevious, onNext]);

  /** The row written back whole, as the API expects; a photo's type is what the registry starts one with. */
  function values() {
    const next = toFormValues(definition, photo.row);
    for (const field of definition.fields) {
      if (field.initial && !next[field.name]) next[field.name] = field.initial;
    }
    return next;
  }

  async function save() {
    setProblem(null);
    setSaved(false);
    const next = values();
    next.caption = caption.trim();
    if (definition.orderField) {
      const order = Number(position);
      next[definition.orderField] = Number.isInteger(order) && order >= 0 ? String(order) : String(photo.order);
    }
    try {
      const result = await saveRow({ resource: definition.key, id: photo.id, values: next }).unwrap();
      if (!result.ok) {
        setProblem(result.fieldErrors ? Object.values(result.fieldErrors)[0] ?? result.message : result.message);
        return;
      }
      setSaved(true);
    } catch (error) {
      setProblem(apiErrorMessage(error));
    }
  }

  /** The API makes it the destination's cover and unmarks the others. */
  async function makeCover() {
    setProblem(null);
    setMarking(true);
    const next = values();
    next.isCover = true;
    try {
      const result = await saveRow({ resource: definition.key, id: photo.id, values: next }).unwrap();
      if (!result.ok) setProblem(result.message);
    } catch (error) {
      setProblem(apiErrorMessage(error));
    } finally {
      setMarking(false);
    }
  }

  async function remove() {
    setProblem(null);
    try {
      await deleteRow({ resource: definition.key, id: photo.id }).unwrap();
      onDeleted();
    } catch (error) {
      setConfirming(false);
      setProblem(apiErrorMessage(error));
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(photo.url, window.location.origin).toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setProblem("The link could not be copied. Select the file name and copy it instead.");
    }
  }

  const uploaded = photo.createdAt ? DATE.format(new Date(photo.createdAt)) : null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink/60 p-3 sm:p-6" onClick={onClose}>
      <div
        aria-labelledby="photo-dialog-title"
        aria-modal="true"
        className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-line bg-paper shadow-xl md:h-[min(88vh,56rem)] md:flex-row"
        data-photo-dialog
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {/* The photo, as large as the window allows, with the way to the next one. */}
        <div className="relative min-h-72 flex-1 bg-ink md:min-h-0">
          <Image alt={photo.caption || ""} className="object-contain" fill sizes="(min-width: 768px) 60vw, 100vw" src={photo.url} unoptimized />
          {onPrevious ? (
            <button
              aria-label="Previous photo"
              className="absolute top-1/2 left-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-ink shadow-sm transition-colors hover:bg-paper"
              onClick={onPrevious}
              type="button"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
          ) : null}
          {onNext ? (
            <button
              aria-label="Next photo"
              className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-ink shadow-sm transition-colors hover:bg-paper"
              onClick={onNext}
              type="button"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          ) : null}
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-2.5 py-0.5 text-xs text-white tabular-nums">
            {index + 1} of {total}
          </span>
        </div>

        {/* Whose it is, and what can be done with it. */}
        <aside className="flex w-full shrink-0 flex-col border-t border-line md:w-80 md:overflow-y-auto md:border-t-0 md:border-l">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h3 className="text-base font-semibold text-ink" id="photo-dialog-title">
              Photo details
            </h3>
            <button
              aria-label="Close"
              className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sand-deep hover:text-ink"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4">
            <div>
              <p className="text-xs font-medium text-muted">Destination</p>
              <p className="text-sm font-medium text-ink" data-photo-owner>{photo.owner}</p>
              <Link className="text-xs text-teal-deep hover:underline" href={`/destinations/${photo.ownerId}`}>
                Open the destination
              </Link>
            </div>

            <div className="flex flex-col gap-1.5">
              {photo.cover ? (
                <Badge className="w-fit" tone="warning">
                  <Star aria-hidden className="size-3 fill-current" />
                  Cover photo
                </Badge>
              ) : canEdit ? (
                <Button className="w-fit" disabled={busy} onClick={() => void makeCover()} size="sm" type="button" variant="secondary">
                  {marking ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Star aria-hidden className="size-3.5" />}
                  Make this the cover
                </Button>
              ) : (
                <p className="text-sm text-muted">Not the cover</p>
              )}
              <p className="text-xs text-muted">The cover is the photo the app and the website show first for this destination.</p>
            </div>

            <FormField hint="Describe the photograph for anyone who cannot see it." label="Caption">
              {(field) => (
                <Textarea
                  aria-describedby={field["aria-describedby"]}
                  disabled={!canEdit || busy}
                  id={field.id}
                  onChange={(event) => {
                    setCaption(event.target.value);
                    setSaved(false);
                  }}
                  rows={3}
                  value={caption}
                />
              )}
            </FormField>

            <FormField hint="Lower numbers come first on the destination page." label="Position">
              {(field) => (
                <Input
                  aria-describedby={field["aria-describedby"]}
                  className="w-28"
                  disabled={!canEdit || busy}
                  id={field.id}
                  min={0}
                  onChange={(event) => {
                    setPosition(event.target.value);
                    setSaved(false);
                  }}
                  type="number"
                  value={position}
                />
              )}
            </FormField>

            {canEdit ? (
              <div className="flex items-center gap-2">
                <Button disabled={!dirty || busy} onClick={() => void save()} size="sm" type="button">
                  {saving.isLoading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
                  Save
                </Button>
                {saved && !dirty ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success" role="status">
                    <Check aria-hidden className="size-3.5" />
                    Saved
                  </span>
                ) : null}
              </div>
            ) : null}

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="font-medium text-muted">Uploaded</dt>
              <dd className="text-ink">{uploaded ?? "—"}</dd>
              <dt className="font-medium text-muted">File</dt>
              <dd className="font-mono break-all text-ink-soft">{photo.key}</dd>
            </dl>

            <Button className="w-fit" onClick={() => void copyLink()} size="sm" type="button" variant="secondary">
              {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
              {copied ? "Link copied" : "Copy link"}
            </Button>

            {problem ? (
              <p className="text-xs font-medium text-heritage" role="alert">
                {problem}
              </p>
            ) : null}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
            {canDelete ? (
              confirming ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink">Delete this photo for good?</span>
                  <Button disabled={busy} onClick={() => void remove()} size="sm" type="button" variant="destructive">
                    {deleting.isLoading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
                    Delete
                  </Button>
                  <Button disabled={busy} onClick={() => setConfirming(false)} size="sm" type="button" variant="ghost">
                    Keep
                  </Button>
                </span>
              ) : (
                <Button
                  className="text-heritage hover:bg-heritage-soft hover:text-heritage"
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden className="size-3.5" />
                  Delete photo
                </Button>
              )
            ) : (
              <span />
            )}
            <Link className="text-xs text-muted hover:text-ink hover:underline" href={`/destination-media/${photo.id}`}>
              Open the full form
            </Link>
          </div>
        </aside>
      </div>
    </div>,
    document.body,
  );
}
