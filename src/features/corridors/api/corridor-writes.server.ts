import "server-only";

import { revalidatePath } from "next/cache";
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
import { TRANSPORT_TYPES } from "@/features/corridors/format";
import type { PreviewStop } from "@/features/corridors/itinerary-draft";
import { BackendApiError, backendRequest } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";
import { problemMessage } from "@/lib/problem";

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 08:30.")
  .nullable();
const text = (max: number) => z.string().max(max).nullable();

/** The same limits the API keeps; checked here because the route handler in front of this is a public endpoint. */
const itinerarySchema = z
  .array(
    z.object({
      title: text(200),
      description: text(10_000),
      startTime: time,
      notes: text(4000),
      stops: z
        .array(
          z.object({
            destinationId: z.string().refine(isUuid, "Choose a destination."),
            arrivalTime: time,
            departureTime: time,
            recommendedDurationMinutes: z.number().int().min(0).max(1440).nullable(),
            transportType: z.enum(TRANSPORT_TYPES as [string, ...string[]]).nullable(),
            title: text(200),
            description: text(10_000),
            notes: text(4000),
          }),
        )
        .max(40, "A day holds at most 40 stops."),
    }),
  )
  .max(30, "A corridor runs at most 30 days.");

const money = z.number().min(0, "A budget cannot be negative.").max(99_999_999).nullable();

const overviewSchema = z
  .object({
    name: z.string().trim().min(1, "Give the corridor a name.").max(200, "Keep the name under 200 characters."),
    shortDescription: text(500),
    description: text(20_000),
    coverKey: text(512),
    estimatedBudgetMin: money,
    estimatedBudgetMax: money,
    isFeatured: z.boolean(),
    interestIds: z.array(z.string().uuid()).max(50),
  })
  .refine(
    (overview) =>
      overview.estimatedBudgetMin == null || overview.estimatedBudgetMax == null || overview.estimatedBudgetMax >= overview.estimatedBudgetMin,
    "The budget's upper end is below its lower end.",
  );

/**
 * A corridor in one go: its overview, its days and stops, and — for someone
 * who curates corridors, when asked — published, so it is on the website at
 * once. A step that fails after the corridor exists says so and names it,
 * rather than inviting a second one.
 */
export async function createCorridor(input: CreateCorridorInput): Promise<CreateCorridorResult> {
  const { admin, token } = await requireAdminSession();
  if (!canCreateResource(admin.roles, "corridors")) {
    return { ok: false, message: "This account cannot create corridors." };
  }
  const overview = overviewSchema.safeParse(input.overview);
  if (!overview.success) return { ok: false, message: overview.error.issues[0]?.message ?? "Some details need attention." };
  const itinerary = itinerarySchema.safeParse(input.days);
  if (!itinerary.success) return { ok: false, message: itinerary.error.issues[0]?.message ?? "Some stops need attention." };

  let id: string;
  try {
    const created = await backendRequest<CorridorSummary>(
      "/corridors",
      { method: "POST", body: JSON.stringify({ ...overview.data, slug: null }) },
      token,
    );
    id = created.id;
  } catch (error) {
    return { ok: false, message: failure(error, "The corridor could not be created.") };
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
        message: `The corridor was created, but its stops could not be saved: ${failure(error, "the API refused them.")} Open it to add them — do not create it again.`,
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
        message: `The corridor was saved as a draft, but it could not be published: ${failure(error, "the API refused it.")} Open it to publish it — do not create it again.`,
      };
    }
  }

  refresh(id);
  return { ok: true, id };
}

const previewSchema = z
  .array(
    z.object({
      destinationId: z.string().refine(isUuid, "Choose a destination."),
      transportType: z.enum(TRANSPORT_TYPES as [string, ...string[]]).nullable(),
    }),
  )
  .min(2)
  .max(150);

/** The roads between stops not saved yet, for the map beside a corridor being planned. Nothing is stored. */
export async function previewRoute(stops: readonly PreviewStop[]): Promise<RoutePreviewResult> {
  const { admin, token } = await requireAdminSession();
  if (!canManageResource(admin.roles, "corridors")) {
    return { ok: false, message: "This account cannot plan corridors." };
  }
  const parsed = previewSchema.safeParse(stops);
  if (!parsed.success) return { ok: false, message: "These stops cannot be routed." };
  try {
    const preview = await backendRequest<RoutePreview>(
      "/corridors/route-preview",
      { method: "POST", body: JSON.stringify({ stops: parsed.data }) },
      token,
    );
    return { ok: true, preview };
  } catch (error) {
    return { ok: false, message: failure(error, "The roads could not be worked out.") };
  }
}

export async function saveItinerary(corridorId: string, days: readonly ItineraryDayInput[]): Promise<ItineraryResult> {
  const guard = await curator(corridorId);
  if ("message" in guard) return guard;
  const parsed = itinerarySchema.safeParse(days);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Some stops need attention." };
  }
  return itineraryCall(corridorId, guard.token, { method: "PUT", body: JSON.stringify({ days: parsed.data }) }, "/itinerary");
}

export async function recalculateRoute(corridorId: string): Promise<ItineraryResult> {
  const guard = await curator(corridorId);
  if ("message" in guard) return guard;
  return itineraryCall(corridorId, guard.token, { method: "POST" }, "/route");
}

export async function setCorridorPublished(corridorId: string, published: boolean): Promise<PublishResult> {
  if (!isUuid(corridorId)) return { ok: false, message: "Unknown corridor." };
  const { admin, token } = await requireAdminSession();
  if (!canSetStatus(admin.roles, "corridors")) {
    return { ok: false, message: "This account cannot publish corridors." };
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
    return { ok: false, message: failure(error, published ? "The corridor could not be published." : "The corridor could not be unpublished.") };
  }
}

async function curator(corridorId: string): Promise<{ readonly token: string } | { readonly ok: false; readonly message: string }> {
  if (!isUuid(corridorId)) return { ok: false, message: "Unknown corridor." };
  const { admin, token } = await requireAdminSession();
  if (!canManageResource(admin.roles, "corridors")) {
    return { ok: false, message: "This account cannot change corridors." };
  }
  return { token };
}

async function itineraryCall(corridorId: string, token: string, init: RequestInit, suffix: string): Promise<ItineraryResult> {
  try {
    const itinerary = await backendRequest<CorridorItinerary>(`/corridors/${corridorId}${suffix}`, init, token);
    refresh(corridorId);
    return { ok: true, itinerary };
  } catch (error) {
    return { ok: false, message: failure(error, "The corridor could not be saved.") };
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
