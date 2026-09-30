import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  endKeycloakSession,
  exchangeCode,
  hasBackofficeRole,
  oidcConfig,
  OIDC_NEXT_COOKIE,
  OIDC_NONCE_COOKIE,
  OIDC_STATE_COOKIE,
  OIDC_VERIFIER_COOKIE,
  returnUrl,
  safeReturnPath,
  verifyAccessToken,
  verifyIdToken,
} from "@/features/auth/oidc";
import { createOidcSession } from "@/features/auth/session";

const TEMPORARY_COOKIES = [OIDC_STATE_COOKIE, OIDC_NONCE_COOKIE, OIDC_VERIFIER_COOKIE, OIDC_NEXT_COOKIE];

/** Keycloak sends the browser back here with a code; a desk account's tokens become the session. */
export async function GET(request: NextRequest) {
  const config = oidcConfig();
  const store = await cookies();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const expectedState = store.get(OIDC_STATE_COOKIE)?.value;
  const verifier = store.get(OIDC_VERIFIER_COOKIE)?.value;
  const expectedNonce = store.get(OIDC_NONCE_COOKIE)?.value;
  const next = safeReturnPath(store.get(OIDC_NEXT_COOKIE)?.value);
  for (const name of TEMPORARY_COOKIES) store.delete(name);

  const failed = (reason: "oauth" | "forbidden") => NextResponse.redirect(new URL(`/login?error=${reason}`, config.siteUrl));
  if (!code || !state || state !== expectedState || !verifier || !expectedNonce) return failed("oauth");

  const tokens = await exchangeCode(code, verifier);
  if (!tokens?.id_token) return failed("oauth");
  try {
    await verifyIdToken(tokens.id_token, expectedNonce);
    if (!hasBackofficeRole(await verifyAccessToken(tokens.access_token))) {
      // Signed in, but not staff: nothing is kept, and Keycloak forgets the session too.
      if (tokens.refresh_token) await endKeycloakSession(tokens.refresh_token);
      return failed("forbidden");
    }
  } catch {
    return failed("oauth");
  }

  await createOidcSession(tokens);
  return NextResponse.redirect(returnUrl(next, config.siteUrl, request.nextUrl.searchParams.get("kc_action_status")));
}
