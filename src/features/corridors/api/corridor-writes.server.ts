import "server-only";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { canCreateResource, canManageResource, canPublishOnCreate, canSetStatus } from "@/features/auth/permissions";
import { requireAdminSession } from "@/features/auth/session";
import type {
  CorridorItinerary,
  CorridorSummary,
  CreateCorridorInput,
  CreateCorridorResult,
  ItineraryDayInput,
  ItineraryResult,
  PublishResult,
  RoutePreview,
  RoutePreviewResult,
} from "@/features/corridors/api/contracts";
import { TRANSPORT_TYPES, type CorridorsT } from "@/features/corridors/format";
import type { PreviewStop } from "@/features/corridors/itinerary-draft";
import { BackendApiError, backendRequest } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";
import { problemMessage } from "@/lib/problem";

const text = (max: number) => z.string().max(max).nullable();

/** The same limits the API keeps; checked here because the route handler in front of this is a public endpoint. */
function itinerarySchema(t: CorridorsT) {
  const time = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, t("errors.time"))
    .nullable();
  return z
    .array(
      z.object({
        title: text(200),
        description: text(10_000),
        startTime: time,
        notes: text(4000),
        stops: z
          .array(
            z.object({
              destinationId: z.string().refine(isUuid, t("errors.chooseDestination")),
              arrivalTime: time,
              departureTime: time,
              recommendedDurationMinutes: z.number().int().min(0).max(1440).nullable(),
              transportType: z.enum(TRANSPORT_TYPES as [string, ...string[]]).nullable(),
              title: text(200),
              description: text(10_000),
              notes: text(4000),
            }),
          )
          .max(40, t("errors.dayStops")),
      }),
    )
    .max(30, t("errors.corridorDays"));
}

function overviewSchema(t: CorridorsT) {
  const money = z.number().min(0, t("errors.budgetNegative")).max(99_999_999).nullable();
  return z
    .object({
      name: z.string().trim().min(1, t("creator.nameRequired")).max(200, t("errors.nameLong")),
      shortDescription: text(500),
      description: text(20_000),
      coverKey: text(512),
      estimatedBudgetMin: money,
      estimatedBudgetMax: money,
      interestIds: z.array(z.string().uuid()).max(50),
      nameKm: text(200),
      shortDescriptionKm: text(500),
      descriptionKm: text(20_000),
    })
    .refine(
      (overview) =>
        overview.estimatedBudgetMin == null || overview.estimatedBudgetMax == null || overview.estimatedBudgetMax >= overview.estimatedBudgetMin,
      t("errors.budgetOrder"),
    );
}

/**
 * A corridor in one go: its overview, its days and stops, and — for someone
 * who curates corridors, when asked — published, so it is on the website at
 * once. A step that fails after the corridor exists says so and names it,
 * rather than inviting a second one.
 */
export async function createCorridor(input: CreateCorridorInput): Promise<CreateCorridorResult> {
  const t = await getTranslations("corridors");
  const { admin, token } = await requireAdminSession();
  if (!canCreateResource(admin.roles, "corridors")) {
    return { ok: false, message: t("errors.cannotCreate") };
  }
  const overview = overviewSchema(t).safeParse(input.overview);
  if (!overview.success) return { ok: false, message: overview.error.issues[0]?.message ?? t("errors.details") };
  const itinerary = itinerarySchema(t).safeParse(input.days);
  if (!itinerary.success) return { ok: false, message: itinerary.error.issues[0]?.message ?? t("errors.stops") };

  let id: string;
  try {
    const created = await backendRequest<CorridorSummary>(
      "/corridors",
      { method: "POST", body: JSON.stringify({ ...overview.data, slug: null }) },
      token,
    );
    id = created.id;
  } catch (error) {
    return { ok: false, message: failure(error, t("errors.notCreated")) };
  }
  revalidatePath("/corridors");

  if (itinerary.data.some((day) => day.stops.length > 0)) {
    try {
      await backendRequest(`/corridors/${id}/itinerary`, { method: "PUT", body: JSON.stringify({ days: itinerary.data }) }, token);
    } catch (error) {
      refresh(id);
      return {
        ok: false,
        id,
        message: t("errors.stopsNotSaved", { reason: failure(error, t("errors.refusedThem")) }),
      };
    }
  }

  if (input.publish && canPublishOnCreate(admin.roles, "corridors")) {
    try {
      await backendRequest(`/corridors/${id}/publish`, { method: "PATCH" }, token);
    } catch (error) {
      refresh(id);
      return {
        ok: false,
        id,
        message: t("errors.notPublished", { reason: failure(error, t("errors.refusedIt")) }),
      };
    }
  }

  refresh(id);
  return { ok: true, id };
}

