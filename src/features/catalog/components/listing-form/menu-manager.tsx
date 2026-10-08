"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, EyeOff, Eye, Loader2, Pencil, Plus, Trash2, UtensilsCrossed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDeleteRecordMutation,
  useGetCatalogQuery,
  useSaveRecordMutation,
} from "@/features/catalog/api/catalog-api";
import type { SaveResult } from "@/features/catalog/form-state";
import { galleryOf, mediaPath, toFormValues, type FormValues } from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import {
  type MenuSummary,
  bySection,
  firstCourse,
  menuSummary,
  menuWords,
  sectionOf,
} from "@/features/catalog/menu";
import { DishBadge, DishCard } from "@/features/catalog/components/listing-form/dish-card";
import { DishEditor } from "@/features/catalog/components/listing-form/dish-editor";
import type { GalleryPhoto } from "@/features/catalog/components/listing-form/room-editor";
import { apiErrorMessage } from "@/store/api/api-error";

/** A dish made while the listing does not exist yet; written when the listing is saved. */
export interface DishDraft {
  readonly uid: string;
  readonly values: FormValues;
}

interface Dish {
  readonly id: string;
  readonly values: FormValues;
  readonly saved: boolean;
}

interface MenuManagerProps {
  /** Null while the listing is being created. */
  readonly foodId: string | null;
  /** RESTAURANT, STREET_FOOD…: which dishes to offer as a starting point. */
  readonly foodType: string;
  readonly currency: string;
  readonly pending: readonly DishDraft[];
  readonly onPendingChange: Dispatch<SetStateAction<DishDraft[]>>;
  /** Gallery photos waiting for a new listing to be saved; a saved one's are read here. */
  readonly pendingPhotos: readonly GalleryPhoto[];
  readonly canEdit: boolean;
  /** Told whenever the menu changes, so the form can show its price and count. */
  readonly onSummaryChange: (summary: MenuSummary) => void;
}

interface Editing {
  /** The saved dish's id, or the draft's uid; null for a new dish. */
  readonly id: string | null;
  readonly values: FormValues;
}

/**
 * A food listing's menu: each dish once, with its Khmer name, what is in it,
 * how hot it is and what it costs — listed under the course headings a diner
 * reads down.
 *
 * Starts from Cambodia's own dishes for the kind of place, or from nothing; a
 * dish can be copied and taken off the menu without being deleted. On a saved
 * listing each dish is written as it is saved; on a new one the dishes wait
 * with the form. The cheapest dish on the menu is the listing's "From" price.
 */
