import { NextResponse, type NextRequest } from "next/server";
import { hasValidRequestOrigin, requireAdminToken, toErrorResponse } from "@/lib/api-route.server";
import { backendRequest } from "@/lib/backend-api.server";
import { UUID_PATTERN } from "@/lib/ids";

/** One path, anchored, with `{id}` standing for a UUID segment. */
function path(pattern: string): RegExp {
  return new RegExp(`^${pattern.replaceAll("{id}", UUID_PATTERN)}$`, "i");
}

/*
 * The only API calls the browser may make through this proxy. Everything the
 * catalogue writes goes through `/api/catalog` instead, where the registry
 * decides the body; this list is the screens that talk to the API directly.
 */
const reads = [
  path("admin/(overview|audit|destination-stats)"),
  /* Back-office accounts in Keycloak (`?search=` for anyone in the realm); USER_MANAGE's. */
  path("staff"),
  /* Accounts in the `users` table: customers of the public site, and staff who have signed in. */
  path("users"),
  path("publish-requests(/(mine|pending|current|history|{id}))?"),
  path("reviews"),
  /*
   * One destination's decisions (`?destinationId=`), and what the signed-in
   * desk may verify. Both need PERM_VERIFIED_BADGE_SET or full control, and
   * the API scopes them to the caller's desks.
   */
  path("destination-verifications(/(queue|status))?"),
];
const writes: Record<string, readonly RegExp[]> = {
  /*
   * Creating a customer (PERM_USER_MANAGE), the publishing workflow, and
   * filing a verification decision — which desk may decide what is the API's
   * to check.
   */
  POST: [
    path("users"),
    path("publish-requests"),
    path("publish-requests/{id}/(approve|reject|publish|unpublish)"),
    path("destination-verifications"),
  ],
  /*
   * Editing a customer (PERM_USER_MANAGE) and moderating one review.
   */
  PUT: [path("users/{id}"), path("reviews/{id}")],
  /*
   * Deleting a customer for good (PERM_USER_MANAGE) and clearing the audit
   * log — all-or-nothing; the API demands full control.
   */
  DELETE: [path("users/{id}"), path("admin/audit")],
};
type Context = { params: Promise<{ path: string[] }> };
async function forward(request: NextRequest, context: Context) {
  const target = (await context.params).path.join("/");
  const allowed =
    request.method === "GET" ? reads : (writes[request.method] ?? []);
  if (!allowed.some((pattern) => pattern.test(target)))
    return NextResponse.json(
      { message: "Unknown CMS operation." },
      { status: 404 },
    );
  const session = await requireAdminToken();
  if ("response" in session) return session.response;
  if (
    request.method !== "GET" &&
    !hasValidRequestOrigin(request)
  ) {
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  }
  try {
    const body = ["POST", "PUT"].includes(request.method)
      ? await request.text()
      : undefined;
    const result = await backendRequest(
      "/" + target + request.nextUrl.search,
      { method: request.method, ...(body ? { body } : {}) },
      session.token,
    );
    return result === undefined
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
};
