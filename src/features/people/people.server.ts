import "server-only";

import { cache } from "react";
import type { BusinessRole } from "@/features/auth/permissions";
import { getSessionToken } from "@/features/auth/session";
import { backendRequest } from "@/lib/backend-api.server";

/**
 * Accounts, read through the API.
 *
 * The dashboard used to call Keycloak's admin API itself, which meant this
 * process held a credential that could mint an administrator. The API now owns
 * that credential and talks to Keycloak with the Keycloak Admin Client; the
 * dashboard sends the signed-in person's own token and gets back only what
 * `PERM_USER_MANAGE` allows, from `/staff`.
 */
interface StaffResponse {
  readonly id: string;
  readonly username: string;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly enabled: boolean;
  readonly roles: readonly BusinessRole[];
  readonly createdAt: string | null;
}

/** One back-office account, as the people screens show it. */
export interface Person {
  readonly id: string;
  readonly name: string;
  readonly username: string;
  readonly email: string | null;
  readonly enabled: boolean;
  readonly roles: readonly BusinessRole[];
}

function toPerson(user: StaffResponse): Person {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    id: user.id,
    name: full || user.username,
    username: user.username,
    email: user.email,
    enabled: user.enabled,
    roles: user.roles,
  };
}

/**
 * `null` means the API could not answer — Keycloak administration switched off,
 * or Keycloak itself unreachable. That is a different screen from "nobody holds
 * a role yet", so the two are not collapsed into an empty array.
 */
async function read(path: string): Promise<readonly Person[] | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const users = await backendRequest<StaffResponse[]>(path, {}, token);
    return users.map(toPerson);
  } catch {
    return null;
  }
}

export const backOfficePeople = cache(
  (): Promise<readonly Person[] | null> => read("/staff"),
);

/** Anyone in the realm, so a customer can be granted their first role. */
export async function searchPeople(query: string): Promise<readonly Person[] | null> {
  return read(`/staff?search=${encodeURIComponent(query)}`);
}

export const findPerson = cache(async (id: string): Promise<Person | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const user = await backendRequest<StaffResponse>(
      `/staff/${encodeURIComponent(id)}`,
      {},
      token,
    );
    return toPerson(user);
  } catch {
    return null;
  }
});
