"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endKeycloakSession } from "@/features/auth/oidc";
import { clearSession, getRefreshToken } from "@/features/auth/session";

export async function logoutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();
  await clearSession();
  // Ends the session in Keycloak too, from this server; no Keycloak page is shown.
  if (refreshToken) await endKeycloakSession(refreshToken);
  revalidatePath("/", "layout");
  redirect("/login");
}
