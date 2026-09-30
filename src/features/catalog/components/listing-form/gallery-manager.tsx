"use client";

import { createContext, useImperativeHandle, useRef, useState, type Dispatch, type Ref, type SetStateAction } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDeleteRecordMutation,
  useGetCatalogQuery,
} from "@/features/catalog/api/catalog-api";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { IMAGE_ACCEPT } from "@/features/catalog/media-upload";
import { galleryOf, mediaPath } from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import { LISTING_GALLERIES, type ListingKey } from "@/features/catalog/components/listing-form/steps";
import {
  progressLabel,
  useGalleryRows,
  useImageUpload,
  type UploadProgress,
} from "@/features/catalog/use-image-upload";
import { apiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

/** A photo uploaded while the listing does not exist yet; its gallery row is written on save. */
export interface PendingPhoto {
  readonly key: string;
  readonly url: string;
  readonly name: string;
}

/** Lets the cover drop area hand over the extra photos dropped on it. */
export interface GalleryHandle {
  addFiles(files: readonly File[]): void;
}

/**
 * Where the cover drop area sends every photo after the first: the listing's
 * gallery, when this person may add to it. Null when there is no gallery.
 */
export const GalleryDropContext = createContext<((files: readonly File[]) => void) | null>(null);

interface GalleryManagerProps {
  readonly listing: ListingKey;
  /** Null while the listing is being created. */
  readonly listingId: string | null;
  readonly pending: readonly PendingPhoto[];
  readonly onPendingChange: Dispatch<SetStateAction<PendingPhoto[]>>;
  /** The listing's cover, so the photo used as it is marked. */
  readonly coverKey: string;
  readonly onUseAsCover: (photo: { readonly key: string; readonly url: string }) => void;
  readonly canAdd: boolean;
  readonly canDelete: boolean;
  readonly handle?: Ref<GalleryHandle>;
  /** Told when uploads start and finish, so a save can wait for them. */
  readonly onBusyChange?: (busy: boolean) => void;
}

interface Tile {
  readonly id: string;
  readonly key: string;
  readonly url: string;
  readonly order: number;
  /** A saved gallery row, rather than a photo waiting for the listing to be saved. */
  readonly saved: boolean;
}

/**
 * A listing's gallery: every photograph a traveller can page through.
 *
 * Any number can be picked or dropped at once. They are shrunk and uploaded in
 * batches straight away, with progress, so a person can carry on filling in
 * the form. On an existing listing each one becomes a gallery row as soon as
 * it is uploaded; on a new listing the rows are written when it is saved.
 */
export function GalleryManager({
  listing,
  listingId,
  pending,
  onPendingChange,
  coverKey,
  onUseAsCover,
  canAdd,
  canDelete,
  handle,
  onBusyChange,
}: GalleryManagerProps) {
  const definition = getResource(LISTING_GALLERIES[listing]);
  const gallery = galleryOf(definition)!;
  const order = definition.orderField;
  const input = useRef<HTMLInputElement>(null);
  const rows = useGetCatalogQuery(definition.key, { skip: listingId === null });
  const [deleteRecord] = useDeleteRecordMutation();
  const upload = useImageUpload();
  const addRows = useGalleryRows(definition, gallery);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  /* Photos picked while a batch is still on its way wait here, in order. */
  const queue = useRef<File[]>([]);
  const running = useRef(false);
  /* The next gallery position, carried across batches before the list has refetched. */
  const nextOrder = useRef(0);

  const saved: Tile[] = listingId
    ? (rows.data ?? [])
        .filter((row: CatalogRecord) => String(row[gallery.owner.name] ?? "") === listingId)
        .map((row) => {
          const key = String(row[gallery.file.name] ?? "");
          const url = gallery.file.urlField ? String(row[gallery.file.urlField] ?? "") : "";
          return { id: row.id, key, url: url || mediaPath(key), order: order ? Number(row[order] ?? 0) : 0, saved: true };
        })
        .sort((a, b) => a.order - b.order)
    : [];
  const tiles: readonly Tile[] = listingId
    ? saved
    : pending.map((photo, index) => ({ id: photo.key, key: photo.key, url: photo.url, order: index + 1, saved: false }));
  const busy = progress !== null;

  function addFiles(files: readonly File[]) {
    if (!canAdd || !files.length) return;
    queue.current.push(...files);
    if (!running.current) void drain();
  }

  async function drain() {
    running.current = true;
    onBusyChange?.(true);
    nextOrder.current = Math.max(nextOrder.current, saved.reduce((top, tile) => Math.max(top, tile.order), 0) + 1);
    while (queue.current.length) await addBatch(queue.current.splice(0));
    running.current = false;
    setProgress(null);
    onBusyChange?.(false);
  }

  async function addBatch(files: readonly File[]) {
    setNotice(null);
    const outcome = await upload(files, gallery.category, setProgress);
    const problems = [...outcome.skipped];
    if (outcome.error) problems.push(outcome.error);

    if (listingId && outcome.uploaded.length) {
      const written = await addRows(
        listingId,
        outcome.uploaded.map((media) => ({ key: media.key, url: media.uri })),
        nextOrder.current,
        setProgress,
      );
      nextOrder.current += written.added;
      if (written.error) problems.push(`${written.added} of ${outcome.uploaded.length} were added to the gallery: ${written.error}`);
    } else if (outcome.uploaded.length) {
      onPendingChange((current) => [
        ...current,
        ...outcome.uploaded.map((media) => ({ key: media.key, url: media.uri || mediaPath(media.key), name: media.name || media.key })),
      ]);
    }

    if (input.current) input.current.value = "";
    const added = outcome.uploaded.length;
    setNotice(
      problems.length
        ? `${added} ${added === 1 ? "photo" : "photos"} added. ${problems.join(" ")}`
        : `${added} ${added === 1 ? "photo" : "photos"} added${listingId ? "" : " — they join the gallery when you save"}.`,
    );
  }

  useImperativeHandle(handle, () => ({ addFiles }));

  async function remove(tile: Tile) {
    setNotice(null);
    if (!tile.saved) {
      onPendingChange((current) => current.filter((photo) => photo.key !== tile.key));
      return;
    }
    setRemoving(tile.id);
    try {
      await deleteRecord({ resource: definition.key, id: tile.id }).unwrap();
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {canAdd ? (
        <button
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
            dragging ? "border-teal bg-teal-soft/60" : "border-line-strong bg-sand hover:border-line-hover hover:bg-sand-deep",
          )}
          onClick={() => input.current?.click()}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(Array.from(event.dataTransfer.files ?? []));
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
            ) : dragging ? (
              "Drop the photos to upload them"
            ) : (
              <>
                <span className="font-medium text-teal-deep">Upload photos</span> or drag them here
              </>
            )}
          </span>
          <span className="text-xs text-muted">Select as many as you like · large photos are resized before they upload</span>
        </button>
      ) : null}

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
        onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
        ref={input}
        type="file"
      />

      {notice ? (
        <p aria-live="polite" className="text-xs text-muted" role="status">
          {notice}
        </p>
      ) : null}

      {tiles.length ? (
        <>
          <p className="text-xs text-muted tabular-nums">
            {tiles.length} {tiles.length === 1 ? "photo" : "photos"} in the gallery
            {!listingId ? " (saved with the listing)" : ""}
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {tiles.map((tile) => {
              const cover = tile.key === coverKey;
              return (
                <li className="group relative overflow-hidden rounded-md border border-line bg-sand-deep" key={tile.id}>
                  <div className="relative aspect-4/3">
                    <Image alt="" className="object-cover" fill sizes="200px" src={tile.url} unoptimized />
                  </div>
                  {cover ? (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm bg-paper/95 px-1.5 py-0.5 text-2xs font-medium text-ink shadow-xs">
                      <Star aria-hidden className="size-3 fill-gold text-gold" />
                      Cover
                    </span>
                  ) : null}
                  <div className="flex items-center justify-between gap-1 border-t border-line bg-paper px-1.5 py-1">
                    <span className="pl-0.5 text-2xs text-muted tabular-nums">{tile.order}</span>
                    <span className="flex items-center">
                      {!cover ? (
                        <Button
                          className="h-6 px-1.5 text-2xs"
                          onClick={() => onUseAsCover({ key: tile.key, url: tile.url })}
                          size="sm"
                          title="Use as the cover photo"
                          type="button"
                          variant="ghost"
                        >
                          Use as cover
                        </Button>
                      ) : null}
                      {!tile.saved || canDelete ? (
                        <Button
                          aria-label={tile.saved ? "Delete this photo from the gallery" : "Remove this photo"}
                          className="size-6 text-muted hover:bg-heritage-soft hover:text-heritage"
                          disabled={removing === tile.id}
                          onClick={() => void remove(tile)}
                          size="icon-sm"
                          title={tile.saved ? "Delete from the gallery" : "Remove"}
                          type="button"
                          variant="ghost"
                        >
                          {removing === tile.id ? (
                            <Loader2 aria-hidden className="size-3.5 animate-spin" />
                          ) : tile.saved ? (
                            <Trash2 aria-hidden className="size-3.5" />
                          ) : (
                            <X aria-hidden className="size-3.5" />
                          )}
                        </Button>
                      ) : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : !canAdd ? (
        <p className="text-sm text-muted">No gallery photos yet.</p>
      ) : null}
    </div>
  );
}
