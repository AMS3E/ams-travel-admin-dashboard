/*
 * The staff session as HttpOnly cookies, and how it is renewed. Shared by the
 * route handlers (through `session.ts`) and by `proxy.ts`, which both run on
 * the server; the client secret never reaches the browser.
 */

export const COOKIE_NAME = "ams_admin_token";
export const REFRESH_COOKIE_NAME = "ams_admin_refresh_token";
/** No longer written; still cleared, so sessions from before CIBA sign-in end cleanly. */
export const ID_TOKEN_COOKIE_NAME = "ams_admin_id_token";
export const SESSION_COOKIES = [COOKIE_NAME, REFRESH_COOKIE_NAME, ID_TOKEN_COOKIE_NAME] as const;

/** Used when Keycloak names no refresh lifetime. */
const FALLBACK_MAX_AGE = 60 * 60 * 24 * 30;
/** Renew this long before expiry, so a token never runs out mid-request. */
const EXPIRY_MARGIN_SECONDS = 30;

export interface OidcTokenResponse {
  readonly access_token: string;
  readonly refresh_token?: string;
  readonly id_token?: string;
  readonly expires_in: number;
  readonly refresh_expires_in?: number;
}

export interface CookieOptions {
  readonly httpOnly: true;
  readonly sameSite: "lax";
  readonly secure: boolean;
  readonly path: "/";
  readonly maxAge: number;
}

/** Anything with Next's `cookies.set(name, value, options)`: a request's store or a response's. */
export interface CookieWriter {
  set(name: string, value: string, options: CookieOptions): unknown;
}

export function cookieOptions(maxAge: number): CookieOptions {
  return { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge };
}

/** Keycloak settings. The client is confidential: its secret stays on this server. */
export function oidcConfig() {
  const issuer = (process.env.KEYCLOAK_ISSUER_URL ?? "http://localhost:9090/realms/amsadmin").replace(/\/$/, "");
  const internalIssuer = (process.env.KEYCLOAK_INTERNAL_URL ?? issuer).replace(/\/$/, "");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  return {
    issuer,
    internalIssuer,
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? "amsadmin-dashboard",
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? "",
    redirectUri: `${siteUrl}/api/auth/callback`,
    siteUrl,
  };
}

/** Writes a token response; the refresh token lives as long as the Keycloak session. */
export function writeSession(cookies: CookieWriter, tokens: OidcTokenResponse): void {
  cookies.set(COOKIE_NAME, tokens.access_token, cookieOptions(tokens.expires_in));
  if (tokens.refresh_token) {
    cookies.set(REFRESH_COOKIE_NAME, tokens.refresh_token, cookieOptions(tokens.refresh_expires_in || FALLBACK_MAX_AGE));
  }
}

export function clearSessionCookies(cookies: CookieWriter): void {
  for (const name of SESSION_COOKIES) cookies.set(name, "", cookieOptions(0));
}

/** True when the token is unreadable or expires within the margin; the signature is checked elsewhere. */
export function expiresSoon(token: string, nowSeconds = Date.now() / 1000): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: unknown };
    return typeof payload.exp !== "number" || payload.exp - EXPIRY_MARGIN_SECONDS <= nowSeconds;
  } catch {
    return true;
  }
}

/**
 * One refresh-token grant. "refused" means the session is over; "unavailable"
 * means Keycloak could not be reached, which is no reason to sign anyone out.
 */
export async function refreshTokens(refreshToken: string): Promise<OidcTokenResponse | "refused" | "unavailable"> {
  const config = oidcConfig();
  let response: Response;
  try {
    response = await fetch(`${config.internalIssuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    });
  } catch {
    return "unavailable";
  }
  if (response.status >= 500) return "unavailable";
  if (!response.ok) return "refused";
  const tokens = (await response.json().catch(() => null)) as OidcTokenResponse | null;
  return tokens?.access_token ? tokens : "refused";
}
