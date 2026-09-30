import { previewRoute } from "@/features/corridors/api/corridor-writes.server";
import type { PreviewStopInput } from "@/features/corridors/api/contracts";
import { fieldsOf, runWrite } from "@/lib/api-route.server";

/** `POST { stops }` — the roads between stops not saved yet, for the map beside a plan. Nothing is stored. */
export async function POST(request: Request) {
  return runWrite(request, (body) => {
    const { stops } = fieldsOf(body);
    return previewRoute(Array.isArray(stops) ? (stops as PreviewStopInput[]) : []);
  });
}
