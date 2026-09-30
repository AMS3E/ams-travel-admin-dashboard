"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { BedDouble, Copy, EyeOff, Eye, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDeleteRecordMutation,
  useGetCatalogQuery,
  useSaveRecordMutation,
} from "@/features/catalog/api/catalog-api";
import type { SaveResult } from "@/features/catalog/form-state";
import { mediaPath, toFormValues, type FormValues } from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import {
  ROOM_TEMPLATES,
  fromTemplate,
  roomSummary,
  roomWords,
  withBedsFor,
  type RoomGrade,
  type RoomSummary,
  type RoomTemplate,
} from "@/features/catalog/rooms";
import { RoomBadge, RoomCard, formatMoney } from "@/features/catalog/components/listing-form/room-card";
import { RoomEditor, type GalleryPhoto } from "@/features/catalog/components/listing-form/room-editor";
import { apiErrorMessage } from "@/store/api/api-error";

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
  /** HOTEL, HOSTEL…: which templates to offer. */
  readonly stayType: string;
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
  readonly grade: RoomGrade;
}

/**
 * A stay's rooms: every kind once, with who it sleeps, its beds, what it has
 * and what a night costs.
 *
 * Starts from a template for the property's type, or from nothing; a room can
 * be copied to make the next one like it, and taken off sale without being
 * deleted. On a saved stay each room is written as it is saved; on a new one
 * the rooms wait with the form and are written with the stay. The cheapest room
 * on sale is the stay's "From" price.
 */
export function RoomsManager({
  stayId,
  stayType,
  currency,
  pending,
  onPendingChange,
  pendingPhotos,
  canEdit,
  onSummaryChange,
}: RoomsManagerProps) {
  const registered = getResource("stay-rooms");
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

  const templates = ROOM_TEMPLATES[stayType] ?? ROOM_TEMPLATES.OTHER;
  /* A hostel lets dorms and rooms, a villa itself: the step says so. */
  const words = roomWords(stayType);
  const fresh = (): FormValues => ({ ...toFormValues(definition, null), stayId: stayId ?? "" });

  function start(template?: RoomTemplate) {
    setNotice(null);
    setEditing(
      template
        ? { id: null, values: fromTemplate(fresh(), template), grade: template.grade }
        : { id: null, values: { ...withBedsFor(fresh(), "DOUBLE"), name: "" }, grade: "" },
    );
  }

  function copy(room: Room) {
    setNotice(null);
    setEditing({ id: null, values: { ...room.values, name: `${String(room.values.name ?? "")} (copy)` }, grade: "" });
  }

  async function write(values: FormValues, id: string | null): Promise<SaveResult> {
    try {
      return await saveRecord({ resource: "stay-rooms", ...(id ? { id } : {}), values: { ...values, stayId: stayId ?? "" } }).unwrap();
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) };
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
      setNotice(target ? "Room updated — it is saved with the stay." : "Room added — it is saved with the stay.");
      return { ok: true, id: target ?? "" };
    }
    const result = await write(target ? values : { ...values, sortOrder: String(rooms.length) }, target);
    if (result.ok) {
      setEditing(null);
      setNotice(target ? "Room saved." : "Room added.");
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
      setNotice("Room deleted.");
    } catch (error) {
      setNotice(apiErrorMessage(error));
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
    setNotice(result.ok ? (values.status === "INACTIVE" ? "Hidden from guests." : "Shown to guests again.") : result.message);
  }

  if (editing) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{editing.id ? words.edit : words.fresh}</h3>
        </div>
        <RoomEditor
          currency={currency}
          definition={definition}
          initial={editing.values}
          initialGrade={editing.grade}
          isNew={editing.id === null}
          key={editing.id ?? "new"}
          onCancel={() => setEditing(null)}
          onSave={save}
          photos={photos}
          words={words}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        <Metric label={words.kinds} value={String(summary.types)} />
        <Metric label={words.total} value={String(summary.rooms)} />
        <Metric label={words.biggest} value={summary.guests ? String(summary.guests) : "—"} />
        <Metric label={words.cheapest} value={summary.fromPrice !== null ? formatMoney(summary.fromPrice, currency) : "—"} />
      </dl>

      {canEdit ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Sparkles aria-hidden className="size-3.5" />
            Start from a template — then change anything
          </p>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((template) => (
              <Button key={template.id} onClick={() => start(template)} size="sm" type="button" variant="secondary">
                <Plus aria-hidden className="size-3.5" />
                {template.title}
              </Button>
            ))}
            <Button onClick={() => start()} size="sm" type="button" variant="ghost">
              <Plus aria-hidden className="size-3.5" />
              {words.blank}
            </Button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p aria-live="polite" className="text-xs text-muted" role="status">
          {notice}
        </p>
      ) : null}

      {stayId && savedRows.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Loading rooms…
        </p>
      ) : rooms.length ? (
        <ul className="flex flex-col gap-2">
          {rooms.map((room) => {
            const keys = Array.isArray(room.values.photoKeys) ? room.values.photoKeys : [];
            const offSale = room.values.status === "INACTIVE";
            return (
              <li key={room.id}>
                <RoomCard
                  actions={
                    canEdit ? (
                      <>
                        <IconButton label="Edit" onClick={() => setEditing({ id: room.id, values: room.values, grade: "" })}>
                          <Pencil aria-hidden className="size-3.5" />
                        </IconButton>
                        <IconButton label={words.copy} onClick={() => copy(room)}>
                          <Copy aria-hidden className="size-3.5" />
                        </IconButton>
                        <IconButton label={offSale ? "Show to guests again" : "Hide from guests"} onClick={() => void toggleSale(room)}>
                          {offSale ? <Eye aria-hidden className="size-3.5" /> : <EyeOff aria-hidden className="size-3.5" />}
                        </IconButton>
                        <IconButton danger label="Delete" onClick={() => void remove(room)}>
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
          <p className="text-sm font-medium text-ink">{words.none}</p>
          <p className="max-w-sm text-xs text-muted">
            {words.noneHint}
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="bg-paper px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-base font-semibold text-ink tabular-nums">{value}</dd>
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
