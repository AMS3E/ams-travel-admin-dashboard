"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { BedDouble, Copy, EyeOff, Eye, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  useDeleteRecordMutation,
  useGetCatalogQuery,
  useSaveRecordMutation,
} from "@/features/catalog/api/catalog-api";
import type { SaveResult } from "@/features/catalog/form-state";
import { galleryOf, mediaPath, toFormValues, type FormValues } from "@/features/catalog/resource";
import { roomSummary, withBedsFor, type RoomSummary } from "@/features/catalog/rooms";
import { useResource } from "@/features/catalog/use-resource";
import { RoomBadge, RoomCard } from "@/features/catalog/components/listing-form/room-card";
import { amenityLabels, offeredAmenities } from "@/features/catalog/amenities";
import type { ReferenceOption } from "@/features/catalog/resource";
import { RoomEditor, type GalleryPhoto } from "@/features/catalog/components/listing-form/room-editor";
import { useApiErrorMessage } from "@/store/api/api-error";

/** A room made while the stay does not exist yet; written when the stay is saved. */
export interface RoomDraft {
  readonly uid: string;
  readonly values: FormValues;
}

interface Room {
  readonly id: string;
  readonly values: FormValues;
  readonly saved: boolean;
}

interface RoomsManagerProps {
  /** Null while the stay is being created. */
  readonly stayId: string | null;
  /** The amenities taxonomy, as the stay form loaded it. */
  readonly amenities: readonly ReferenceOption[];
  readonly currency: string;
  readonly pending: readonly RoomDraft[];
  readonly onPendingChange: Dispatch<SetStateAction<RoomDraft[]>>;
  /** Gallery photos waiting for a new stay to be saved; a saved stay's are read here. */
  readonly pendingPhotos: readonly GalleryPhoto[];
  readonly canEdit: boolean;
  /** Told whenever the rooms change, so the form can show their price and count. */
  readonly onSummaryChange: (summary: RoomSummary) => void;
}

interface Editing {
  /** The saved room's id, or the draft's uid; null for a new room. */
  readonly id: string | null;
  readonly values: FormValues;
}

/**
 * A stay's rooms: every kind once, with who it sleeps, its beds, what it has
 * and what a night costs.
 *
 * Each room is written in a dialog over the page; a room can be copied to
 * make the next one like it, and made unavailable without being deleted. On a saved stay each room is written as it is saved; on a new one
 * the rooms wait with the form and are written with the stay. The cheapest room
 * on sale is the stay's "From" price.
 */
