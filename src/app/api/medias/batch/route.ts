import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import type { MediaResponse } from "@/features/catalog/api/contracts";
import { IMAGE_CATEGORIES } from "@/features/catalog/image-category";
import { requireAdminToken, toErrorResponse } from "@/lib/api-route.server";
import { backendRequest } from "@/lib/backend-api.server";

const MAX_BYTES = 8 * 1024 * 1024;
/** What the API accepts in one batch; the caller sends more in several. */
const MAX_FILES = 10;
const CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/**
 * Uploads several pictures at once and hands back a `MediaResponse` for each,
 * in the order they were sent — the same shape as one upload, as a list.
 *
 * The API stores a batch all or nothing: every file is checked before the
 * first is written, and anything already written is removed if a later one
 * fails. So a rejected batch leaves no half-filled gallery behind.
 *
 * The size and type are checked here as well as in the browser — the browser
 * check is a courtesy, this one is the rule.
 */
export async function POST(request: NextRequest) {
  const session = await requireAdminToken();
  if ("response" in session) return session.response;

  const form = await request.formData().catch(() => null);
  const requested = form?.get("category");
  const category = typeof requested === "string" && requested ? requested : "general";
  const files = (form?.getAll("file") ?? []).filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (!(IMAGE_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json(
      { message: (await getTranslations("errors.api"))("unknownFolder", { folder: String(category) }) },
      { status: 400 },
    );
  }
  if (files.length === 0) {
    return NextResponse.json({ message: (await getTranslations("errors.api"))("chooseImages") }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { message: (await getTranslations("errors.api"))("tooManyImages", { max: MAX_FILES }) },
      { status: 400 },
    );
  }
  /* Name the file that is wrong: "one of them is too big" helps nobody. */
  for (const file of files) {
    if (!CONTENT_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: (await getTranslations("errors.api"))("notAnImage", { file: file.name }) },
        { status: 415 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { message: (await getTranslations("errors.api"))("largerThan", { file: file.name }) },
        { status: 413 },
      );
    }
  }

  const body = new FormData();
  for (const file of files) body.append("files", file, file.name);

  try {
    const uploaded = await backendRequest<MediaResponse[]>(
      `/media/files/batch?type=${encodeURIComponent(category)}`,
      { method: "POST", body },
      session.token,
    );
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
