import { updateAccount } from "@/features/people/api/people-writes.server";
import type { AccountChanges } from "@/features/people/form-state";
import { runWrite } from "@/lib/api-route.server";

/** `PUT` — one account's name, e-mail, phone, photo and whether it may sign in (Spring `PUT /staff/{id}`). */
export async function PUT(request: Request, context: RouteContext<"/api/people/[id]">) {
  const { id } = await context.params;
  return runWrite(request, (body) => updateAccount(id, body as AccountChanges));
}
