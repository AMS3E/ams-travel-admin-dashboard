import "server-only";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/features/auth/session";
import { profileSchema, type ProfileActionResult, type ProfileFormValues } from "@/features/auth/profile-form-state";
import type { BackendUserResponse } from "@/features/auth/types";
import { BackendApiError, backendRequest } from "@/lib/backend-api.server";

/**
 * Saving the signed-in person's own name and photo (Spring `PUT /users/me`),
 * for the route handler `app/api/profile`. `expired` tells the route the
 * token was refused, so it ends the session.
 */
export type ProfileWrite = ProfileActionResult | { readonly ok: false; readonly expired: true; readonly message: string };

export async function updateProfile(values: unknown): Promise<ProfileWrite> {
  const { token } = await requireAdminSession();
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ProfileFormValues, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "fullName" || field === "avatarKey") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { ok: false, message: "Some fields need attention.", fieldErrors };
  }

  let user: BackendUserResponse;
  try {
    user = await backendRequest<BackendUserResponse>(
      "/users/me",
      {
        method: "PUT",
        body: JSON.stringify({
          fullName: parsed.data.fullName,
          /* Null removes the photo, so their initials show again. */
          avatarKey: parsed.data.avatarKey || null,
        }),
      },
      token,
    );
  } catch (error) {
    // The token was refused: the route ends the session, and the dashboard sends them to sign in.
    if (error instanceof BackendApiError && error.status === 401) return { ok: false, expired: true, message: "Your session has ended. Sign in again." };
    return { ok: false, message: "Your profile could not be saved. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, user };
}
