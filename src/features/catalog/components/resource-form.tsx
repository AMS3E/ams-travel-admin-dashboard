"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch, type Resolver } from "react-hook-form";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  useSaveRecordMutation,
  useDeleteRecordMutation,
  useGetReferenceOptionsQuery,
  useGetCatalogQuery,
} from "@/features/catalog/api/catalog-api";
import { apiErrorMessage } from "@/store/api/api-error";
import { CoveragePreview } from "@/features/heritage/components/coverage-preview";
import { InterestPreview } from "@/features/catalog/components/interest-preview";
import { spotIndex, type SpotContext } from "@/features/catalog/components/fields/spot-list";
import { listPageOf } from "@/features/catalog/all-destinations";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import {
  FieldControl,
  StatusControl,
  type SiblingGroup,
} from "@/features/catalog/components/fields/field-control";
import {
  isShown,
  resourceSchema,
  statusChoices,
  statusOption,
  statusValueOf,
  toFormValues,
  type FormValues,
  type ReferenceOptions,
  type ResourceDefinition,
  type ResourceField,
} from "@/features/catalog/resource";

interface ResourceFormProps {
  readonly definition: ResourceDefinition;
  /** `null` when creating. */
  readonly record: CatalogRecord | null;
  readonly referenceOptions: ReferenceOptions;
  /**
   * What the signed-in role may do to this row, mirrored from the API. A
   * partner may save a listing it owns; publishing and deleting it are somebody
   * else's job, so those controls are absent rather than refused.
   */
  readonly canDelete?: boolean;
  readonly canEdit?: boolean;
  readonly canSetStatus?: boolean;
  /** Creating: the new row may go live at once, and the form offers Published or Draft. */
  readonly canPublishOnCreate?: boolean;
  /** Where a save goes; `{id}` becomes the saved row's id — a new corridor opens its itinerary. */
  readonly afterSaveHref?: string;
  /** Values a new row starts with beyond its declared defaults — the destination a timeline entry is added from. */
  readonly presets?: Readonly<FormValues>;
  /** Where Cancel goes, when not the list. */
  readonly cancelHref?: string;
}

interface Section {
  readonly title: string;
  readonly fields: readonly ResourceField[];
}

/** Fields keep their declared order; a section starts where its first field is. */
function sectionsOf(definition: ResourceDefinition): readonly Section[] {
  const sections: Section[] = [];

  for (const field of definition.fields) {
    /* Worked out or fixed, never asked: it travels in the body as it is. */
    if (field.derived) continue;
    const title = field.section ?? "";
    const last = sections.at(-1);

    if (last?.title === title) {
      (last.fields as ResourceField[]).push(field);
    } else {
      sections.push({ title, fields: [field] });
    }
  }

  return sections;
}

