import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/features/auth/session";
import { displayName, type BackendUserResponse } from "@/features/auth/types";
import { requireAdminToken, toErrorResponse } from "@/lib/api-route.server";
import { backendRequest } from "@/lib/backend-api.server";
export async function GET() {
  const session = await requireAdminToken();
  if ("response" in session) return session.response;
  try {
    const [profile, identity] = await Promise.all([
      backendRequest<BackendUserResponse>("/users/me", {}, session.token),
      getCurrentAdmin(),
    ]);
    // The profile's roles are business roles only. Grants come from the
    // verified Keycloak token, never from a client-provided role.
    return NextResponse.json({
      ...identity,
      name: displayName(profile),
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
