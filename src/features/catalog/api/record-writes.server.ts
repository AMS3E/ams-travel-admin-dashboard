import "server-only";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getBackendUserId, requireAdminSession } from "@/features/auth/session";
import {
  canCreateResource,
  canEditRecord,
  canPublishOnCreate,
  canSetStatus,
  namesListingOwner,
} from "@/features/auth/permissions";
import { findRecord } from "@/features/catalog/api/catalog.server";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import type { SaveRecordInput, SaveResult } from "@/features/catalog/form-state";
import { localizeDefinition } from "@/features/catalog/localize.server";
import {
  resourcePath,
  resourceSchema,
  separateWrites,
  statusValueOf,
  toFormValues,
  toRequestBody,
  withoutField,
  type FormValues,
  type ResourceDefinition,
} from "@/features/catalog/resource";
import { getResource, isResourceKey } from "@/features/catalog/resources";
import { BackendApiError, backendRequest } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";
import { problemFieldErrors, problemMessage } from "@/lib/problem";

/**
 * Creates or updates one catalogue row.
 *
 * The same Zod schema runs here that ran in the browser. That is not
 * belt-and-braces — the browser copy is a convenience for the person typing,
 * and this one is the check that actually decides, because a server action is
 * a public endpoint whatever the form in front of it looks like.
 */
export async function saveRecord(
  input: SaveRecordInput,
): Promise<SaveResult> {
  const t = await getTranslations("catalog.save");
  if (!isResourceKey(input.resource)) {
    return { ok: false, message: t("unknownResource") };
  }
  if (input.id != null && !isUuid(input.id)) {
    return { ok: false, message: t("unknownRow") };
  }

  const { admin, token } = await requireAdminSession();
  const userId = await getBackendUserId();
  let existing: CatalogRecord | null = null;
  if (input.id == null) {
    if (!canCreateResource(admin.roles, input.resource)) {
      return { ok: false, message: t("cannotCreate") };
    }
  } else {
    try {
      existing = await findRecord(input.resource, input.id);
    } catch {
      return { ok: false, message: t("unavailable") };
    }
    if (!canEditRecord(admin.roles, input.resource, existing, userId)) {
      return { ok: false, message: t("readOnly") };
    }
  }
  /*
   * The same questions the form asked, so a save is checked against them and
   * no other: who runs a stay or a food listing is asked only of the desks that
   * name an owner, and the API puts the writer's own name to the rest.
   * In the reader's language, so the messages below name things as the form does.
   */
  const definition = await localizeDefinition(
    namesListingOwner(admin.roles, input.resource)
      ? getResource(input.resource)
      : withoutField(getResource(input.resource), "ownerUserId"),
  );
  const item = definition.label.toLowerCase();
  const generic = t("generic");
  const parsed = resourceSchema(definition).safeParse(input.values);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const name = issue.path[0];
      if (typeof name === "string" && !fieldErrors[name]) {
        fieldErrors[name] = issue.message;
      }
    }
    return { ok: false, message: t("fieldsNeedAttention"), fieldErrors };
  }

  const mode = input.id == null ? "create" : "update";
  const values = parsed.data as FormValues;
  /*
   * A role that may not change the status keeps the one the row has: the
   * form hides the control, and a hand-made request gets no further.
   */
  if (definition.status && existing && !canSetStatus(admin.roles, input.resource)) {
    values.status = statusValueOf(definition, existing) ?? definition.status.initial;
  }
  /*
   * A new row starts at its initial status, unless it is an administrator's
   * destination, stay or food, which may go live at once. A stay's or a food's
   * status travels in the body below; a destination's is published after it.
   */
  if (definition.status && !existing && !canPublishOnCreate(admin.roles, input.resource)) {
    values.status = definition.status.initial;
  }
  const body = toRequestBody(definition, values, { mode });

  try {
    const saved = await backendRequest<CatalogRecord>(
      mode === "create"
        ? resourcePath(input.resource)
        : `${resourcePath(input.resource)}/${input.id}`,
      { method: mode === "create" ? "POST" : "PUT", body: JSON.stringify(body) },
      token,
    );

    /* Corridor stops, which have an endpoint of their own. */
    for (const write of separateWrites(definition, values, saved.id, mode)) {
      await backendRequest(write.path, { method: "PUT", body: JSON.stringify(write.body) }, token);
    }

    /*
     * A destination's status is not part of its body: publishing and
     * unpublishing are their own endpoints, guarded by their own grants.
     */
    const model = definition.status;
    if (model?.via === "publish" && existing && canSetStatus(admin.roles, input.resource)) {
      const wanted = values.status;
      const current = statusValueOf(definition, existing);
      if (wanted !== current && (wanted === model.live || current === model.live)) {
        await backendRequest(
          `${resourcePath(input.resource)}/${saved.id}/${wanted === model.live ? "publish" : "unpublish"}`,
          { method: "PATCH" },
          token,
        );
      }
    }

    /*
     * An administrator's new destination, left on Published, goes live now
     * rather than waiting in the publishing queue. It exists by this point
     * either way, so a refusal here says so instead of inviting a second create.
     */
    if (
      model?.via === "publish" &&
      !existing &&
      values.status === model.live &&
      canPublishOnCreate(admin.roles, input.resource)
    ) {
      try {
        await backendRequest(`${resourcePath(input.resource)}/${saved.id}/publish`, { method: "PATCH" }, token);
      } catch (error) {
        revalidatePath("/", "layout");
        const detail = error instanceof BackendApiError ? problemMessage(error.detail) : "";
        return {
          ok: false,
          message: detail ? t("notPublishedDetail", { item, detail }) : t("notPublished", { item }),
        };
      }
    }

    /* A link kept on the other rows — a category's tourism regions — is saved onto them. */
    const unlinked = (await saveInverse(definition, values, existing, saved.id, token)) ??
      (await saveTies(definition, values, existing, saved.id, token));
    if (unlinked) {
      revalidatePath("/", "layout");
      const { field, detail } = unlinked;
      const message = unlinked.kind === "ties"
        ? (detail ? t("tiesFailedDetail", { item, field, detail }) : t("tiesFailed", { item, field }))
        : (detail ? t("inverseFailedDetail", { item, field, detail }) : t("inverseFailed", { item, field }));
      return { ok: false, message };
    }

    revalidatePath("/", "layout");
    return { ok: true, id: saved.id };
  } catch (error) {
    if (error instanceof BackendApiError) {
      const detail = problemMessage(error.detail);
      /*
       * The services answer a duplicate name or slug with 409 and the offending
       * field in the text. Pinning it to `name` puts the message where the
       * mistake usually is instead of in a banner the editor has to interpret.
       */
      if (error.status === 409) {
        return {
          ok: false,
          message: detail || t("exists", { item }),
          fieldErrors: { name: detail || t("nameTaken") },
        };
      }
      if (error.status === 400) {
        /* The API names each refused field; the form marks them and opens the step they are on. */
        const fieldErrors = problemFieldErrors(error.detail);
        return Object.keys(fieldErrors).length
          ? { ok: false, message: detail || generic, fieldErrors }
          : { ok: false, message: detail || generic };
      }
      if (error.status === 403 || error.status === 404) {
        return { ok: false, message: detail || generic };
      }
    }
    return { ok: false, message: generic };
  }
}

