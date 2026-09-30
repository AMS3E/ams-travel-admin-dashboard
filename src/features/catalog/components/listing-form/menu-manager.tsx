"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Copy, EyeOff, Eye, Loader2, Pencil, Plus, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  useDeleteRecordMutation,
  useGetCatalogQuery,
  useSaveRecordMutation,
} from "@/features/catalog/api/catalog-api";
import type { SaveResult } from "@/features/catalog/form-state";
import { mediaPath, toFormValues, type FormValues } from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import {
  DISH_TEMPLATES,
  byCourse,
  courseLabel,
  courseOrder,
  firstCourse,
  fromDishTemplate,
  menuSummary,
  menuWords,
  type DishTemplate,
  type MenuSummary,
  type MenuWords,
} from "@/features/catalog/menu";
import { DishBadge, DishCard } from "@/features/catalog/components/listing-form/dish-card";
import { DishEditor } from "@/features/catalog/components/listing-form/dish-editor";
import { formatMoney } from "@/features/catalog/components/listing-form/room-card";
import type { GalleryPhoto } from "@/features/catalog/components/listing-form/room-editor";
import { apiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

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
  /** What the listing says a meal costs, to sanity-check a dish's price against. */
  readonly averageMealPrice: unknown;
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
  averageMealPrice,
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
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  const templates = DISH_TEMPLATES[foodType] ?? DISH_TEMPLATES.OTHER;
  /* A cafe has items on a board, a restaurant dishes on a menu. */
  const words = menuWords(foodType);
  const One = words.one.charAt(0).toUpperCase() + words.one.slice(1);
  const Many = words.many.charAt(0).toUpperCase() + words.many.slice(1);
  const fresh = (): FormValues => ({ ...toFormValues(definition, null), foodId: foodId ?? "", course: firstCourse(foodType) });

  function start(template?: DishTemplate) {
    setNotice(null);
    setEditing({ id: null, values: template ? fromDishTemplate(fresh(), template) : fresh() });
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

  /**
   * A whole board at once: a coffee shop sells a dozen drinks, and writing
   * each one through the editor is a dozen round trips. What is ticked here is
   * added with its price; everything else about it — a photo, a description —
   * is added afterwards, on the item itself.
   */
  async function addMany(chosen: readonly { readonly template: DishTemplate; readonly price: string }[]) {
    setNotice(null);
    if (!chosen.length || adding) return;
    setAdding(true);
    const made = chosen.map(({ template, price }) => {
      const values = fromDishTemplate(fresh(), template);
      return price.trim() ? { ...values, price: price.trim() } : values;
    });
    const many = made.length === 1 ? words.one : words.many;
    if (!foodId) {
      onPendingChange((list) => [
        ...list,
        ...made.map((values, index) => ({ uid: crypto.randomUUID(), values: { ...values, sortOrder: String(list.length + index) } })),
      ]);
      setAdding(false);
      setNotice(`${made.length} ${many} added — they are saved with the listing.`);
      return;
    }
    const failed: string[] = [];
    for (const [index, values] of made.entries()) {
      const result = await write({ ...values, sortOrder: String(dishes.length + index) }, null);
      if (!result.ok) failed.push(`${String(values.name)}: ${result.message}`);
    }
    setAdding(false);
    setNotice(failed.length
      ? `${made.length - failed.length} added; ${failed.join("; ")}`
      : `${made.length} ${many} added.`);
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

  if (editing) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{editing.id ? `Edit ${words.one}` : `New ${words.one}`}</h3>
        </div>
        <DishEditor
          averageMealPrice={averageMealPrice}
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
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        <Metric label={Many} value={String(summary.dishes)} />
        <Metric label={words.sections} value={String(summary.courses)} />
        <Metric label={`Signature ${words.many}`} value={String(summary.signature)} />
        <Metric label={`Cheapest ${words.one}`} value={summary.fromPrice !== null ? formatMoney(summary.fromPrice, currency) : "—"} />
      </dl>

      {canEdit ? (
        <QuickAdd
          adding={adding}
          currency={currency}
          foodType={foodType}
          onAdd={addMany}
          onBlank={() => start()}
          templates={templates}
          words={words}
        />
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
      ) : dishes.length ? (
        <div className="flex flex-col gap-5">
          {byCourse(dishes, foodType).map((group) => (
            <section key={group.course}>
              <h4 className="mb-2 text-xs font-semibold tracking-label text-muted uppercase">{group.label}</h4>
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

/**
 * The board this kind of place usually sells: tick what is on it, write each
 * price, and they all go on the menu together. A coffee shop is the reason it
 * exists — its board is a dozen drinks, and each one used to be a form.
 */
function QuickAdd({ templates, words, currency, foodType, adding, onAdd, onBlank }: {
  readonly templates: readonly DishTemplate[];
  readonly words: MenuWords;
  readonly currency: string;
  readonly foodType: string;
  readonly adding: boolean;
  readonly onAdd: (chosen: readonly { readonly template: DishTemplate; readonly price: string }[]) => void;
  readonly onBlank: () => void;
}) {
  /* Ticked items, each with the price typed beside it. */
  const [picked, setPicked] = useState<Record<string, string>>({});
  const chosen = Object.keys(picked);
  const groups = courseOrder(foodType).flatMap((course) => {
    const under = templates.filter((template) => (typeof template.values.course === "string" ? template.values.course : "MAIN") === course);
    return under.length ? [{ course, label: courseLabel(course), under }] : [];
  });

  function toggle(id: string, on: boolean) {
    setPicked((current) => {
      const next = { ...current };
      if (on) next[id] = next[id] ?? "";
      else delete next[id];
      return next;
    });
  }

  return (
    <section aria-labelledby="quick-add" className="rounded-lg border border-line">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft" id="quick-add">
          <Sparkles aria-hidden className="size-3.5 text-muted" />
          What this kind of place usually sells — tick yours, write the price, add them together
        </p>
        <span className="text-xs text-muted tabular-nums">{chosen.length} ticked</span>
      </header>

      <div className="flex flex-col gap-3 p-3">
        {groups.map((group) => (
          <div key={group.course}>
            <h4 className="mb-1.5 text-2xs font-semibold text-muted">{group.label}</h4>
            <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {group.under.map((template) => {
                const on = template.id in picked;
                const local = typeof template.values.localName === "string" ? template.values.localName : "";
                return (
                  <li
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors",
                      on ? "border-teal bg-teal-soft/40" : "border-line",
                    )}
                    key={template.id}
                  >
                    <Checkbox
                      checked={on}
                      id={`pick-${template.id}`}
                      onChange={(event) => toggle(template.id, event.target.checked)}
                    />
                    <label className="min-w-0 flex-1 cursor-pointer" htmlFor={`pick-${template.id}`}>
                      <span className="block truncate text-sm text-ink">{template.title}</span>
                      {local ? <span className="block truncate text-2xs text-muted">{local}</span> : null}
                    </label>
                    <Input
                      aria-label={`Price for ${template.title}`}
                      className="h-7 w-20 text-sm"
                      inputMode="decimal"
                      onChange={(event) => setPicked((current) => ({ ...current, [template.id]: event.target.value }))}
                      placeholder={currency}
                      value={picked[template.id] ?? ""}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
        <Button
          disabled={!chosen.length || adding}
          onClick={() => {
            onAdd(chosen.flatMap((id) => {
              const template = templates.find((each) => each.id === id);
              return template ? [{ template, price: picked[id] ?? "" }] : [];
            }));
            setPicked({});
          }}
          size="sm"
          type="button"
        >
          {adding ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Plus aria-hidden className="size-3.5" />}
          Add {chosen.length ? `${chosen.length} ` : ""}{chosen.length === 1 ? words.one : words.many}
        </Button>
        <Button onClick={onBlank} size="sm" type="button" variant="ghost">
          <Plus aria-hidden className="size-3.5" />
          Something else
        </Button>
        <p className="text-2xs text-muted">A photo, what is in it and how spicy it is are added on the {words.one} itself.</p>
      </footer>
    </section>
  );
}
