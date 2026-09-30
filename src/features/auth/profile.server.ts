import "server-only";

import { cache } from "react";
import { oidcConfig, verifyAccessToken } from "@/features/auth/oidc";
import { requireAdminSession } from "@/features/auth/session";
import type { BackendUserResponse } from "@/features/auth/types";
import { backendRequest } from "@/lib/backend-api.server";

export const getCurrentProfile = cache(async (): Promise<BackendUserResponse> => {
  const { token } = await requireAdminSession();
  return backendRequest<BackendUserResponse>("/users/me", {}, token);
});

export interface SignInDetails {
  readonly username: string;
  readonly emailVerified: boolean;
  /** When this session signed in, as ISO 8601, or null when the token does not say. */
  readonly signedInAt: string | null;
  /** Keycloak's own account pages: the password, the authenticator app and the devices live there. */
  readonly accountUrl: string;
}

export const getSignInDetails = cache(async (): Promise<SignInDetails> => {
  const { admin, token } = await requireAdminSession();
  const accountUrl = `${oidcConfig().issuer}/account`;
  try {
    const claims = await verifyAccessToken(token);
    return {
      username: admin.username,
      emailVerified: claims.email_verified === true,
      signedInAt: typeof claims.auth_time === "number"
        ? new Date(claims.auth_time * 1000).toISOString()
        : null,
      accountUrl,
    };
  } catch {
    return { username: admin.username, emailVerified: false, signedInAt: null, accountUrl };
  }
});