export function MenuManager({
  foodId,
  foodType,
  currency,
  pending,
  onPendingChange,
  pendingPhotos,
  canEdit,
  onSummaryChange,
}: MenuManagerProps) {
  const registered = getResource("food-menu-items");
  /* A new listing has no id for its dishes to name yet; it is filled in when the listing is saved. */
  const definition = useMemo(
    () =>
      foodId
        ? registered
        : { ...registered, fields: registered.fields.map((field) => (field.name === "foodId" ? { ...field, required: false } : field)) },
    [registered, foodId],
  );
  const savedRows = useGetCatalogQuery("food-menu-items", { skip: foodId === null });
  const galleryRows = useGetCatalogQuery("food-media", { skip: foodId === null });
  const [saveRecord] = useSaveRecordMutation();
  const [deleteRecord] = useDeleteRecordMutation();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /* Headings made this session that hold nothing yet; a heading with a dish in it lives on the dish. */
  const [headings, setHeadings] = useState<string[]>([]);
  const [naming, setNaming] = useState("");
  const [renaming, setRenaming] = useState<{ readonly from: string; readonly to: string } | null>(null);

  const dishes: readonly Dish[] = useMemo(
    () =>
      foodId
        ? (savedRows.data ?? [])
            .filter((row) => String(row.foodId ?? "") === foodId)
            .map((row) => ({ id: row.id, values: toFormValues(definition, row), saved: true }))
            .sort((a, b) => Number(a.values.sortOrder || 0) - Number(b.values.sortOrder || 0))
        : pending.map((draft) => ({ id: draft.uid, values: draft.values, saved: false })),
    [definition, pending, savedRows.data, foodId],
  );

  const photos: readonly GalleryPhoto[] = useMemo(
    () =>
      foodId
        ? (galleryRows.data ?? [])
            .filter((row) => String(row.ownerId ?? "") === foodId)
            .map((row) => {
              const key = String(row.mediaKey ?? "");
              return { key, url: String(row.mediaUrl ?? "") || mediaPath(key) };
            })
        : pendingPhotos,
    [galleryRows.data, pendingPhotos, foodId],
  );
  const photoUrls = useMemo(() => new Map(photos.map((photo) => [photo.key, photo.url])), [photos]);

  const summary = useMemo(() => menuSummary(dishes.map((each) => each.values)), [dishes]);
  useEffect(() => onSummaryChange(summary), [onSummaryChange, summary]);

  /* A cafe has items on a board, a restaurant dishes on a menu. */
  const words = menuWords(foodType);
  const One = words.one.charAt(0).toUpperCase() + words.one.slice(1);
  /* The course is the API's fixed heading: filled with a sensible one, never chosen. The host's heading is the category. */
  const fresh = (section = ""): FormValues => ({ ...toFormValues(definition, null), foodId: foodId ?? "", course: firstCourse(foodType), section });

  function start(section = "") {
    setNotice(null);
    setEditing({ id: null, values: fresh(section) });
  }

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

  const groups = bySection(dishes, headings);
  const sectionNames = groups.map((group) => group.section).filter(Boolean);

  function addHeading() {
    const name = naming.trim();
    setNaming("");
    if (!name || sectionNames.some((each) => each.toLowerCase() === name.toLowerCase())) return;
    setHeadings((list) => [...list, name]);
  }

  /** A heading renamed on every dish under it; the empty ones are just renamed. */
  async function renameHeading(from: string, to: string) {
    const name = to.trim();
    setRenaming(null);
    if (!name || name === from) return;
    setHeadings((list) => list.map((each) => (each === from ? name : each)));
    const under = dishes.filter((item) => sectionOf(item.values) === from);
    if (!foodId) {
      onPendingChange((list) => list.map((draft) => (sectionOf(draft.values) === from ? { uid: draft.uid, values: { ...draft.values, section: name } } : draft)));
      return;
    }
    setBusy(from);
    const failed: string[] = [];
    for (const item of under) {
      const result = await write({ ...item.values, section: name }, item.id);
      if (!result.ok) failed.push(`${String(item.values.name)}: ${result.message}`);
    }
    setBusy(null);
    setNotice(failed.length ? failed.join("; ") : `Renamed to ${name}.`);
  }

  function removeHeading(name: string) {
    setHeadings((list) => list.filter((each) => each !== name));
  }

  function copy(item: Dish) {
    setNotice(null);
    setEditing({ id: null, values: { ...item.values, name: `${String(item.values.name ?? "")} (copy)` } });
  }

  async function write(values: FormValues, id: string | null): Promise<SaveResult> {
    try {
      return await saveRecord({ resource: "food-menu-items", ...(id ? { id } : {}), values: { ...values, foodId: foodId ?? "" } }).unwrap();
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error) };
    }
  }

  async function save(values: FormValues): Promise<SaveResult> {
    const target = editing?.id ?? null;
    if (!foodId) {
      onPendingChange((list) =>
        target
          ? list.map((draft) => (draft.uid === target ? { uid: draft.uid, values } : draft))
          : [...list, { uid: crypto.randomUUID(), values: { ...values, sortOrder: String(list.length) } }],
      );
      setEditing(null);
      setNotice(target ? `${One} updated — it is saved with the listing.` : `${One} added — it is saved with the listing.`);
      return { ok: true, id: target ?? "" };
    }
    const result = await write(target ? values : { ...values, sortOrder: String(dishes.length) }, target);
    if (result.ok) {
      setEditing(null);
      setNotice(target ? `${One} saved.` : `${One} added.`);
    }
    return result;
  }

  async function remove(item: Dish) {
    setNotice(null);
    if (!item.saved) {
      onPendingChange((list) => list.filter((draft) => draft.uid !== item.id));
      return;
    }
    setBusy(item.id);
    try {
      await deleteRecord({ resource: "food-menu-items", id: item.id }).unwrap();
      setNotice(`${One} deleted.`);
    } catch (error) {
      setNotice(apiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function toggleMenu(item: Dish) {
    const values = { ...item.values, status: item.values.status === "INACTIVE" ? "ACTIVE" : "INACTIVE" };
    if (!item.saved) {
      onPendingChange((list) => list.map((draft) => (draft.uid === item.id ? { uid: draft.uid, values } : draft)));
      return;
    }
    setBusy(item.id);
    const result = await write(values, item.id);
    setBusy(null);
    setNotice(result.ok ? (values.status === "INACTIVE" ? "Taken off the menu — kept here." : "Back on the menu.") : result.message);
  }

  /* The dish is written in a dialog over the page, outside the listing's form: its own Enter and Escape, and room to work. */
  const dialog = editing
    ? createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink/40 p-3 sm:p-6" onClick={() => setEditing(null)}>
          <div
            aria-labelledby="dish-dialog-title"
            aria-modal="true"
            className="mx-auto w-full max-w-5xl rounded-xl border border-line bg-paper p-5 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-ink" id="dish-dialog-title">
                {editing.id ? `Edit ${words.one}` : `New ${words.one}`}
              </h3>
              <IconButton label="Close without saving" onClick={() => setEditing(null)}>
                <X aria-hidden className="size-4" />
              </IconButton>
            </div>
            <DishEditor
              currency={currency}
              definition={definition}
              foodType={foodType}
              words={words}
              initial={editing.values}
              isNew={editing.id === null}
              key={editing.id ?? "new"}
              onCancel={() => setEditing(null)}
              onSave={save}
              photos={photos}
              category={galleryOf(getResource("food-media"))?.category ?? "food"}
              sections={sectionNames}
            />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="flex flex-col gap-4">
      {dialog}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Menu</h3>
        <p className="text-xs text-muted tabular-nums">
          {summary.dishes} {summary.dishes === 1 ? words.one : words.many} · {summary.sections} {summary.sections === 1 ? "category" : "categories"}
        </p>
      </div>

      {/* No form of its own: this sits inside the listing's form, so Enter is caught on the box instead of saving the listing. */}
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="New category"
            className="h-9 w-56"
            maxLength={100}
            onChange={(event) => setNaming(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addHeading();
            }}
            placeholder="New category, e.g. Soups"
            value={naming}
          />
          <Button disabled={!naming.trim()} onClick={addHeading} size="sm" type="button" variant="secondary">
            <Plus aria-hidden className="size-3.5" />
            Add category
          </Button>
          <p className="text-2xs text-muted">Your own headings, in your own words. Each {words.one} is added under one, with the plus beside it.</p>
        </div>
      ) : null}

      {notice ? (
        <p aria-live="polite" className="text-xs text-muted" role="status">
          {notice}
        </p>
      ) : null}

      {foodId && savedRows.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Loading the menu…
        </p>
      ) : groups.length ? (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.section || "(none)"}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {renaming && renaming.from === group.section ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      aria-label="Category name"
                      autoFocus
                      className="h-8 w-56 text-sm"
                      maxLength={100}
                      onChange={(event) => setRenaming({ from: renaming.from, to: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setRenaming(null);
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        void renameHeading(renaming.from, renaming.to);
                      }}
                      value={renaming.to}
                    />
                    <IconButton label="Save the name" onClick={() => void renameHeading(renaming.from, renaming.to)}>
                      <Check aria-hidden className="size-3.5" />
                    </IconButton>
                    <IconButton label="Keep the old name" onClick={() => setRenaming(null)}>
                      <X aria-hidden className="size-3.5" />
                    </IconButton>
                  </div>
                ) : (
                  <h4 className="text-xs font-semibold tracking-label text-muted uppercase">{group.section || `Without a category`}</h4>
                )}
                {canEdit && !renaming ? (
                  <span className="flex items-center gap-1">
                    <IconButton label={`Add ${words.one} under ${group.section || "no category"}`} onClick={() => start(group.section)}>
                      <Plus aria-hidden className="size-3.5" />
                    </IconButton>
                    {group.section ? (
                      <IconButton label={`Rename ${group.section}`} onClick={() => setRenaming({ from: group.section, to: group.section })}>
                        {busy === group.section ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Pencil aria-hidden className="size-3.5" />}
                      </IconButton>
                    ) : null}
                    {group.section && !group.dishes.length ? (
                      <IconButton danger label={`Remove the empty category ${group.section}`} onClick={() => removeHeading(group.section)}>
                        <Trash2 aria-hidden className="size-3.5" />
                      </IconButton>
                    ) : null}
                  </span>
                ) : null}
              </div>
              {!group.dishes.length ? (
                <p className="rounded-md border border-dashed border-line-strong bg-sand px-3 py-2 text-xs text-muted">
                  Nothing under {group.section} yet. Add a {words.one} with the plus beside it.
                </p>
              ) : null}
              <ul className="flex flex-col gap-2">
                {(group.dishes as readonly Dish[]).map((item) => {
                  const keys = Array.isArray(item.values.photoKeys) ? item.values.photoKeys : [];
                  const offMenu = item.values.status === "INACTIVE";
                  return (
                    <li key={item.id}>
                      <DishCard
                        actions={
                          canEdit ? (
                            <>
                              <IconButton label="Edit" onClick={() => setEditing({ id: item.id, values: item.values })}>
                                <Pencil aria-hidden className="size-3.5" />
                              </IconButton>
                              <IconButton label={`Copy to a new ${words.one}`} onClick={() => copy(item)}>
                                <Copy aria-hidden className="size-3.5" />
                              </IconButton>
                              <IconButton label={offMenu ? "Put back on the menu" : "Take off the menu"} onClick={() => void toggleMenu(item)}>
                                {offMenu ? <Eye aria-hidden className="size-3.5" /> : <EyeOff aria-hidden className="size-3.5" />}
                              </IconButton>
                              <IconButton danger label="Delete" onClick={() => void remove(item)}>
                                {busy === item.id ? (
                                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 aria-hidden className="size-3.5" />
                                )}
                              </IconButton>
                            </>
                          ) : null
                        }
                        badge={!item.saved ? <DishBadge state="pending" /> : offMenu ? <DishBadge state="off-menu" /> : null}
                        className={offMenu ? "opacity-70" : undefined}
                        currency={currency}
                        photoUrl={keys.length ? (photoUrls.get(keys[0]) ?? mediaPath(keys[0])) : undefined}
                        values={item.values}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-line-strong bg-sand px-4 py-8 text-center">
          <UtensilsCrossed aria-hidden className="size-6 text-muted" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink">No {words.many} yet</p>
          <p className="max-w-sm text-xs text-muted">
            The menu is what travellers choose a place by. Five or six {words.many} with prices and Khmer names do more than a long list.
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

