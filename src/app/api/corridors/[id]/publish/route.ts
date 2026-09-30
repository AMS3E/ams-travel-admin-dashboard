import { setCorridorPublished } from "@/features/corridors/api/corridor-writes.server";
import { fieldsOf, runWrite } from "@/lib/api-route.server";

/** `PATCH { published }` — puts a corridor on the website, or takes it off. */
export async function PATCH(request: Request, context: RouteContext<"/api/corridors/[id]/publish">) {
  const { id } = await context.params;
  return runWrite(request, (body) => setCorridorPublished(id, fieldsOf(body).published === true));
}
