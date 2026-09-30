import { setRoles } from "@/features/people/api/people-writes.server";
import { fieldsOf, runWrite } from "@/lib/api-route.server";

/** `PUT { roles }` — exactly which business roles one account holds (Spring `PUT /staff/{id}/roles`). */
export async function PUT(request: Request, context: RouteContext<"/api/people/[id]/roles">) {
  const { id } = await context.params;
  return runWrite(request, (body) => {
    const { roles } = fieldsOf(body);
    return setRoles(id, Array.isArray(roles) ? roles.filter((role): role is string => typeof role === "string") : []);
  });
}
