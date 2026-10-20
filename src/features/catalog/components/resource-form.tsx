"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch, type Resolver } from "react-hook-form";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/toolbar";
import { LOCALE_NAMES } from "@/i18n/config";
import {
  useSaveRecordMutation,
  useDeleteRecordMutation,
  useGetReferenceOptionsQuery,
  useGetCatalogQuery,
} from "@/features/catalog/api/catalog-api";
import { useApiErrorMessage } from "@/store/api/api-error";
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
  khmerTwins,
  mediaPath,
  missingKhmer,
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

  const declared = new Set(definition.fields.map((field) => field.name));
  for (const field of definition.fields) {
    /* Worked out or fixed, never asked: it travels in the body as it is. */
    if (field.derived) continue;
    /* A Khmer twin takes its English field's place when the form is switched to Khmer. */
    if (field.khmerOf && declared.has(field.khmerOf)) continue;
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
  const t = useTranslations("forms.resourceForm");
  const actions = useTranslations("forms.actions");
  const languageWords = useTranslations("forms.listing.language");
  const errorMessage = useApiErrorMessage();
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
  /* The language the text boxes are written in, as on a listing's form: each Khmer twin takes its English field's place. */
  const twins = useMemo(() => khmerTwins(definition), [definition]);
  const [language, setLanguage] = useState<"en" | "km">("en");

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
  const khmerMissing = twins.size ? missingKhmer(definition, watched) : [];

  /** Puts the text boxes in the language the problems are in, so the field marked is on the page. */
  function showLanguageOf(names: readonly string[]) {
    if (!twins.size) return;
    const khmer = names.some((name) => definition.fields.find((field) => field.name === name)?.khmerOf);
    const english = names.some((name) => twins.has(name));
    if (khmer && !english) setLanguage("km");
    else if (english && !khmer) setLanguage("en");
  }
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
  /* The form's icon field, when it has one. */
  const iconField = definition.fields.find((field) => field.iconPicker)?.name;
  /* Rows shown by their picture rather than an icon: an interest's. */
  const pictured = definition.fields.some((field) => field.name === "coverKey" && field.kind === "image");

  /** A row's picture link, from its URL or else its key; empty when it has none. */
  function pictureOf(row: Readonly<Record<string, unknown>> | undefined): string {
    const url = row?.coverUrl;
    if (typeof url === "string" && url) return url;
    const key = row?.coverKey;
    return typeof key === "string" && key ? mediaPath(key) : "";
  }

  /** For `spots`: the row being placed and the icons or pictures of the others, as the list shows them. */
  function spotOf(field: ResourceField): SpotContext | undefined {
    if (!field.spots) return undefined;
    const title = text(definition.titleField);
    return {
      title,
      iconKey: iconField ? text(iconField) : undefined,
      icons: iconField ? othersOf(field)?.map((row) => String(row[iconField] ?? "")) : undefined,
      image: pictured ? pictureOf(watched) : undefined,
      images: pictured ? (othersOf(field) ?? []).map((row) => pictureOf(row)) : undefined,
      clash: title ? placesOf(field)?.find((place) => place.toLowerCase() === title.toLowerCase()) : undefined,
    };
  }

  /** An interest as the website will show it, from what the form holds now. */
  function interestPreview() {
    const placeField = definition.fields.find((field) => field.placeAmong);
    const others = (placeField ? othersOf(placeField) : undefined) ?? [];
    return {
      group: placeField?.placeAmong ? text(placeField.placeAmong) : "",
      others: others.map((row) => ({ name: String(row[definition.titleField]).trim(), image: pictureOf(row) })),
      position: spotIndex(placeField ? watched[placeField.name] : "", others.length),
      name: (language === "km" && text("nameKm")) || text(definition.titleField),
      image: pictureOf(watched),
      description: language === "km" ? text("descriptionKm") : text("description"),
      editing,
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
        label: choices.find((option) => option.value === each)?.label ?? t("thisOne"),
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
      setBanner(errorMessage(error));
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
    showLanguageOf(Object.keys(result.fieldErrors ?? {}));
    setBanner(result.message);
  }, (invalid) => showLanguageOf(Object.keys(invalid)));

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
        setBanner(errorMessage(error));
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
            {t("readOnly")}
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
            {twins.size ? (
              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                <SegmentedControl
                  label={languageWords("label")}
                  onChange={setLanguage}
                  options={[
                    { value: "en", label: LOCALE_NAMES.en },
                    { value: "km", label: LOCALE_NAMES.km },
                  ]}
                  value={language}
                />
                <Badge dot tone={khmerMissing.length ? "warning" : "success"}>
                  {khmerMissing.length ? languageWords("missing", { count: khmerMissing.length }) : languageWords("complete")}
                </Badge>
              </div>
            ) : null}
            {sections.map((section) => (
              <section className="px-4 py-4" key={section.title || "main"}>
                {section.title ? (
                  <h2 className="mb-3 text-sm font-semibold text-ink">{section.title}</h2>
                ) : null}

                <fieldset
                  disabled={!canEdit}
                  className="grid gap-x-4 gap-y-4 md:grid-cols-2"
                >
                  {section.fields
                    .map((field) => (language === "km" ? (twins.get(field.name) ?? field) : field))
                    .filter((field) => isShown(field, watched, options))
                    .map((field) => (
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

            {status ? (
              <section className="px-4 py-4">
                <h2 className="mb-3 text-sm font-semibold text-ink">{t("publication")}</h2>
                {!canEdit ? (
                  <p className="text-sm text-muted">{t("editorManages", { noun: definition.label.toLowerCase() })}</p>
                ) : !canSetStatus ? (
                  <p className="text-sm text-muted">
                    {editing ? `${t("currently", { status: currentStatus?.label.toLowerCase() ?? t("unknown") })} ` : ""}
                    {t("reviewerDecides")}
                    {definition.key === "destinations" ? ` ${t("submitFromPublishing")}` : ""}
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
                    <p className="text-xs text-muted">{t("publishedNote")}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    {t("createdAs", {
                      nouns: definition.labelPlural.toLowerCase(),
                      status: initialStatus?.label.toLowerCase() ?? t("drafts"),
                    })}
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
                      ? actions("saving")
                      : editing
                        ? actions("saveChanges")
                        : actions("create", { noun: definition.label.toLowerCase() })}
                  </Button>
                ) : null}

                <Link
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  href={cancelHref ?? listHref}
                >
                  {actions("cancel")}
                </Link>
              </div>

              {editing && canDelete ? (
                confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{actions("deleteConfirm")}</span>
                    <Button
                      disabled={deleting}
                      onClick={destroy}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {actions("yesDelete")}
                    </Button>
                    <Button
                      onClick={() => setConfirmingDelete(false)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {actions("keepIt")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    disabled={deleting}
                    onClick={() => setConfirmingDelete(true)}
                    size="sm"
                    type="button"
                    variant="dangerGhost"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                    {actions("delete")}
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