export function ResourceForm({
  definition,
  record,
  referenceOptions,
  canDelete = true,
  canEdit = true,
  canSetStatus = true,
  canPublishOnCreate = false,
  afterSaveHref,
  presets,
  cancelHref,
}: ResourceFormProps) {
  const router = useRouter();
  const [saveRecord] = useSaveRecordMutation();
  const [deleteRecord] = useDeleteRecordMutation();
  const { data: liveOptions } = useGetReferenceOptionsQuery({
    resource: definition.key,
    include: "fields",
  });
  const listHref = listPageOf(definition.key);
  const editing = record != null;
  const status = definition.status;
  const currentStatus = statusOption(definition, statusValueOf(definition, record));
  const initialStatus = status ? statusOption(definition, status.initial) : undefined;

  /** Mutations invalidate RTK Query tags before returning to the list. */
  function returnToList() {
    router.push(listHref);
    router.refresh();
  }

  const [banner, setBanner] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  const schema = useMemo(() => resourceSchema(definition), [definition]);
  const sections = useMemo(() => sectionsOf(definition), [definition]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: { ...toFormValues(definition, record), ...(record ? {} : presets) },
  });

  /*
   * What already belongs to the region, zone or group chosen — the categories
   * Ancient Capitals has — so the same one is not made twice.
   */
  const needsSiblings = definition.fields.some((field) => field.siblings || field.placeAmong);
  const { data: rows } = useGetCatalogQuery(definition.key, { skip: !needsSiblings });
  const watched = useWatch({ control: form.control }) as FormValues;
  const options = liveOptions ?? referenceOptions;
  /** Rows in their list's order when it has one (a region's capitals), else A to Z; blank titles left out. */
  function inOrder(list: readonly CatalogRecord[]): CatalogRecord[] {
    const order = definition.orderField;
    return list
      .filter((row) => String(row[definition.titleField] ?? "").trim())
      .toSorted((a, b) =>
        order
          ? Number(a[order] ?? 0) - Number(b[order] ?? 0)
          : String(a[definition.titleField]).localeCompare(String(b[definition.titleField]), "en", { sensitivity: "base" }),
      );
  }

  /* For `placeAmong`: the other rows of the same list, top to bottom — undefined until the list is chosen. */
  function othersOf(field: ResourceField): CatalogRecord[] | undefined {
    if (!field.placeAmong || !rows) return undefined;
    /* "*": the whole list is one sequence. */
    const every = field.placeAmong === "*";
    const parent = every ? "*" : watched[field.placeAmong];
    if (typeof parent !== "string" || !parent) return undefined;
    return inOrder(rows.filter((row) => row.id !== record?.id && (every || String(row[field.placeAmong!] ?? "") === parent)));
  }

  function placesOf(field: ResourceField): readonly string[] | undefined {
    return othersOf(field)?.map((row) => String(row[definition.titleField]).trim());
  }

  const text = (name: string) => (typeof watched[name] === "string" ? String(watched[name]).trim() : "");
  /* The form's icon field, when it has one: an interest's. */
  const iconField = definition.fields.find((field) => field.iconPicker)?.name;

  /** For `spots`: the row being placed and the icons of the others, as the list shows them. */
  function spotOf(field: ResourceField): SpotContext | undefined {
    if (!field.spots) return undefined;
    const title = text(definition.titleField);
    return {
      title,
      iconKey: iconField ? text(iconField) : undefined,
      icons: iconField ? othersOf(field)?.map((row) => String(row[iconField] ?? "")) : undefined,
      clash: title ? placesOf(field)?.find((place) => place.toLowerCase() === title.toLowerCase()) : undefined,
    };
  }

  /** An interest as the website will show it, from what the form holds now. */
  function interestPreview() {
    const placeField = definition.fields.find((field) => field.placeAmong);
    const others = (placeField ? othersOf(placeField) : undefined) ?? [];
    return {
      group: placeField?.placeAmong ? text(placeField.placeAmong) : "",
      others: others.map((row) => ({ name: String(row[definition.titleField]).trim(), iconKey: iconField ? String(row[iconField] ?? "") : "" })),
      position: spotIndex(placeField ? watched[placeField.name] : "", others.length),
      name: text(definition.titleField),
      iconKey: iconField ? text(iconField) : "",
      description: text("description"),
      editing,
    };
  }

  /** A capital as its region's page will show it: its number, words, era and the site it opens. */
  function coveragePreview() {
    const placeField = definition.fields.find((field) => field.placeAmong);
    const others = (placeField ? placesOf(placeField) : undefined) ?? [];
    const place = placeField ? text(placeField.name) : "";
    const labelOf = (ref: string, value: string) => (options[ref as keyof typeof options] ?? []).find((option) => option.value === value)?.label;
    return {
      position: place === "" ? (editing && record ? Number(record.sortOrder ?? 0) + 1 : others.length + 1) : Number(place) + 1,
      title: text("title"),
      titleKm: text("titleKm"),
      dateRange: text("dateRange"),
      periodName: labelOf("historical-periods", text("historicalPeriodId")),
      description: text("description"),
      siteName: labelOf("ancient-sites", text("destinationId")),
    };
  }

  function siblingsOf(field: ResourceField): readonly SiblingGroup[] | undefined {
    if (!field.siblings || !rows) return undefined;
    const typedName = String(watched[definition.titleField] ?? "").trim().toLowerCase();
    /* On the name itself: every row there already is — the kings, the periods. */
    if (field.kind === "text") {
      const names = rows
        .filter((row) => row.id !== record?.id)
        .map((row) => String(row[definition.titleField] ?? "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
      return [{ label: "", names, noun: definition.siblingNoun ?? definition.labelPlural.toLowerCase(), one: definition.label.toLowerCase(), clash: typedName ? names.find((name) => name.toLowerCase() === typedName) : undefined }];
    }
    const value = watched[field.name];
    const chosen = Array.isArray(value) ? value.map(String) : typeof value === "string" && value ? [value] : [];
    const choices = field.ref ? (options[field.ref] ?? []) : (field.options ?? []);
    const typed = String(watched[definition.titleField] ?? "").trim().toLowerCase();
    return chosen.map((each) => {
      const titles = inOrder(
        rows
          .filter((row) => row.id !== record?.id)
          .filter((row) => {
            const linked = row[field.name];
            return Array.isArray(linked) ? linked.map(String).includes(each) : String(linked ?? "") === each;
          }),
      ).map((row) => String(row[definition.titleField] ?? "").trim());
      /* A list with an order reads as it will on the page, numbered. */
      const names = definition.orderField ? titles.map((title, index) => `${index + 1}. ${title}`) : titles;
      const clash = typed ? titles.findIndex((title) => title.toLowerCase() === typed) : -1;
      return {
        label: choices.find((option) => option.value === each)?.label ?? "This one",
        names,
        noun: definition.siblingNoun ?? definition.labelPlural.toLowerCase(), one: definition.label.toLowerCase(),
        clash: clash >= 0 ? names[clash] : undefined,
      };
    });
  }

  const submit = form.handleSubmit(async (values) => {
    if (!canEdit) return;
    setBanner(null);

    let result;
    try {
      result = await saveRecord({
        resource: definition.key,
        ...(editing ? { id: record.id } : {}),
        values,
      }).unwrap();
    } catch (error) {
      setBanner(apiErrorMessage(error));
      return;
    }

    if (result.ok) {
      router.push(afterSaveHref ? afterSaveHref.replace("{id}", result.id) : listHref);
      router.refresh();
      return;
    }

    for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
      form.setError(name, { message });
    }
    setBanner(result.message);
  });

  function destroy() {
    setBanner(null);
    setConfirmingDelete(false);

    startDelete(async () => {
      try {
        await deleteRecord({
          resource: definition.key,
          id: record!.id,
        }).unwrap();
        returnToList();
      } catch (error) {
        setBanner(apiErrorMessage(error));
      }
    });
  }

  const saving = form.formState.isSubmitting;

  return (
    <FormProvider {...form}>
      <form className="flex flex-col gap-3" noValidate onSubmit={submit}>
        {!canEdit ? (
          <p
            className="rounded-lg border border-line bg-sand px-3 py-2.5 text-sm text-ink-soft"
            role="status"
          >
            This record is read-only for your account. Contributors can edit
            their own unpublished drafts.
          </p>
        ) : null}
        {banner ? (
          <p
            className="flex items-start gap-2.5 rounded-lg border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-sm text-heritage"
            role="alert"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {banner}
          </p>
        ) : null}

        {/* An interest's preview stands beside the form; every other form is one column. */}
        <div className={definition.preview === "interest" ? "grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]" : "contents"}>
          <div className="panel divide-y divide-line">
            {sections.map((section) => (
              <section className="px-4 py-4" key={section.title || "main"}>
                {section.title ? (
                  <h2 className="mb-3 text-sm font-semibold text-ink">{section.title}</h2>
                ) : null}

                <fieldset
                  disabled={!canEdit}
                  className="grid gap-x-4 gap-y-4 md:grid-cols-2"
                >
                  {section.fields.filter((field) => isShown(field, watched, options)).map((field) => (
                    <FieldControl
                      field={field}
                      key={field.name}
                      locked={editing && field.createOnly === true}
                      options={(field.ref ? options[field.ref] : undefined) ?? []}
                      siblings={siblingsOf(field)}
                      places={placesOf(field)}
                      editing={editing}
                      spot={spotOf(field)}
                    />
                  ))}
                </fieldset>
              </section>
            ))}

            {definition.preview === "coverage" ? (
              <section className="px-4 py-4">
                <CoveragePreview {...coveragePreview()} />
              </section>
            ) : null}

            {status ? (
              <section className="px-4 py-4">
                <h2 className="mb-3 text-sm font-semibold text-ink">Publication</h2>
                {!canEdit ? (
                  <p className="text-sm text-muted">
                    An editor manages publication and changes to this{" "}
                    {definition.label.toLowerCase()}.
                  </p>
                ) : !canSetStatus ? (
                  <p className="text-sm text-muted">
                    {editing ? `Currently ${currentStatus?.label.toLowerCase() ?? "unknown"}. ` : ""}
                    Whether this is on the public site is decided by a reviewer, not
                    here.{definition.key === "destinations" ? " Submit it from the publishing screen when it is ready." : ""}
                  </p>
                ) : editing ? (
                  <div className="md:max-w-sm">
                    <StatusControl options={statusChoices(definition, statusValueOf(definition, record))} />
                  </div>
                ) : canPublishOnCreate ? (
                  <div className="flex flex-col gap-1.5 md:max-w-sm">
                    {/* A new row is either live or a draft; archiving is for one that has been live. */}
                    <StatusControl
                      options={statusChoices(definition, null).filter(
                        (option) => option.value === status.live || option.value === status.initial,
                      )}
                    />
                    <p className="text-xs text-muted">
                      Published goes on the public site as soon as it is created, with no
                      approval step. Choose Draft to finish it first.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    New {definition.labelPlural.toLowerCase()} are created as{" "}
                    {initialStatus?.label.toLowerCase() ?? "drafts"}. You can change
                    that once it exists.
                  </p>
                )}
              </section>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl bg-sand px-4 py-3">
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <Button disabled={saving} size="sm" type="submit">
                    {saving ? (
                      <Loader2 aria-hidden className="size-3.5 animate-spin" />
                    ) : null}
                    {saving
                      ? "Saving…"
                      : editing
                        ? "Save changes"
                        : `Create ${definition.label.toLowerCase()}`}
                  </Button>
                ) : null}

                <Link
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  href={cancelHref ?? listHref}
                >
                  Cancel
                </Link>
              </div>

              {editing && canDelete ? (
                confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Delete permanently?</span>
                    <Button
                      disabled={deleting}
                      onClick={destroy}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      Yes, delete
                    </Button>
                    <Button
                      onClick={() => setConfirmingDelete(false)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Keep it
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="text-heritage hover:bg-heritage-soft hover:text-heritage"
                    disabled={deleting}
                    onClick={() => setConfirmingDelete(true)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                    Delete
                  </Button>
                )
              ) : null}
            </div>
          </div>
          {definition.preview === "interest" ? (
            <aside className="panel px-4 py-4 lg:sticky lg:top-4">
              <InterestPreview {...interestPreview()} />
            </aside>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}