/** A link the row's save could not carry onto other rows: which field, and what the API said. */
interface Unlinked {
  /** `ties` could not be saved; `inverse` could not all be updated. */
  readonly kind: "ties" | "inverse";
  /** The field's label, lower case, in the reader's language. */
  readonly field: string;
  readonly detail: string;
}

/**
 * Writes each `ties` field that changed — a site's kings — keeping what every
 * tie still chosen already had, such as how that king shaped the place. Says
 * what could not be written, or null.
 */
async function saveTies(
  definition: ResourceDefinition,
  values: FormValues,
  existing: CatalogRecord | null,
  id: string,
  token: string,
): Promise<Unlinked | null> {
  for (const field of definition.fields) {
    if (!field.ties) continue;
    const { path, by, list, key, keep = [] } = field.ties;
    const wanted = Array.isArray(values[field.name]) ? (values[field.name] as string[]).filter(Boolean) : [];
    const before = Array.isArray(existing?.[field.name]) ? (existing![field.name] as unknown[]).map(String) : [];
    if (wanted.length === before.length && wanted.every((value) => before.includes(value))) continue;
    try {
      const current = await backendRequest<Record<string, unknown>[]>(`${path}?${by}=${encodeURIComponent(id)}`, {}, token);
      const had = new Map(current.map((row) => [String(row[key]), row]));
      const ties = wanted.map((value) => ({
        [key]: value,
        ...Object.fromEntries(keep.map((name) => [name, had.get(value)?.[name] ?? null])),
      }));
      await backendRequest(`${path}/${id}`, { method: "PUT", body: JSON.stringify({ [list]: ties }) }, token);
    } catch (error) {
      const detail = error instanceof BackendApiError ? problemMessage(error.detail) : "";
      return { kind: "ties", field: field.label.toLowerCase(), detail };
    }
  }
  return null;
}

/**
 * Adds this row to each newly chosen row's list and takes it off each one no
 * longer chosen — a category onto its tourism regions' categories. Each is
 * saved the way its own form saves it. Says what could not be, or null.
 */
async function saveInverse(
  definition: ResourceDefinition,
  values: FormValues,
  existing: CatalogRecord | null,
  id: string,
  token: string,
): Promise<Unlinked | null> {
  for (const field of definition.fields) {
    if (!field.inverse) continue;
    const other = getResource(field.inverse.resource);
    const wanted = new Set(Array.isArray(values[field.name]) ? (values[field.name] as string[]) : []);
    const before = new Set(Array.isArray(existing?.[field.name]) ? (existing![field.name] as unknown[]).map(String) : []);
    const changed = [...new Set([...wanted, ...before])].filter((rowId) => wanted.has(rowId) !== before.has(rowId));
    for (const rowId of changed) {
      try {
        const row = await findRecord(field.inverse.resource, rowId);
        const current = Array.isArray(row[field.inverse.field]) ? (row[field.inverse.field] as unknown[]).map(String) : [];
        const next = wanted.has(rowId) ? [...current.filter((each) => each !== id), id] : current.filter((each) => each !== id);
        const rowValues = { ...toFormValues(other, row), [field.inverse.field]: next };
        await backendRequest(
          `${resourcePath(field.inverse.resource)}/${rowId}`,
          { method: "PUT", body: JSON.stringify(toRequestBody(other, rowValues, { mode: "update" })) },
          token,
        );
      } catch (error) {
        const detail = error instanceof BackendApiError ? problemMessage(error.detail) : "";
        return { kind: "inverse", field: field.label.toLowerCase(), detail };
      }
    }
  }
  return null;
}
