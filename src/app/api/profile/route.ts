import { NextResponse } from "next/server";
import { updateProfile } from "@/features/auth/api/profile-writes.server";
import { clearSession } from "@/features/auth/session";
import { hasValidRequestOrigin, requireAdminToken, toErrorResponse } from "@/lib/api-route.server";

/**
 * `PUT` — the signed-in person's own name and photo key. Answers the save's
 * `{ ok }` result; a token Spring refused ends the session here and answers
 * 401, which sends the dashboard to sign in again.
 */
export async function PUT(request: Request) {
  const session = await requireAdminToken();
  if ("response" in session) return session.response;
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }
  try {
    const result = await updateProfile(await request.json().catch(() => null));
    if (!result.ok && "expired" in result) {
      await clearSession();
      return NextResponse.json({ message: result.message }, { status: 401 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
