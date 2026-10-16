import "server-only";

import { NextResponse } from "next/server";
import { oidcConfig } from "@/features/auth/oidc";
import { getCurrentAdmin, getSessionToken } from "@/features/auth/session";
import { BackendApiError } from "@/lib/backend-api.server";
import { problemMessage } from "@/lib/problem";

/**
 * Docker may give Next.js an internal request origin such as 0.0.0.0:3001.
 * Browser mutations must come from the configured public dashboard origin,
 * which is also used for login callbacks. Do not trust forwarded host headers.
 */
export function hasValidRequestOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(oidcConfig().siteUrl).origin;
}

/**
 * Route handlers exist so the browser never holds a bearer token.
 *
 * The client calls `/api/catalog/...` with cookies; this reads the session,
 * proves the ADMIN role, and forwards to Spring with the Authorization header
 * attached server-side.
 */
export async function requireAdminToken(): Promise<
  { readonly token: string } | { readonly response: NextResponse }
> {
  const [admin, token] = await Promise.all([getCurrentAdmin(), getSessionToken()]);

  if (!admin || !token) {
    return {
      response: NextResponse.json(
        { message: "Your session has ended. Sign in again." },
        { status: 401 },
      ),
    };
  }

  return { token };
}

/**
 * A write the browser sends as JSON to one of the dashboard's server functions
 * — creating a corridor, setting an account's roles. The session and the
 * request's origin are checked first; the function checks the permission and
 * the input again, calls Spring, and its own answer — `{ ok: false, message }`
 * included — goes back as it is. What throws becomes the shared error shape.
 */
export async function runWrite(request: Request, write: (body: unknown) => Promise<unknown>): Promise<NextResponse> {
  const session = await requireAdminToken();
  if ("response" in session) return session.response;
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }
  const body: unknown = await request.json().catch(() => null);
  try {
    return NextResponse.json(await write(body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** A JSON body's own fields, or none when it is not an object. */
export function fieldsOf(body: unknown): Readonly<Record<string, unknown>> {
  return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

/**
 * Turns a backend failure into the same JSON shape every mutation hook reads.
 * The API answers errors as problem documents, so their `detail` sentence is
 * passed through as `message` rather than the raw JSON. Our own sentences
 * carry a `code` the screen words in the reader's language.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof BackendApiError) {
    const detail = problemMessage(error.detail);
    return NextResponse.json(
      detail ? { message: detail } : { message: "The request was rejected.", code: "rejected" },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { message: "The catalogue API could not be reached.", code: "unreachable" },
    { status: 502 },
  );
}
