"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES, imageProblem, prepareImage } from "@/features/catalog/media-upload";
import { mediaPath, type ResourceField } from "@/features/catalog/resource";
import { useUploadMedia } from "@/features/media/api/media-api";
import { apiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  readonly id: string;
  readonly value: string;
  readonly previewUrl: string;
  readonly onChange: (key: string, previewUrl: string) => void;
  readonly category: NonNullable<ResourceField["imageCategory"]>;
  readonly describedBy?: string;
  readonly invalid?: boolean;
}

/**
 * A single photo for a form that keeps its own state — a corridor's cover: a
 * drop area to drag a photo into or browse for one, and once there, the photo
 * as the website crops it with Replace and Remove. A key already in the bucket
 * can be pasted under "Use a photo already uploaded" instead of uploading it
 * again. A listing's cover is not set here: it is chosen in its gallery.
 */
export function PhotoDropzone({ id, value, previewUrl, onChange, category, describedBy, invalid }: DropzoneProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const preview = previewUrl || (value ? mediaPath(value) : "");
  const broken = Boolean(preview) && brokenSrc === preview;

  /** One photo: the first of any dropped together. */
  function take(files: readonly File[]) {
    if (!files.length) return;
    const [first, ...rest] = files;
    setNote(rest.length ? "Only the first photo is used as the cover." : null);
    void upload(first);
  }

  async function upload(picked: File) {
    const problem = imageProblem(picked);
    if (problem) {
      setFailure(problem);
      return;
    }
    setUploading(true);
    setFailure(null);
    try {
      const file = await prepareImage(picked);
      if (file.size > MAX_IMAGE_BYTES) {
        setFailure(`${picked.name} is still larger than 8 MB after resizing.`);
        return;
      }
      const body = new FormData();
      body.set("file", file, file.name);
      body.set("category", category);
      const payload = await uploadMedia(body);
      onChange(payload.key, payload.uri || mediaPath(payload.key));
    } catch (error) {
      setFailure(apiErrorMessage(error));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-sand sm:w-80">
            {broken || !preview ? (
              <div className="absolute inset-0 grid place-items-center text-muted">
                <span className="flex flex-col items-center gap-1.5 text-xs">
                  <ImageOff aria-hidden className="size-6" />
                  No image could be read at this key.
                </span>
              </div>
            ) : (
              <Image alt="Cover photo" className="object-cover" fill onError={() => setBrokenSrc(preview)} sizes="320px" src={preview} unoptimized />
            )}
            {uploading ? (
              <div className="absolute inset-0 grid place-items-center bg-scrim text-white">
                <Loader2 aria-hidden className="size-6 animate-spin" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-row gap-2 sm:flex-col">
            <Button disabled={uploading} onClick={() => fileInput.current?.click()} size="sm" type="button" variant="secondary">
              <RefreshCw aria-hidden className="size-3.5" />
              Replace
            </Button>
            <Button
              className="text-heritage hover:bg-heritage-soft hover:text-heritage"
              disabled={uploading}
              onClick={() => {
                setFailure(null);
                onChange("", "");
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden className="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          aria-describedby={describedBy}
          className={cn(
            "flex min-h-36 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-6 py-6 text-center transition-colors disabled:cursor-progress",
            dragging
              ? "border-teal bg-teal-soft/60"
              : invalid
                ? "border-heritage bg-heritage-soft/40"
                : "border-line-strong bg-sand hover:border-line-hover hover:bg-sand-deep",
          )}
          disabled={uploading}
          id={id}
          onClick={() => fileInput.current?.click()}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            take(Array.from(event.dataTransfer.files ?? []));
          }}
          type="button"
        >
          {uploading ? (
            <Loader2 aria-hidden className="size-5 animate-spin text-muted" />
          ) : (
            <ImagePlus aria-hidden className={cn("size-5", dragging ? "text-teal" : "text-muted")} strokeWidth={1.75} />
          )}
          <span className="text-sm text-ink">
            {uploading ? (
              "Uploading…"
            ) : dragging ? (
              "Drop to upload"
            ) : (
              <>
                <span className="font-medium text-teal-deep">Upload a photo</span> or drag it here
              </>
            )}
          </span>
          <span className="text-xs text-muted">
            JPEG, PNG, WebP or AVIF · large photos are resized · landscape works best
          </span>
        </button>
      )}

      <input
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => take(Array.from(event.target.files ?? []))}
        ref={fileInput}
        type="file"
      />

      {note ? (
        <p aria-live="polite" className="text-xs text-muted" role="status">
          {note}
        </p>
      ) : null}

      {failure ? (
        <p className="text-xs font-medium text-heritage" role="alert">
          {failure}
        </p>
      ) : null}

      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-muted select-none hover:text-ink">
          <span className="transition-transform group-open:rotate-90">›</span>
          Use a photo already uploaded
        </summary>
        <Input
          aria-label="Media key"
          className="mt-2 h-8 font-mono text-xs"
          onChange={(event) => {
            const key = event.target.value.trim();
            setFailure(null);
            onChange(key, key ? mediaPath(key) : "");
          }}
          placeholder="e.g. general/00000000-0000-0000-0000-000000000000/angkor-wat.jpg"
          spellCheck={false}
          type="text"
          value={value}
        />
      </details>
    </div>
  );
}
