import { createAccount } from "@/features/people/api/people-writes.server";
import type { AccountFormValues } from "@/features/people/form-state";
import { runWrite } from "@/lib/api-route.server";

/** `POST` — a new back-office account in Keycloak (Spring `POST /staff`), with the role it starts with. */
export async function POST(request: Request) {
  return runWrite(request, (body) => createAccount(body as AccountFormValues));
}
