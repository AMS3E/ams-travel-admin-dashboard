"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Check, ImagePlus, Inbox, Loader2, Plus, Search, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { SearchField, SegmentedControl, Toolbar } from "@/components/ui/toolbar";
import { useDeleteRecordMutation, useGetCatalogQuery, useGetReferenceOptionsQuery } from "@/features/catalog/api/catalog-api";
import { IMAGE_ACCEPT } from "@/features/catalog/media-upload";
import { galleryOf } from "@/features/catalog/resource";
import { byName, getResource } from "@/features/catalog/resources";
import { PhotoDialog } from "@/features/catalog/components/media-gallery/photo-dialog";
import { shownPhotos, toPhoto, type CoverFilter, type PhotoOrder } from "@/features/catalog/components/media-gallery/photos";
import { ResourceTable } from "@/features/catalog/components/resource-table";
import { progressLabel, useGalleryRows, useImageUpload, type UploadProgress } from "@/features/catalog/use-image-upload";
import { PageHeader } from "@/features/shell/components/page-header";
import { apiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

const RESOURCE = "destination-media";
/** Tiles shown before "Show more". */
const PAGE = 60;

interface MediaGalleryProps {
  readonly canAdd: boolean;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly canSetStatus: boolean;
  readonly grants: readonly string[];
}

interface Notice {
  readonly ok: boolean;
  readonly text: string;
  /** The destination the photos went to, to show them. */
  readonly owner?: string;
}

/**
 * The Media Library as a picture gallery, the way a media library shows its
 * files: every photo on a destination page as a tile, narrowed by destination,
 * cover or a word, and opened large to be captioned, moved, made the cover or
 * deleted. Photos are added by dropping them on the page. The table it
 * replaces is one switch away.
 */
export function MediaGallery({ canAdd, canEdit, canDelete, canSetStatus, grants }: MediaGalleryProps) {
  const definition = getResource(RESOURCE);
  const gallery = galleryOf(definition)!;
  const rows = useGetCatalogQuery(RESOURCE);
  const options = useGetReferenceOptionsQuery({ resource: RESOURCE, include: "fields" });
  const [deleteRow] = useDeleteRecordMutation();
  const upload = useImageUpload();
  const addRows = useGalleryRows(definition, gallery);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [owner, setOwner] = useState("");
  const [cover, setCover] = useState<CoverFilter>("all");
  const [order, setOrder] = useState<PhotoOrder>("arranged");
  const [term, setTerm] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState<{ readonly done: number; readonly total: number } | null>(null);

  const [adding, setAdding] = useState(false);
  const [uploadOwner, setUploadOwner] = useState("");
  const [queued, setQueued] = useState<readonly File[]>([]);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dragging, setDragging] = useState(false);
  const [overPage, setOverPage] = useState(false);
  const files = useRef<HTMLInputElement>(null);

  const destinations = useMemo(
    () => (options.data?.[gallery.ownerRef] ?? []).toSorted((a, b) => byName(a.label, b.label)),
    [options.data, gallery.ownerRef],
  );
  const names = useMemo(() => new Map(destinations.map((option) => [option.value, option.label])), [destinations]);
  const photos = useMemo(() => (rows.data ?? []).map((row) => toPhoto(row, names)), [rows.data, names]);
  const counts = useMemo(() => {
    const byOwner = new Map<string, number>();
    for (const photo of photos) byOwner.set(photo.ownerId, (byOwner.get(photo.ownerId) ?? 0) + 1);
    return byOwner;
  }, [photos]);
  const shown = useMemo(() => shownPhotos(photos, { owner, cover, term, order }), [photos, owner, cover, term, order]);
  const visible = shown.slice(0, limit);
  const filtered = Boolean(term.trim()) || owner !== "" || cover !== "all";
  const busy = progress !== null;

  const openIndex = shown.findIndex((photo) => photo.id === openId);
  const open = openIndex >= 0 ? shown[openIndex] : null;

  /** Every filter change starts the grid from the top again. */
  const reset = (change: () => void) => {
    change();
    setLimit(PAGE);
  };

  async function add(chosen: readonly File[], ownerId: string) {
    if (!canAdd || !chosen.length || !ownerId) return;
    if (busy) {
      setNotice({ ok: false, text: "Wait for the photos already uploading to finish, then add these." });
      return;
    }
    setNotice(null);
    const outcome = await upload(chosen, gallery.category, setProgress);
    /* New photos land after the destination's last one. */
    const start = photos.filter((photo) => photo.ownerId === ownerId).reduce((top, photo) => Math.max(top, photo.order), 0) + 1;
    const written = outcome.uploaded.length
      ? await addRows(ownerId, outcome.uploaded.map((media) => ({ key: media.key, url: media.uri })), start, setProgress)
      : { added: 0 };
    setProgress(null);
    if (files.current) files.current.value = "";
    const problems = [...outcome.skipped, outcome.error, written.error].filter(Boolean);
    setNotice({
      ok: problems.length === 0,
      text: `${written.added} of ${chosen.length} ${chosen.length === 1 ? "photo" : "photos"} added to ${names.get(ownerId) ?? "the destination"}.${problems.length ? ` ${problems.join(" ")}` : ""}`,
      owner: written.added ? ownerId : undefined,
    });
  }

  /** Photos dropped anywhere on the page: to the destination in view, or the panel asks which. */
  function dropped(chosen: readonly File[]) {
    if (!chosen.length) return;
    const target = uploadOwner || owner;
    setAdding(true);
    if (target) {
      setUploadOwner(target);
      void add(chosen, target);
    } else {
      setQueued(chosen);
      setNotice({ ok: true, text: `${chosen.length} ${chosen.length === 1 ? "photo is" : "photos are"} waiting. Choose the destination to add ${chosen.length === 1 ? "it" : "them"} to.` });
    }
  }

  /** The destination chosen with photos waiting: they go to it. */
  function chooseUploadOwner(value: string) {
    setUploadOwner(value);
    if (value && queued.length) {
      const waiting = queued;
      setQueued([]);
      void add(waiting, value);
    }
  }

  /* Dropping photos anywhere on the page adds them, as a media library does; the handler is read fresh each time. */
  const onDrop = useRef(dropped);
  useEffect(() => {
    onDrop.current = dropped;
  });
  useEffect(() => {
    if (!canAdd) return;
    let depth = 0;
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setOverPage(true);
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOverPage(false);
    };
    const over = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const drop = (event: DragEvent) => {
      depth = 0;
      setOverPage(false);
      if (!hasFiles(event)) return;
      event.preventDefault();
      onDrop.current(Array.from(event.dataTransfer?.files ?? []));
    };
    document.addEventListener("dragenter", enter);
    document.addEventListener("dragleave", leave);
    document.addEventListener("dragover", over);
    document.addEventListener("drop", drop);
    return () => {
      document.removeEventListener("dragenter", enter);
      document.removeEventListener("dragleave", leave);
      document.removeEventListener("dragover", over);
      document.removeEventListener("drop", drop);
    };
  }, [canAdd]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
    setConfirming(false);
  }

  async function deleteSelected() {
    const ids = shown.filter((photo) => selected.has(photo.id)).map((photo) => photo.id);
    if (!ids.length) return;
    setNotice(null);
    setRemoving({ done: 0, total: ids.length });
    const failed: string[] = [];
    for (const [index, id] of ids.entries()) {
      try {
        await deleteRow({ resource: RESOURCE, id }).unwrap();
      } catch (error) {
        failed.push(apiErrorMessage(error));
      }
      setRemoving({ done: index + 1, total: ids.length });
    }
    setRemoving(null);
    stopSelecting();
    const gone = ids.length - failed.length;
    setNotice({
      ok: failed.length === 0,
      text: `${gone} of ${ids.length} ${ids.length === 1 ? "photo" : "photos"} deleted.${failed.length ? ` ${failed[0]}` : ""}`,
    });
  }

  /** After a delete in the dialog: the next photo, or the previous at the end, or nothing left to show. */
  function afterDelete() {
    const next = shown[openIndex + 1] ?? shown[openIndex - 1] ?? null;
    setOpenId(next?.id ?? null);
  }

  const count = selected.size;
  const percent = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const dropTarget = uploadOwner || owner;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        actions={
          canAdd ? (
            <Button
              onClick={() => {
                setAdding(true);
                setUploadOwner((current) => current || owner);
              }}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
              Add photos
            </Button>
          ) : null
        }
        description="Every photo on a destination page, in one gallery. Open a photo to caption it or make it the cover; drop new ones onto the page to add them."
        eyebrow="Content Management"
        title="Media Library"
      />

      {adding && canAdd ? (
        <section className="panel overflow-hidden" data-upload-panel>
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <h2 className="text-md font-semibold text-ink">Add photos</h2>
              <p className="mt-0.5 text-xs text-muted">Choose the destination, then pick or drop as many photos as you like. They go after its last photo, in the order you chose them.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="upload-owner">
                Destination
              </label>
              <Select className="h-8 w-64 text-sm" disabled={busy} id="upload-owner" onChange={(event) => chooseUploadOwner(event.target.value)} value={uploadOwner}>
                <option value="">Choose a destination…</option>
                {destinations.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <button
                aria-label="Close the upload panel"
                className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sand-deep hover:text-ink disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  setAdding(false);
                  setQueued([]);
                }}
                type="button"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          </header>
          <div className="flex flex-col gap-3 p-4">
            <button
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                dragging ? "border-teal bg-teal-soft/60" : "border-line-strong bg-sand hover:border-line-hover hover:bg-sand-deep",
              )}
              disabled={!uploadOwner || busy}
              onClick={() => files.current?.click()}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => {
                event.preventDefault();
                if (uploadOwner && !busy) setDragging(true);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDragging(false);
                setOverPage(false);
                void add(Array.from(event.dataTransfer.files ?? []), uploadOwner);
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
                ) : !uploadOwner ? (
                  "Choose a destination first"
                ) : (
                  <>
                    <span className="font-medium text-teal-deep">Upload photos</span> or drag them here
                  </>
                )}
              </span>
              <span className="text-xs text-muted">JPEG, PNG, WebP or AVIF · large photos are resized before they upload</span>
            </button>
            {progress ? (
              <div aria-hidden className="h-1 overflow-hidden rounded-full bg-sand-deep">
                <div className="h-full rounded-full bg-teal transition-[width] duration-300" style={{ width: `${percent}%` }} />
              </div>
            ) : null}
            <input accept={IMAGE_ACCEPT} className="hidden" multiple onChange={(event) => void add(Array.from(event.target.files ?? []), uploadOwner)} ref={files} type="file" />
          </div>
        </section>
      ) : null}

      {notice ? (
        <p
          className={cn("flex flex-wrap items-center gap-x-3 rounded-md border px-3 py-2 text-sm", notice.ok ? "border-line bg-paper text-ink-soft" : "border-heritage/20 bg-heritage-soft text-heritage")}
          role={notice.ok ? "status" : "alert"}
        >
          {notice.text}
          {notice.owner && notice.owner !== owner ? (
            <button className="font-medium text-teal-deep hover:underline" onClick={() => reset(() => setOwner(notice.owner!))} type="button">
              Show them
            </button>
          ) : null}
        </p>
      ) : null}

      <section className="panel min-w-0 overflow-hidden">
        <Toolbar>
          <SegmentedControl
            label="View"
            onChange={(value) => setView(value)}
            options={[
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ]}
            value={view}
          />
          {view === "grid" ? (
            <>
              <Select aria-label="Filter by destination" className="h-8 w-60 text-sm" onChange={(event) => reset(() => setOwner(event.target.value))} value={owner}>
                <option value="">All destinations ({photos.length})</option>
                <optgroup label="With photos">
                  {destinations
                    .filter((option) => counts.has(option.value))
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({counts.get(option.value)})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="No photos yet">
                  {destinations
                    .filter((option) => !counts.has(option.value))
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </optgroup>
              </Select>
              <Select aria-label="Filter by cover" className="h-8 w-36 text-sm" onChange={(event) => reset(() => setCover(event.target.value as CoverFilter))} value={cover}>
                <option value="all">All photos</option>
                <option value="cover">Covers only</option>
                <option value="other">Not the cover</option>
              </Select>
              <Select aria-label="Sort" className="h-8 w-36 text-sm" onChange={(event) => reset(() => setOrder(event.target.value as PhotoOrder))} value={order}>
                <option value="arranged">As arranged</option>
                <option value="newest">Newest first</option>
              </Select>
              <SearchField className="max-w-xs" label="Search photos" onChange={(value) => reset(() => setTerm(value))} placeholder="Search captions and destinations…" value={term} />
              {canDelete && !selecting ? (
                <Button disabled={shown.length === 0} onClick={() => setSelecting(true)} size="sm" type="button" variant="secondary">
                  Select
                </Button>
              ) : null}
              <p aria-live="polite" className="ml-auto text-xs text-muted tabular-nums">
                {shown.length}
                {shown.length !== photos.length ? ` of ${photos.length}` : ""} {photos.length === 1 ? "photo" : "photos"}
              </p>
            </>
          ) : (
            <p className="ml-auto text-xs text-muted">The table, with every column.</p>
          )}
        </Toolbar>

        {view === "grid" && selecting ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sand px-3 py-2 text-sm" data-select-bar>
            <span className="font-medium text-ink tabular-nums">
              {count} selected
            </span>
            <Button onClick={() => setSelected(new Set(shown.map((photo) => photo.id)))} size="sm" type="button" variant="ghost">
              Select all {shown.length}
            </Button>
            {count ? (
              <Button onClick={() => setSelected(new Set())} size="sm" type="button" variant="ghost">
                Clear
              </Button>
            ) : null}
            <span className="ml-auto flex flex-wrap items-center gap-2">
              {removing ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted tabular-nums">
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  Deleting {removing.done} of {removing.total}…
                </span>
              ) : confirming ? (
                <>
                  <span className="text-xs text-ink">Delete {count} {count === 1 ? "photo" : "photos"} for good?</span>
                  <Button onClick={() => void deleteSelected()} size="sm" type="button" variant="destructive">
                    Delete
                  </Button>
                  <Button onClick={() => setConfirming(false)} size="sm" type="button" variant="ghost">
                    Keep
                  </Button>
                </>
              ) : (
                <Button className="text-heritage hover:bg-heritage-soft hover:text-heritage" disabled={count === 0} onClick={() => setConfirming(true)} size="sm" type="button" variant="ghost">
                  <Trash2 aria-hidden className="size-3.5" />
                  Delete {count || ""}
                </Button>
              )}
              <Button disabled={removing !== null} onClick={stopSelecting} size="sm" type="button" variant="secondary">
                Done
              </Button>
            </span>
          </div>
        ) : null}

        {view === "list" ? (
          <ResourceTable canDelete={canDelete} canSetStatus={canSetStatus} definition={definition} grants={grants} referenceOptions={{}} userId={null} />
        ) : rows.isLoading ? (
          <p className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-muted">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Loading photos…
          </p>
        ) : rows.error ? (
          <p className="px-4 py-3 text-sm text-heritage" role="alert">
            The photos could not be loaded: {apiErrorMessage(rows.error)}
          </p>
        ) : visible.length === 0 ? (
          <EmptyState
            action={
              filtered ? (
                <Button
                  onClick={() =>
                    reset(() => {
                      setTerm("");
                      setOwner("");
                      setCover("all");
                    })
                  }
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Clear filters
                </Button>
              ) : canAdd ? (
                <Button onClick={() => setAdding(true)} size="sm" type="button" variant="secondary">
                  <Plus aria-hidden className="size-3.5" />
                  Add photos
                </Button>
              ) : null
            }
            description={filtered ? "Try another destination or word, or show every photo." : "Photos appear here once they are added to a destination."}
            icon={filtered ? Search : Inbox}
            title={filtered ? "Nothing matches those filters" : "No photos yet"}
          />
        ) : (
          <div className="flex flex-col gap-3 p-4">
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3" data-photo-grid>
              {visible.map((photo) => {
                const picked = selected.has(photo.id);
                return (
                  <li
                    className={cn("group relative overflow-hidden rounded-lg bg-paper ring-1 ring-line transition-shadow", picked && "ring-2 ring-teal")}
                    data-photo={photo.cover ? "cover" : "photo"}
                    data-photo-id={photo.id}
                    key={photo.id}
                  >
                    <button
                      aria-label={selecting ? `${picked ? "Unselect" : "Select"} ${photo.owner}${photo.caption ? `: ${photo.caption}` : ""}` : `Open ${photo.owner}${photo.caption ? `: ${photo.caption}` : ""}`}
                      aria-pressed={selecting ? picked : undefined}
                      className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                      onClick={() => (selecting ? toggle(photo.id) : setOpenId(photo.id))}
                      type="button"
                    >
                      <span className="relative block aspect-square bg-sand-deep">
                        <Image alt="" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" fill sizes="200px" src={photo.url} unoptimized />
                        {photo.cover ? (
                          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-paper/95 px-1.5 py-0.5 text-2xs font-medium text-ink shadow-sm">
                            <Star aria-hidden className="size-3 fill-gold text-gold" />
                            Cover
                          </span>
                        ) : null}
                        {selecting ? (
                          <span
                            aria-hidden
                            className={cn(
                              "absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full border shadow-sm transition-colors",
                              picked ? "border-teal bg-teal text-white" : "border-line-strong bg-paper/95",
                            )}
                          >
                            {picked ? <Check className="size-3.5" /> : null}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate px-2 py-1.5 text-xs font-medium text-ink" title={photo.caption || photo.owner}>
                        {photo.owner}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {shown.length > visible.length ? (
              <div className="flex justify-center">
                <Button onClick={() => setLimit((current) => current + PAGE)} size="sm" type="button" variant="secondary">
                  Show more · {shown.length - visible.length} left
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {open ? (
        <PhotoDialog
          canDelete={canDelete}
          canEdit={canEdit}
          definition={definition}
          index={openIndex}
          key={open.id}
          onClose={() => setOpenId(null)}
          onDeleted={afterDelete}
          onNext={openIndex < shown.length - 1 ? () => setOpenId(shown[openIndex + 1].id) : undefined}
          onPrevious={openIndex > 0 ? () => setOpenId(shown[openIndex - 1].id) : undefined}
          photo={open}
          total={shown.length}
        />
      ) : null}

      {overPage && canAdd
        ? createPortal(
            <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] bg-ink/50 p-6" data-drop-overlay>
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-paper/80 text-center text-paper">
                <ImagePlus className="size-8" strokeWidth={1.5} />
                <p className="text-lg font-semibold">
                  {dropTarget ? `Drop the photos to add them to ${names.get(dropTarget) ?? "the destination"}` : "Drop the photos, then choose their destination"}
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
