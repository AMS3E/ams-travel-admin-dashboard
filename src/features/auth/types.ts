/**
 * `GET /users/me` — the row in the local `users` table that Keycloak identity
 * maps onto. The API stamps a destination's `createdBy` with this `id` (a
 * UUID), not with the Keycloak subject, so ownership is compared against it.
 */
export interface BackendUserResponse {
  readonly id: string;
  readonly email: string;
  readonly fullName: string | null;
  /** The MinIO key of their photo — what a profile edit sends back. */
  readonly avatarKey: string | null;
  /** Where to show it from. */
  readonly avatarUrl: string | null;
  readonly phone: string | null;
  readonly status: "ACTIVE" | "INACTIVE";
  readonly lastLoginAt: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  /** Business role codes mirrored from Keycloak: USER, PARTNER, CONTRIBUTOR, EDITOR, BDO, ADMIN. */
  readonly roles: readonly string[];
}

/** A person's name as the screens show it, never blank. */
export function displayName(user: Pick<BackendUserResponse, "fullName" | "email">): string {
  return user.fullName?.trim() || user.email;
}

export interface AdminUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly username: string;
  readonly avatarUrl?: string | null;
  readonly roles: readonly string[];
}

export interface KeycloakClaims {
  readonly sub?: string;
  readonly name?: string;
  readonly email?: string;
  readonly preferred_username?: string;
  readonly realm_access?: { readonly roles?: readonly string[] };
}

export function toAdminUser(claims: KeycloakClaims): AdminUser {
  const username = claims.preferred_username ?? claims.email ?? "";
  return {
    id: claims.sub ?? "",
    name: claims.name ?? username,
    email: claims.email ?? "",
    username,
    roles: claims.realm_access?.roles ?? [],
  };
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}
