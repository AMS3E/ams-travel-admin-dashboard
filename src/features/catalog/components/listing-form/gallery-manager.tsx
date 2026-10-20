"use client";

import { useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useDeleteRecordMutation,
  useGetCatalogQuery,
  useSaveRecordMutation,
} from "@/features/catalog/api/catalog-api";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { IMAGE_ACCEPT } from "@/features/catalog/media-upload";
import { galleryOf, mediaPath, toFormValues } from "@/features/catalog/resource";
import { useResource } from "@/features/catalog/use-resource";
import { GALLERIES, type GalleryOwner } from "@/features/catalog/components/listing-form/steps";
import {
  useGalleryRows,
  useImageUpload,
  useUploadText,
  type UploadProgress,
} from "@/features/catalog/use-image-upload";
import { useApiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

/** A photo uploaded while the listing does not exist yet; its gallery row is written on save. */
export interface PendingPhoto {
  readonly key: string;
  readonly url: string;
  readonly name: string;
}

/** The photo that is the listing's cover: its key in the bucket and where it is shown from. */
export interface CoverPhoto {
  readonly key: string;
  readonly url: string;
}

interface GalleryManagerProps {
  /** Whose photos: a destination's, a stay's, a food listing's or a tourism corridor's. */
  readonly listing: GalleryOwner;
  /** Null while the listing is being created. */
  readonly listingId: string | null;
  readonly pending: readonly PendingPhoto[];
  readonly onPendingChange: Dispatch<SetStateAction<PendingPhoto[]>>;
  /** The listing's cover, as the form holds it. */
  readonly coverKey: string;
  readonly coverUrl: string;
  /**
   * The cover changed: another photo, or none. `saved` says the API has it
   * already — an existing listing's gallery writes as it goes — so the form
   * only takes the value; otherwise it goes with the listing's own save.
   */
  readonly onCover: (photo: CoverPhoto | null, saved: boolean) => void;
  readonly canAdd: boolean;
  readonly canDelete: boolean;
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
  /** The saved row itself, to write its cover mark. */
  readonly row?: CatalogRecord;
  /** The cover of a listing made before its cover had to be a gallery photo: shown, but not a row yet. */
  readonly stray?: boolean;
}

/**
 * A listing's photos, in one place: every photograph a traveller can page
 * through, one of them its cover.
 *
 * Any number can be picked or dropped at once. They are shrunk and uploaded in
 * batches straight away, with progress, so a person can carry on filling in
 * the form. On an existing listing each one becomes a gallery row as soon as
 * it is uploaded; on a new listing the rows are written when it is saved.
 *
 * The cover is a choice among them. The first photo is the cover until another
 * is chosen, and deleting the cover hands it to the next. The API keeps the
 * listing's cover in step with the row marked as it, so on an existing listing
 * the choice is saved the moment it is made. A cover from before — set on the
 * listing alone — is shown first and joins the gallery when another takes its
 * place, so it is never lost.
 */
export function GalleryManager({
  listing,
  listingId,
  pending,
  onPendingChange,
  coverKey,
  coverUrl,
  onCover,
  canAdd,
  canDelete,
  onBusyChange,
}: GalleryManagerProps) {
  const t = useTranslations("forms.gallery");
  const text = useUploadText();
  const errorMessage = useApiErrorMessage();
  const definition = useResource(GALLERIES[listing]);
  const gallery = galleryOf(definition)!;
  const order = definition.orderField;
  const input = useRef<HTMLInputElement>(null);
  const rows = useGetCatalogQuery(definition.key, { skip: listingId === null });
  const [deleteRecord] = useDeleteRecordMutation();
  const [saveRow] = useSaveRecordMutation();
  const upload = useImageUpload();
  const addRows = useGalleryRows(definition, gallery);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  /* The tile being deleted, or being made the cover. */
  const [working, setWorking] = useState<string | null>(null);
  /* Photos picked while a batch is still on its way wait here, in order. */
  const queue = useRef<File[]>([]);
  const running = useRef(false);
  /* The next gallery position, carried across batches before the list has refetched. */
  const nextOrder = useRef(0);
  /* This box has chosen a cover itself, before the form's value has come back round. */
  const chose = useRef(false);

  const saved: Tile[] = listingId
    ? (rows.data ?? [])
        .filter((row: CatalogRecord) => String(row[gallery.owner.name] ?? "") === listingId)
        .map((row) => {
          const key = String(row[gallery.file.name] ?? "");
          const url = gallery.file.urlField ? String(row[gallery.file.urlField] ?? "") : "";
          return { id: row.id, key, url: url || mediaPath(key), order: order ? Number(row[order] ?? 0) : 0, saved: true, row };
        })
        .sort((a, b) => a.order - b.order)
    : [];
  const own: readonly Tile[] = listingId
    ? saved
    : pending.map((photo, index) => ({ id: photo.key, key: photo.key, url: photo.url, order: index + 1, saved: false }));
  /* A cover that is not one of the gallery's photos yet; never while the rows are still loading. */
  const stray: Tile | null =
    coverKey && !own.some((tile) => tile.key === coverKey) && !(listingId && rows.isLoading)
      ? { id: `cover:${coverKey}`, key: coverKey, url: coverUrl || mediaPath(coverKey), order: 0, saved: false, stray: true }
      : null;
  /* The cover first, then the rest in their order. */
  const tiles: readonly Tile[] = [...(stray ? [stray] : []), ...own].toSorted(
    (a, b) => Number(b.key === coverKey) - Number(a.key === coverKey),
  );
  const busy = progress !== null;
  const topOrder = () => saved.reduce((top, tile) => Math.max(top, tile.order), 0);

  function addFiles(files: readonly File[]) {
    if (!canAdd || !files.length) return;
    queue.current.push(...files);
    if (!running.current) void drain();
  }

  async function drain() {
    running.current = true;
    onBusyChange?.(true);
    nextOrder.current = Math.max(nextOrder.current, topOrder() + 1);
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
    /* With no cover yet, the first photo is it. */
    const first = outcome.uploaded[0];
    const becomesCover = Boolean(first) && !coverKey && !chose.current;

    if (listingId && outcome.uploaded.length) {
      const written = await addRows(
        listingId,
        outcome.uploaded.map((media, index) => ({ key: media.key, url: media.uri, cover: becomesCover && index === 0 })),
        nextOrder.current,
        setProgress,
      );
      nextOrder.current += written.added;
      if (written.error) problems.push(t("partlyAdded", { added: written.added, total: outcome.uploaded.length, error: written.error }));
      if (becomesCover && first && written.added > 0) {
        chose.current = true;
        onCover({ key: first.key, url: first.uri || mediaPath(first.key) }, true);
      }
    } else if (outcome.uploaded.length) {
      onPendingChange((current) => [
        ...current,
        ...outcome.uploaded.map((media) => ({ key: media.key, url: media.uri || mediaPath(media.key), name: media.name || media.key })),
      ]);
      if (becomesCover && first) {
        chose.current = true;
        onCover({ key: first.key, url: first.uri || mediaPath(first.key) }, false);
      }
    }

    if (input.current) input.current.value = "";
    const added = outcome.uploaded.length;
    setNotice(problems.length ? `${t("added", { count: added })} ${problems.join(" ")}` : t("added", { count: added }));
  }

  /** Marks a saved row as the cover; the API makes it the listing's and unmarks the others. */
  async function mark(tile: Tile): Promise<boolean> {
    if (!tile.row) return false;
    const values = toFormValues(definition, tile.row);
    /* What the API's row does not carry back — a photo's type — is what a new row starts with. */
    for (const field of definition.fields) {
      if (field.initial && !values[field.name]) values[field.name] = field.initial;
    }
    values.isCover = true;
    const result = await saveRow({ resource: definition.key, id: tile.id, values }).unwrap();
    if (!result.ok) {
      setNotice(result.message);
      return false;
    }
    chose.current = true;
    onCover({ key: tile.key, url: tile.url }, true);
    return true;
  }

  async function setCover(tile: Tile) {
    setNotice(null);
    /* A new listing's photos are not rows yet: the choice goes with its save. */
    if (!listingId || !tile.saved) {
      chose.current = true;
      onCover({ key: tile.key, url: tile.url }, false);
      return;
    }
    setWorking(tile.id);
    try {
      /* The cover from before joins the gallery first, so making another the cover does not lose it. */
      if (stray && canAdd) {
        const kept = await addRows(listingId, [{ key: stray.key, url: stray.url }], topOrder() + 1, () => {});
        if (kept.error) {
          setNotice(t("coverNotChanged", { error: kept.error }));
          return;
        }
      }
      await mark(tile);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setWorking(null);
    }
  }

  async function remove(tile: Tile) {
    setNotice(null);
    const wasCover = tile.key === coverKey;
    /* The photo the cover passes to: the next one left. */
    const next = wasCover ? (tiles.find((each) => each.id !== tile.id) ?? null) : null;
    const pass = async () => {
      if (!wasCover) return;
      if (next?.saved && listingId) {
        await mark(next);
        return;
      }
      chose.current = next !== null;
      onCover(next ? { key: next.key, url: next.url } : null, false);
    };

    if (!tile.saved) {
      if (!tile.stray) onPendingChange((current) => current.filter((photo) => photo.key !== tile.key));
      setWorking(tile.id);
      try {
        await pass();
      } catch (error) {
        setNotice(errorMessage(error));
      } finally {
        setWorking(null);
      }
      return;
    }
    setWorking(tile.id);
    try {
      await deleteRecord({ resource: definition.key, id: tile.id }).unwrap();
      await pass();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setWorking(null);
    }
  }

  /* Photos can be dropped anywhere on the box, not only on its Add tile. */
  const drop = canAdd
    ? {
        onDragLeave: (event: DragEvent<HTMLDivElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        },
        onDragOver: (event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(true);
        },
        onDrop: (event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files ?? []));
        },
      }
    : {};
  const percent = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3" {...drop}>
      <input
        accept={IMAGE_ACCEPT}
        className="hidden"
        multiple
        onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
        ref={input}
        type="file"
      />

      {tiles.length === 0 ? (
        canAdd ? (
          /* Nothing yet: one generous place to drop the first photos. */
          <button
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-teal bg-teal-soft/60" : "border-line-strong bg-sand/60 hover:border-line-hover hover:bg-sand",
            )}
            onClick={() => input.current?.click()}
            type="button"
          >
            <span className="grid size-11 place-items-center rounded-full bg-paper shadow-xs ring-1 ring-line">
              {busy ? (
                <Loader2 aria-hidden className="size-5 animate-spin text-teal" />
              ) : (
                <ImagePlus aria-hidden className="size-5 text-teal" strokeWidth={1.75} />
              )}
            </span>
            <span className="text-sm font-medium text-ink">
              {busy ? (
                text.progress(progress)
              ) : dragging ? (
                t("dropToUpload")
              ) : (
                t.rich("dragOrBrowse", { browse: (chunks) => <span className="text-teal-deep">{chunks}</span> })
              )}
            </span>
            <span className="max-w-sm text-xs leading-relaxed text-muted">{t("firstIsCover")}</span>
          </button>
        ) : (
          <p className="text-sm text-muted">{t("none")}</p>
        )
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-ink tabular-nums">
              {t("count", { count: tiles.length })}
              {!listingId ? <span className="font-normal text-muted"> · {t("savedWithListing")}</span> : null}
            </p>
            <p className="hidden text-xs text-muted sm:block">{t("hoverHint")}</p>
          </div>

          {/* The cover large, the rest beside and under it, and a tile to add more. */}
          <ul
            className={cn(
              "grid grid-cols-2 gap-2.5 rounded-xl sm:grid-cols-4",
              dragging && "outline-2 outline-offset-4 outline-teal outline-dashed",
            )}
          >
            {tiles.map((tile) => {
              const cover = tile.key === coverKey;
              return (
                <li
                  className={cn(
                    "group relative overflow-hidden rounded-lg bg-sand-deep ring-1 ring-line",
                    cover && "col-span-2 row-span-2 ring-2 ring-teal",
                  )}
                  data-photo={cover ? "cover" : "photo"}
                  key={tile.id}
                >
                  <div className="relative aspect-4/3">
                    <Image
                      alt=""
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      fill
                      sizes={cover ? "520px" : "260px"}
                      src={tile.url}
                      unoptimized
                    />
                  </div>
                  {cover ? (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-paper/95 px-2 py-1 text-xs font-medium text-ink shadow-sm">
                      <Star aria-hidden className="size-3.5 fill-gold text-gold" />
                      {t("cover")}
                    </span>
                  ) : null}

                  {/* What can be done with it, over the foot of the photo: on hover, on focus, and always where there is no hover. */}
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2 pt-10 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                    style={{ backgroundImage: "linear-gradient(to top, rgb(0 0 0 / 0.55), transparent)" }}
                  >
                    {!cover && canAdd ? (
                      <button
                        className="rounded-md bg-black/65 px-2.5 py-1 text-xs font-medium text-white shadow-xs transition-colors hover:bg-black/80 disabled:opacity-60"
                        disabled={working !== null}
                        onClick={() => void setCover(tile)}
                        title={t("makeCover")}
                        type="button"
                      >
                        {t("setCover")}
                      </button>
                    ) : (
                      <span />
                    )}
                    {!tile.saved || canDelete ? (
                      <button
                        aria-label={tile.saved ? t("deletePhoto") : t("removePhoto")}
                        className="grid size-8 place-items-center rounded-md bg-black/65 text-white shadow-xs transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
                        disabled={working !== null}
                        onClick={() => void remove(tile)}
                        title={tile.saved ? t("deletePhoto") : t("remove")}
                        type="button"
                      >
                        {tile.saved ? <Trash2 aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
                      </button>
                    ) : null}
                  </div>

                  {working === tile.id ? (
                    <div className="absolute inset-0 grid place-items-center bg-paper/70">
                      <Loader2 aria-hidden className="size-5 animate-spin text-teal" />
                    </div>
                  ) : null}
                </li>
              );
            })}

            {canAdd ? (
              <li>
                <button
                  className={cn(
                    "flex aspect-4/3 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-2 text-center transition-colors",
                    dragging ? "border-teal bg-teal-soft/60" : "border-line-strong bg-sand/60 hover:border-line-hover hover:bg-sand",
                  )}
                  onClick={() => input.current?.click()}
                  type="button"
                >
                  {busy ? (
                    <Loader2 aria-hidden className="size-5 animate-spin text-teal" />
                  ) : (
                    <ImagePlus aria-hidden className="size-5 text-teal" strokeWidth={1.75} />
                  )}
                  <span className="text-xs font-medium text-ink">{busy ? text.progress(progress) : dragging ? t("dropToAdd") : t("addPhotos")}</span>
                  {!busy && !dragging ? <span className="text-2xs text-muted">{t("orDrop")}</span> : null}
                </button>
              </li>
            ) : null}
          </ul>
        </>
      )}

      {progress ? (
        <div aria-hidden className="h-1 overflow-hidden rounded-full bg-sand-deep">
          <div className="h-full rounded-full bg-teal transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      ) : null}

      {notice ? (
        <p aria-live="polite" className="text-xs text-muted" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
