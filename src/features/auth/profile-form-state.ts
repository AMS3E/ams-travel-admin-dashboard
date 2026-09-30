import { z } from "zod";
import type { BackendUserResponse } from "@/features/auth/types";

/**
 * A MinIO object key as the media service writes it:
 * `{category}/{ownerUuid}/{fileName}` — e.g. `avatar/3f2c…/9b1d….png`.
 * Never a URL: the API builds the URL from the key on every read.
 */
const MEDIA_KEY =
  /^[a-z]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[\w.-]+$/i;

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Display name is required.").max(255),
  avatarKey: z.string().trim().max(512).refine(
    (value) => !value || MEDIA_KEY.test(value),
    "Upload a photo — a picture is saved by its media key, not by an address.",
  ),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export type ProfileActionResult =
  | { readonly ok: true; readonly user: BackendUserResponse }
  | {
      readonly ok: false;
      readonly message: string;
      readonly fieldErrors?: Partial<Record<keyof ProfileFormValues, string>>;
    };
