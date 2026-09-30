import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  authorizationUrl,
  codeChallenge,
  OIDC_NEXT_COOKIE,
  OIDC_NONCE_COOKIE,
  OIDC_STATE_COOKIE,
  OIDC_TEMP_COOKIE_MAX_AGE,
  OIDC_VERIFIER_COOKIE,
  randomUrlSafe,
  safeReturnPath,
} from "@/features/auth/oidc";
import { cookieOptions } from "@/features/auth/session-tokens";

/** Sends the browser to Keycloak's staff sign-in form, remembering this attempt. */
export async function GET(request: NextRequest) {
  const state = randomUrlSafe();
  const nonce = randomUrlSafe();
  const verifier = randomUrlSafe(48);
  const store = await cookies();
  const options = cookieOptions(OIDC_TEMP_COOKIE_MAX_AGE);
  store.set(OIDC_STATE_COOKIE, state, options);
  store.set(OIDC_NONCE_COOKIE, nonce, options);
  store.set(OIDC_VERIFIER_COOKIE, verifier, options);
  store.set(OIDC_NEXT_COOKIE, safeReturnPath(request.nextUrl.searchParams.get("next")), options);

  /* ?action=password: straight to Keycloak's "Set a new password" page. */
  const action = request.nextUrl.searchParams.get("action") === "password" ? "UPDATE_PASSWORD" : undefined;
  return NextResponse.redirect(authorizationUrl(state, nonce, codeChallenge(verifier), action));
}
