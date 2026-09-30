"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import {
  useGetCatalogQuery,
  useGetReferenceOptionsQuery,
} from "@/features/catalog/api/catalog-api";
import { IMAGE_ACCEPT } from "@/features/catalog/media-upload";
import {
  mediaPath,
  type Gallery,
  type ResourceDefinition,
} from "@/features/catalog/resource";
import {
  progressLabel,
  useGalleryRows,
  useImageUpload,
  type UploadProgress,
} from "@/features/catalog/use-image-upload";
import { cn } from "@/lib/utils";

interface BulkPhotoUploadProps {
  readonly definition: ResourceDefinition;
  readonly gallery: Gallery;
  /** Whose gallery to fill before anyone picks one — the destination a link came from. */
  readonly owner?: string;
}

/**
 * Adding a gallery's photographs in one go — as many as there are.
 *
 * A gallery is the one place in the catalogue where a row is not written, it
 * is filled: a destination has dozens of pictures and nobody wants a dozen
 * trips through a form. Choose whose gallery it is, then pick or drop the
 * files. Each is resized in the browser, they upload in batches the API
 * accepts, and one row is written per picture — numbered after the ones
 * already there, so the order on the page is the order they were chosen in.
 *
 * A batch that fails stops the run: the pictures already added keep their
 * rows, and the message says where it got to.
 */
export function BulkPhotoUpload({ definition, gallery, owner: preset = "" }: BulkPhotoUploadProps) {
  const files = useRef<HTMLInputElement>(null);
  const [owner, setOwner] = useState(preset);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<{ readonly ok: boolean; readonly text: string } | null>(null);
  const [added, setAdded] = useState<readonly string[]>([]);

  const options = useGetReferenceOptionsQuery({ resource: definition.key, include: "fields" });
  const existing = useGetCatalogQuery(definition.key);
  const upload = useImageUpload();
  const addRows = useGalleryRows(definition, gallery);

  const owners = options.data?.[gallery.ownerRef] ?? [];
  const order = definition.orderField;
  const busy = progress !== null;

  /** The number to carry on from, so new pictures land after the old ones. */
  function nextSortOrder(): number {
    const rows = (existing.data ?? []).filter((row) => String(row[gallery.owner.name] ?? "") === owner);
    const highest = rows.reduce((top, row) => {
      const value = order ? Number(row[order]) : 0;
      return Number.isFinite(value) && value > top ? value : top;
    }, 0);
    return highest + 1;
  }

  async function add(chosen: readonly File[]) {
    if (!owner || !chosen.length || busy) return;
    setNotice(null);
    setAdded([]);

    const outcome = await upload(chosen, gallery.category, setProgress);
    const written = outcome.uploaded.length
      ? await addRows(owner, outcome.uploaded.map((media) => ({ key: media.key, url: media.uri })), nextSortOrder(), setProgress)
      : { added: 0 };
    setProgress(null);
    setAdded(outcome.uploaded.slice(0, written.added).map((media) => media.key));
    if (files.current) files.current.value = "";

    const problems = [...outcome.skipped, outcome.error, written.error].filter(Boolean);
    setNotice({
      ok: problems.length === 0,
      text: `${written.added} of ${chosen.length} ${chosen.length === 1 ? "photo" : "photos"} added.${problems.length ? ` ${problems.join(" ")}` : ""}`,
    });
  }

  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-md font-semibold text-ink">Add photos</h2>
          <p className="mt-0.5 text-xs text-muted">
            Choose whose gallery, then add as many photos as you like. One {definition.label.toLowerCase()} is written
            per picture, in the order you chose them.
          </p>
        </div>
        <label className="sr-only" htmlFor="bulk-owner">
          {gallery.owner.label}
        </label>
        <Select
          className="h-8 w-64 text-sm"
          disabled={busy}
          id="bulk-owner"
          onChange={(event) => setOwner(event.target.value)}
          value={owner}
        >
          <option value="">Choose a {gallery.owner.label.toLowerCase()}…</option>
          {owners.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </header>

      <div className="flex flex-col gap-3 p-4">
        <button
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            dragging ? "border-teal bg-teal-soft/60" : "border-line-strong bg-sand hover:border-line-hover hover:bg-sand-deep",
          )}
          disabled={!owner || busy}
          onClick={() => files.current?.click()}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            if (owner && !busy) setDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void add(Array.from(event.dataTransfer.files ?? []));
          }}
          type="button"
        >
          {busy ? (
            <Loader2 aria-hidden className="size-5 animate-spin text-muted" />
          ) : (
            <ImagePlus aria-hidden className={cn("size-5", dragging ? "text-teal" : "text-muted")} strokeWidth={1.75} />
          )}
          <span className="text-sm text-ink">
            {busy ? (
              progressLabel(progress)
            ) : !owner ? (
              `Choose a ${gallery.owner.label.toLowerCase()} first`
            ) : (
              <>
                <span className="font-medium text-teal-deep">Upload photos</span> or drag them here
              </>
            )}
          </span>
          <span className="text-xs text-muted">Select as many as you like · large photos are resized before they upload</span>
        </button>

        {progress ? (
          <div aria-hidden className="h-1 overflow-hidden rounded-full bg-sand-deep">
            <div
              className="h-full rounded-full bg-teal transition-[width] duration-300"
              style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
            />
          </div>
        ) : null}

        <input
          accept={IMAGE_ACCEPT}
          className="hidden"
          multiple
          onChange={(event) => void add(Array.from(event.target.files ?? []))}
          ref={files}
          type="file"
        />

        {notice ? (
          <p className={cn("text-xs", notice.ok ? "text-muted" : "font-medium text-heritage")} role={notice.ok ? "status" : "alert"}>
            {notice.text}
          </p>
        ) : null}

        {added.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {added.map((key) => (
              <li key={key}>
                <Image alt="" className="size-14 rounded-md object-cover ring-1 ring-line" height={56} src={mediaPath(key)} unoptimized width={56} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