export function RoomsManager({
  amenities,
  stayId,
  currency,
  pending,
  onPendingChange,
  pendingPhotos,
  canEdit,
  onSummaryChange,
}: RoomsManagerProps) {
  const t = useTranslations("forms.rooms.manager");
  const words = useTranslations("forms.rooms.words");
  const actions = useTranslations("forms.actions");
  const errorMessage = useApiErrorMessage();
  const roomAmenities = useMemo(() => offeredAmenities(amenities, "ROOM"), [amenities]);
  const labels = useMemo(() => amenityLabels(amenities), [amenities]);
  const registered = useResource("stay-rooms");
  const stayMedia = useResource("stay-media");
  /* A new stay has no id for its rooms to name yet; it is filled in when the stay is saved. */
  const definition = useMemo(
    () =>
      stayId
        ? registered
        : { ...registered, fields: registered.fields.map((field) => (field.name === "stayId" ? { ...field, required: false } : field)) },
    [registered, stayId],
  );
  const savedRows = useGetCatalogQuery("stay-rooms", { skip: stayId === null });
  const galleryRows = useGetCatalogQuery("stay-media", { skip: stayId === null });
  const [saveRecord] = useSaveRecordMutation();
  const [deleteRecord] = useDeleteRecordMutation();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rooms: readonly Room[] = useMemo(
    () =>
      stayId
        ? (savedRows.data ?? [])
            .filter((row) => String(row.stayId ?? "") === stayId)
            .map((row) => ({ id: row.id, values: toFormValues(definition, row), saved: true }))
            .sort((a, b) => Number(a.values.sortOrder || 0) - Number(b.values.sortOrder || 0))
        : pending.map((draft) => ({ id: draft.uid, values: draft.values, saved: false })),
    [definition, pending, savedRows.data, stayId],
  );

  const photos: readonly GalleryPhoto[] = useMemo(
    () =>
      stayId
        ? (galleryRows.data ?? [])
            .filter((row) => String(row.ownerId ?? "") === stayId)
            .map((row) => {
              const key = String(row.mediaKey ?? "");
              return { key, url: String(row.mediaUrl ?? "") || mediaPath(key) };
            })
        : pendingPhotos,
    [galleryRows.data, pendingPhotos, stayId],
  );
  const photoUrls = useMemo(() => new Map(photos.map((photo) => [photo.key, photo.url])), [photos]);

  const summary = useMemo(() => roomSummary(rooms.map((room) => room.values)), [rooms]);
  useEffect(() => onSummaryChange(summary), [onSummaryChange, summary]);

  const fresh = (): FormValues => ({ ...toFormValues(definition, null), stayId: stayId ?? "" });

  /* A new room starts as a double with nothing else filled in. */
  function start() {
    setNotice(null);
    setEditing({ id: null, values: { ...withBedsFor(fresh(), "DOUBLE"), name: "" } });
  }

  function copy(room: Room) {
    setNotice(null);
    setEditing({ id: null, values: { ...room.values, name: t("copyName", { name: String(room.values.name ?? "") }) } });
  }

  /* Escape closes the dialog; the page behind stays put. */
  useEffect(() => {
    if (!editing) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditing(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [editing]);

  async function write(values: FormValues, id: string | null): Promise<SaveResult> {
    try {
      return await saveRecord({ resource: "stay-rooms", ...(id ? { id } : {}), values: { ...values, stayId: stayId ?? "" } }).unwrap();
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  }

  async function save(values: FormValues): Promise<SaveResult> {
    const target = editing?.id ?? null;
    if (!stayId) {
      onPendingChange((list) =>
        target
          ? list.map((draft) => (draft.uid === target ? { uid: draft.uid, values } : draft))
          : [...list, { uid: crypto.randomUUID(), values: { ...values, sortOrder: String(list.length) } }],
      );
      setEditing(null);
      setNotice(target ? t("notices.updatedDraft") : t("notices.addedDraft"));
      return { ok: true, id: target ?? "" };
    }
    const result = await write(target ? values : { ...values, sortOrder: String(rooms.length) }, target);
    if (result.ok) {
      setEditing(null);
      setNotice(target ? t("notices.saved") : t("notices.added"));
    }
    return result;
  }

  async function remove(room: Room) {
    setNotice(null);
    if (!room.saved) {
      onPendingChange((list) => list.filter((draft) => draft.uid !== room.id));
      return;
    }
    setBusy(room.id);
    try {
      await deleteRecord({ resource: "stay-rooms", id: room.id }).unwrap();
      setNotice(t("notices.deleted"));
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function toggleSale(room: Room) {
    const values = { ...room.values, status: room.values.status === "INACTIVE" ? "ACTIVE" : "INACTIVE" };
    if (!room.saved) {
      onPendingChange((list) => list.map((draft) => (draft.uid === room.id ? { uid: draft.uid, values } : draft)));
      return;
    }
    setBusy(room.id);
    const result = await write(values, room.id);
    setBusy(null);
    if (result.ok) setNotice(values.status === "INACTIVE" ? t("notices.unavailable") : t("notices.available"));
    else setNotice(result.message);
  }

  /* The room is written in a dialog over the page, outside the listing's form: its own Enter and Escape, and room to work. */
  const dialog = editing
    ? createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink/40 p-3 sm:p-6" onClick={() => setEditing(null)}>
          <div
            aria-labelledby="room-dialog-title"
            aria-modal="true"
            className="mx-auto w-full max-w-5xl rounded-xl border border-line bg-paper p-5 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-ink" id="room-dialog-title">
                {editing.id ? words("edit") : words("fresh")}
              </h3>
              <IconButton label={t("closeUnsaved")} onClick={() => setEditing(null)}>
                <X aria-hidden className="size-4" />
              </IconButton>
            </div>
            <RoomEditor
              amenityOptions={roomAmenities}
              currency={currency}
              definition={definition}
              initial={editing.values}
              isNew={editing.id === null}
              key={editing.id ?? "new"}
              onCancel={() => setEditing(null)}
              onSave={save}
              photos={photos}
              category={galleryOf(stayMedia)?.category ?? "stay"}
            />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="flex flex-col gap-4">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{t("title")}</h3>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted tabular-nums">{t("count", { count: summary.types })}</p>
          {canEdit ? (
            <Button onClick={start} size="sm" type="button" variant="secondary">
              <Plus aria-hidden className="size-3.5" />
              {words("add")}
            </Button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <p aria-live="polite" className="text-xs text-muted" role="status">
          {notice}
        </p>
      ) : null}

      {stayId && savedRows.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          {t("loading")}
        </p>
      ) : rooms.length ? (
        <ul className="flex flex-col gap-2">
          {rooms.map((room) => {
            const keys = Array.isArray(room.values.photoKeys) ? room.values.photoKeys : [];
            const offSale = room.values.status === "INACTIVE";
            return (
              <li key={room.id}>
                <RoomCard
                  amenityLabels={labels}
                  actions={
                    canEdit ? (
                      <>
                        <IconButton label={actions("edit")} onClick={() => setEditing({ id: room.id, values: room.values })}>
                          <Pencil aria-hidden className="size-3.5" />
                        </IconButton>
                        <IconButton label={words("copy")} onClick={() => copy(room)}>
                          <Copy aria-hidden className="size-3.5" />
                        </IconButton>
                        <IconButton label={offSale ? t("makeAvailable") : t("makeUnavailable")} onClick={() => void toggleSale(room)}>
                          {offSale ? <Eye aria-hidden className="size-3.5" /> : <EyeOff aria-hidden className="size-3.5" />}
                        </IconButton>
                        <IconButton danger label={actions("delete")} onClick={() => void remove(room)}>
                          {busy === room.id ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Trash2 aria-hidden className="size-3.5" />}
                        </IconButton>
                      </>
                    ) : null
                  }
                  badge={!room.saved ? <RoomBadge state="pending" /> : offSale ? <RoomBadge state="off-sale" /> : null}
                  className={offSale ? "opacity-70" : undefined}
                  currency={currency}
                  photoUrl={keys.length ? (photoUrls.get(keys[0]) ?? mediaPath(keys[0])) : undefined}
                  values={room.values}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-line-strong bg-sand px-4 py-8 text-center">
          <BedDouble aria-hidden className="size-6 text-muted" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink">{words("none")}</p>
          <p className="max-w-sm text-xs text-muted">
            {words("noneHint")}
          </p>
        </div>
      )}
    </div>
  );
}


function IconButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly danger?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <Button
      aria-label={label}
      className={danger ? "text-muted hover:bg-heritage-soft hover:text-heritage" : "text-muted hover:text-ink"}
      onClick={onClick}
      size="icon-sm"
      title={label}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
