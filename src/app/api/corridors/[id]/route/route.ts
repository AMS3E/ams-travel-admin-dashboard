import { recalculateRoute } from "@/features/corridors/api/corridor-writes.server";
import { runWrite } from "@/lib/api-route.server";

/** `POST` — works a corridor's road route out again from its saved stops. */
export async function POST(request: Request, context: RouteContext<"/api/corridors/[id]/route">) {
  const { id } = await context.params;
  return runWrite(request, () => recalculateRoute(id));
}
