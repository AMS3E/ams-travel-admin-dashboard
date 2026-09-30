import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIES,
  clearSessionCookies,
  expiresSoon,
  refreshTokens,
  writeSession,
} from "@/features/auth/session-tokens";

/**
 * Next.js 16 renamed Middleware to Proxy; the contract is unchanged.
 *
 * Keeps the session alive: an access token that is missing or about to expire
 * is renewed once with the refresh token, handed to this request and set on
 * the browser. The page check stays *optimistic* — it only asks whether a
 * session exists. Verifying the signature and the desk role needs the JWKS and
 * belongs where the answer can be trusted: `requireAdmin()` in the layout.
 */

/**
 * URLs that have moved. Handled here rather than by a page that calls
 * `redirect()`, because by the time a page can do that the shell has already
 * begun streaming and Next falls back to a one-second meta refresh. This
 * answers 307 before anything renders, and carries the query string — an audit
 * filter someone shared still opens filtered.
 */
const MOVED: Readonly<Record<string, string>> = { "/audit": "/audit-logs" };

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const moved = MOVED[pathname];
  if (moved) {
    return NextResponse.redirect(new URL(moved + search, request.url), 307);
  }

  const access = request.cookies.get(COOKIE_NAME)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  let signedIn = Boolean(access && !expiresSoon(access));
  let renewed: Awaited<ReturnType<typeof refreshTokens>> | null = null;

  if (!signedIn && refresh) {
    renewed = await refreshTokens(refresh);
    if (typeof renewed === "object") {
      request.cookies.set(COOKIE_NAME, renewed.access_token);
      signedIn = true;
    } else if (renewed === "refused") {
      for (const name of SESSION_COOKIES) request.cookies.delete(name);
    } else {
      /* Keycloak unreachable: keep the session; Spring decides whether the old token still works. */
      signedIn = Boolean(access);
    }
  }

  /*
   * An `/api` route is never redirected: a redirect answers 200 with HTML, so
   * an expired `fetch` would get a web page. Those routes answer 401 as JSON.
   */
  let response: NextResponse;
  if (!signedIn && !pathname.startsWith("/api/")) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
    response = NextResponse.redirect(login);
  } else {
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  if (renewed && typeof renewed === "object") writeSession(response.cookies, renewed);
  else if (renewed === "refused") clearSessionCookies(response.cookies);
  return response;
}

export const config = {
  /* Pages and the dashboard's own API routes; not sign-in itself, Next's assets or static files. */
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
