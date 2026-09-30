import { saveItinerary } from "@/features/corridors/api/corridor-writes.server";
import type { ItineraryDayInput } from "@/features/corridors/api/contracts";
import { fieldsOf, runWrite } from "@/lib/api-route.server";

/** `PUT { days }` — a corridor's days and stops, replaced; the road route follows them. */
export async function PUT(request: Request, context: RouteContext<"/api/corridors/[id]/itinerary">) {
  const { id } = await context.params;
  return runWrite(request, (body) => {
    const { days } = fieldsOf(body);
    return saveItinerary(id, Array.isArray(days) ? (days as ItineraryDayInput[]) : []);
  });
}
