import "server-only";

import { revalidatePath } from "next/cache";
import {
  BUSINESS_ROLES,
  hasPermission,
  type BusinessRole,
} from "@/features/auth/permissions";
import { requireAdminSession } from "@/features/auth/session";
import {
  accountSchema,
  GENERIC_ACCOUNT_ERROR,
  type AccountFormValues,
  type ActionResult,
} from "@/features/people/form-state";
import { BackendApiError, backendRequest } from "@/lib/backend-api.server";

/**
 * Creating an account and setting its roles, both through the API.
 *
 * The permission is checked again here because the route handler in front of
 * this is a public endpoint whatever the screen shows — but it is not the boundary. The API
 * holds the Keycloak credential and enforces the same rules, including the one
 * this file cannot: an administrator may not take ADMIN off their own account.
 */
function isBusinessRole(value: string): value is BusinessRole {
  return (BUSINESS_ROLES as readonly string[]).includes(value);
}

/**
 * The API answers errors as RFC 9457 problem documents, so the sentence worth
 * showing is inside the JSON rather than being the whole body.
 */
function messageFrom(error: unknown): string {
  if (!(error instanceof BackendApiError)) return GENERIC_ACCOUNT_ERROR;
  try {
    const problem = JSON.parse(error.detail) as { detail?: string };
    return problem.detail?.trim() || GENERIC_ACCOUNT_ERROR;
  } catch {
    return error.detail || GENERIC_ACCOUNT_ERROR;
  }
}

export async function createAccount(
  values: AccountFormValues,
): Promise<ActionResult> {
  const { admin, token } = await requireAdminSession();
  if (!hasPermission(admin.roles, "PERM_USER_MANAGE") || !hasPermission(admin.roles, "PERM_ROLE_ASSIGN")) {
    return { ok: false, message: "Creating an account requires user-management and role-assignment permissions." };
  }

  const parsed = accountSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const name = issue.path[0];
      if (typeof name === "string" && !fieldErrors[name]) {
        fieldErrors[name] = issue.message;
      }
    }
    return { ok: false, message: "Some fields need attention.", fieldErrors };
  }

  /* `StaffRequest` takes the roles as a set; the form offers one to start with. */
  const { role, ...account } = parsed.data;
  try {
    const created = await backendRequest<{ id: string }>(
      "/staff",
      { method: "POST", body: JSON.stringify({ ...account, roles: [role] }) },
      token,
    );
    revalidatePath("/people");
    return { ok: true, id: created.id };
  } catch (error) {
    const message = messageFrom(error);
    if (error instanceof BackendApiError && error.status === 409) {
      return { ok: false, message, fieldErrors: { username: "Already in use." } };
    }
    return { ok: false, message };
  }
}

/** Sets exactly which business roles one account holds. */
export async function setRoles(
  id: string,
  roles: readonly string[],
): Promise<ActionResult> {
  const { admin, token } = await requireAdminSession();
  if (!hasPermission(admin.roles, "PERM_ROLE_ASSIGN")) {
    return { ok: false, message: "This account cannot assign roles." };
  }

  /*
   * Only the five business roles travel: the realm also declares two dozen
   * PERM_ roles and Keycloak its own realm-management ones. The API applies the
   * same whitelist — its request body is typed to the enum — so this is the
   * screen agreeing with it, not the screen deciding it.
   */
  const wanted = roles.filter(isBusinessRole);

  try {
    await backendRequest(
      `/staff/${encodeURIComponent(id)}/roles`,
      { method: "PUT", body: JSON.stringify({ roles: wanted }) },
      token,
    );
    revalidatePath("/people");
    revalidatePath(`/people/${id}`);
    return { ok: true, id };
  } catch (error) {
    return { ok: false, message: messageFrom(error) };
  }
}
