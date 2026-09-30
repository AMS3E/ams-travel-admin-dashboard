import { createCorridor } from "@/features/corridors/api/corridor-writes.server";
import type { CreateCorridorInput } from "@/features/corridors/api/contracts";
import { fieldsOf, runWrite } from "@/lib/api-route.server";

/** `POST` — a corridor in one go: its overview, its days and stops, and published when asked and allowed. */
export async function POST(request: Request) {
  return runWrite(request, (body) => {
    const input = fieldsOf(body);
    return createCorridor({
      overview: input.overview as CreateCorridorInput["overview"],
      days: Array.isArray(input.days) ? (input.days as CreateCorridorInput["days"]) : [],
      publish: input.publish === true,
    });
  });
}
