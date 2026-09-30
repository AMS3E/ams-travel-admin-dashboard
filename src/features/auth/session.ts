import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasBackofficeRole, verifyAccessToken } from "@/features/auth/oidc";
import {
  COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearSessionCookies,
  writeSession,
  type OidcTokenResponse,
} from "@/features/auth/session-tokens";
import {
  toAdminUser,
  type AdminUser,
  type BackendUserResponse,
} from "@/features/auth/types";
import { backendRequest } from "@/lib/backend-api.server";

export async function createOidcSession(tokens: OidcTokenResponse): Promise<void> {
  writeSession(await cookies(), tokens);
}

export async function clearSession(): Promise<void> {
  clearSessionCookies(await cookies());
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE_NAME)?.value ?? null;
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Returns the signed-in administrator, or `null` for anyone who is not one.
 *
 * A token that is missing, expired, forged, or simply lacks the ADMIN realm
 * role all collapse to the same answer on purpose — the dashboard has one door
 * and the caller does not need to know which way it failed.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const claims = await verifyAccessToken(token);
    return hasBackofficeRole(claims) ? toAdminUser(claims) : null;
  } catch {
    return null;
  }
});

/**
 * The guard every dashboard route segment runs through. `proxy.ts` already
 * turns anonymous requests away, but it only checks that a cookie exists —
 * this is where the signature and the role are actually proven.
 */
export async function requireAdmin(returnPath?: string): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (admin) return admin;
  const next = returnPath ? `?next=${encodeURIComponent(returnPath)}` : "";
  redirect(`/login${next}`);
}

/**
 * The id (a UUID) of the local `users` row behind the Keycloak identity.
 *
 * `GET /users/me` is what provisions that row on first sight of a new subject,
 * so this doubles as the call that makes an administrator known to the API.
 * Wrapped in `cache` because a save touches it once but several code paths ask.
 */
export const getBackendUserId = cache(async (): Promise<string | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const user = await backendRequest<BackendUserResponse>("/users/me", {}, token);
    return user.id;
  } catch {
    /*
     * A missing local row must not stop a screen from rendering: it only means
     * no row can be recognised as this account's own.
     */
    return null;
  }
});

/** The pair every server action needs: who is acting, and what to send as Bearer. */
export async function requireAdminSession(): Promise<{
  readonly admin: AdminUser;
  readonly token: string;
}> {
  const [admin, token] = await Promise.all([getCurrentAdmin(), getSessionToken()]);
  if (!admin || !token) redirect("/login");
  return { admin, token };
}
