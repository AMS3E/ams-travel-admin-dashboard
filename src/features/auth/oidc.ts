import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { hasBackofficeAccess } from "@/features/auth/permissions";
import { oidcConfig, type OidcTokenResponse } from "./session-tokens";

export { oidcConfig, type OidcTokenResponse } from "./session-tokens";

/*
 * Sign-in on Keycloak's own form: Authorization Code with PKCE. This server
 * starts it, takes the code back at /api/auth/callback and swaps it for tokens
 * with the client secret; the browser only ever holds HttpOnly cookies.
 */

export const OIDC_STATE_COOKIE = "ams_admin_oidc_state";
export const OIDC_VERIFIER_COOKIE = "ams_admin_oidc_verifier";
export const OIDC_NONCE_COOKIE = "ams_admin_oidc_nonce";
export const OIDC_NEXT_COOKIE = "ams_admin_oidc_next";
export const OIDC_TEMP_COOKIE_MAX_AGE = 10 * 60;

/** Something Keycloak does for a signed-in person on its own page ("application initiated action"). */
export type KeycloakAction = "UPDATE_PASSWORD";

/**
 * Keycloak nests realm roles one level down. Client roles live under
 * `resource_access[client].roles`; the dashboard only grants on realm roles so
 * the same account works against the public site and this one.
 */
interface KeycloakAccessToken extends JWTPayload {
  readonly realm_access?: { readonly roles?: readonly string[] };
  readonly preferred_username?: string;
  readonly name?: string;
  readonly email?: string;
}

export function randomUrlSafe(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function safeReturnPath(value: string | null | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

/** Keycloak's sign-in form, for this browser's state, nonce and PKCE challenge. */
export function authorizationUrl(state: string, nonce: string, challenge: string, action?: KeycloakAction): URL {
  const config = oidcConfig();
  const url = new URL(`${config.issuer}/protocol/openid-connect/auth`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (action) url.searchParams.set("kc_action", action);
  return url;
}

/** Swaps the code for tokens; null when Keycloak refuses it. */
export async function exchangeCode(code: string, verifier: string): Promise<OidcTokenResponse | null> {
  const config = oidcConfig();
  const response = await fetch(`${config.internalIssuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      code_verifier: verifier,
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const tokens = (await response.json().catch(() => null)) as OidcTokenResponse | null;
  return tokens?.access_token && tokens.id_token ? tokens : null;
}

/** The saved return path, plus how a Keycloak action ended (`kc_action_status`) as `?password=`. */
export function returnUrl(next: string, siteUrl: string, actionStatus: string | null): URL {
  const url = new URL(next, siteUrl);
  if (actionStatus === "success" || actionStatus === "cancelled" || actionStatus === "error") {
    url.searchParams.set("password", actionStatus);
  }
  return url;
}

/** Ends the Keycloak session from this server; its sign-in cookie stops working with it. */
export async function endKeycloakSession(refreshToken: string): Promise<void> {
  const config = oidcConfig();
  await fetch(`${config.internalIssuer}/protocol/openid-connect/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken }),
    cache: "no-store",
  }).catch(() => undefined);
}

/**
 * One JWKS per Keycloak endpoint, kept for the life of the process.
 *
 * `createRemoteJWKSet` caches the fetched keys *on the instance*. Building a
 * new one per verification would therefore hit Keycloak on every page render,
 * which is both slow and a good way to get rate-limited by your own auth
 * server. Docker uses a private endpoint while tokens retain the public issuer.
 */
const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwks() {
  const { internalIssuer } = oidcConfig();
  let keySet = jwksByIssuer.get(internalIssuer);

  if (!keySet) {
    keySet = createRemoteJWKSet(
      new URL(`${internalIssuer}/protocol/openid-connect/certs`),
    );
    jwksByIssuer.set(internalIssuer, keySet);
  }

  return keySet;
}

/**
 * The access token is checked without an audience constraint on purpose:
 * Keycloak issues it to `account`, not to the dashboard. Issuer and signature
 * are what matter — the role claim is read from it because that is the token
 * the Spring API will also see.
 */
export async function verifyAccessToken(
  token: string,
): Promise<KeycloakAccessToken> {
  const config = oidcConfig();
  const { payload } = await jwtVerify(token, jwks(), {
    issuer: config.issuer,
  });
  return payload as KeycloakAccessToken;
}

/** Keycloak's signature, issuer, audience and this browser's nonce on the ID token. */
export async function verifyIdToken(token: string, expectedNonce: string) {
  const config = oidcConfig();
  const { payload } = await jwtVerify(token, jwks(), { issuer: config.issuer, audience: config.clientId });
  if (payload.nonce !== expectedNonce) {
    throw new Error("The identity token nonce is invalid");
  }
  return payload;
}

export function hasBackofficeRole(payload: KeycloakAccessToken): boolean {
  return hasBackofficeAccess(payload.realm_access?.roles ?? []);
}
