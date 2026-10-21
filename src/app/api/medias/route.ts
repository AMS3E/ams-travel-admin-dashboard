import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import type { MediaResponse } from "@/features/catalog/api/contracts";
import { IMAGE_CATEGORIES } from "@/features/catalog/image-category";
import { requireAdminToken, toErrorResponse } from "@/lib/api-route.server";
import { backendRequest } from "@/lib/backend-api.server";

const MAX_BYTES = 8 * 1024 * 1024;
const CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
/** Verification evidence may also be a PDF invoice; the API reads the bytes and holds it to the same rule. */
const EVIDENCE_TYPES = new Set([...CONTENT_TYPES, "application/pdf"]);

/**
 * Uploads a picture to MinIO through the API and hands back its
 * `MediaResponse`: the object `key`, which the form stores in the row's
 * `…Key` field, and a `uri` it previews the picture by until the row is saved.
 *
 * The size and type are checked here as well as in the browser — the browser
 * check is a courtesy, this one is the rule.
 */
export async function POST(request: NextRequest) {
  const session = await requireAdminToken();
  if ("response" in session) return session.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const requested = form?.get("category");
  const category = typeof requested === "string" && requested ? requested : "general";

  if (!(IMAGE_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json(
      { message: (await getTranslations("errors.api"))("unknownFolder", { folder: String(category) }) },
      { status: 400 },
    );
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: (await getTranslations("errors.api"))("chooseImage") }, { status: 400 });
  }
  const evidence = category === "verification";
  if (!(evidence ? EVIDENCE_TYPES : CONTENT_TYPES).has(file.type)) {
    return NextResponse.json(
      { message: (await getTranslations("errors.api"))(evidence ? "evidenceTypes" : "imageTypes") },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { message: (await getTranslations("errors.api"))(evidence ? "fileTooLarge" : "imageTooLarge") },
      { status: 413 },
    );
  }

  const body = new FormData();
  body.set("file", file, file.name);

  try {
    const uploaded = await backendRequest<MediaResponse>(
      `/media/files?type=${encodeURIComponent(category)}`,
      { method: "POST", body },
      session.token,
    );
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