function previewSchema(t: CorridorsT) {
  return z
    .array(
      z.object({
        destinationId: z.string().refine(isUuid, t("errors.chooseDestination")),
        transportType: z.enum(TRANSPORT_TYPES as [string, ...string[]]).nullable(),
      }),
    )
    .min(2)
    .max(150);
}

/** The roads between stops not saved yet, for the map beside a corridor being planned. Nothing is stored. */
export async function previewRoute(stops: readonly PreviewStop[]): Promise<RoutePreviewResult> {
  const t = await getTranslations("corridors");
  const { admin, token } = await requireAdminSession();
  if (!canManageResource(admin.roles, "corridors")) {
    return { ok: false, message: t("errors.cannotPlan") };
  }
  const parsed = previewSchema(t).safeParse(stops);
  if (!parsed.success) return { ok: false, message: t("errors.cannotRoute") };
  try {
    const preview = await backendRequest<RoutePreview>(
      "/corridors/route-preview",
      { method: "POST", body: JSON.stringify({ stops: parsed.data }) },
      token,
    );
    return { ok: true, preview };
  } catch (error) {
    return { ok: false, message: failure(error, t("errors.roadsFailed")) };
  }
}

export async function saveItinerary(corridorId: string, days: readonly ItineraryDayInput[]): Promise<ItineraryResult> {
  const t = await getTranslations("corridors");
  const guard = await curator(t, corridorId);
  if ("message" in guard) return guard;
  const parsed = itinerarySchema(t).safeParse(days);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? t("errors.stops") };
  }
  return itineraryCall(t, corridorId, guard.token, { method: "PUT", body: JSON.stringify({ days: parsed.data }) }, "/itinerary");
}

export async function recalculateRoute(corridorId: string): Promise<ItineraryResult> {
  const t = await getTranslations("corridors");
  const guard = await curator(t, corridorId);
  if ("message" in guard) return guard;
  return itineraryCall(t, corridorId, guard.token, { method: "POST" }, "/route");
}

export async function setCorridorPublished(corridorId: string, published: boolean): Promise<PublishResult> {
  const t = await getTranslations("corridors");
  if (!isUuid(corridorId)) return { ok: false, message: t("errors.unknown") };
  const { admin, token } = await requireAdminSession();
  if (!canSetStatus(admin.roles, "corridors")) {
    return { ok: false, message: t("errors.cannotPublish") };
  }
  try {
    const corridor = await backendRequest<CorridorSummary>(
      `/corridors/${corridorId}/${published ? "publish" : "unpublish"}`,
      { method: "PATCH" },
      token,
    );
    refresh(corridorId);
    return { ok: true, corridor };
  } catch (error) {
    return { ok: false, message: failure(error, published ? t("errors.publishFailed") : t("errors.unpublishFailed")) };
  }
}

async function curator(t: CorridorsT, corridorId: string): Promise<{ readonly token: string } | { readonly ok: false; readonly message: string }> {
  if (!isUuid(corridorId)) return { ok: false, message: t("errors.unknown") };
  const { admin, token } = await requireAdminSession();
  if (!canManageResource(admin.roles, "corridors")) {
    return { ok: false, message: t("errors.cannotChange") };
  }
  return { token };
}

async function itineraryCall(t: CorridorsT, corridorId: string, token: string, init: RequestInit, suffix: string): Promise<ItineraryResult> {
  try {
    const itinerary = await backendRequest<CorridorItinerary>(`/corridors/${corridorId}${suffix}`, init, token);
    refresh(corridorId);
    return { ok: true, itinerary };
  } catch (error) {
    return { ok: false, message: failure(error, t("errors.saveFailed")) };
  }
}

function refresh(corridorId: string) {
  revalidatePath("/corridors");
  revalidatePath(`/corridors/${corridorId}`, "layout");
}

function failure(error: unknown, fallback: string): string {
  if (error instanceof BackendApiError) return problemMessage(error.detail) || fallback;
  return fallback;
}
