import { z } from "zod";
import type { BackendUserResponse } from "@/features/auth/types";

/**
 * A MinIO object key as the media service writes it:
 * `{category}/{ownerUuid}/{fileName}` — e.g. `avatar/3f2c…/9b1d….png`.
 * Never a URL: the API builds the URL from the key on every read.
 */
const MEDIA_KEY =
  /^[a-z]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[\w.-]+$/i;

/** The schema's two refusals; `common.profileForm` has them in each language. */
export interface ProfileSchemaWords {
  readonly nameRequired: string;
  readonly photoKey: string;
}

/** The profile form's rules, refusing in the words given. */
export function profileSchemaWith(words: ProfileSchemaWords) {
  return z.object({
    fullName: z.string().trim().min(1, words.nameRequired).max(255),
    avatarKey: z.string().trim().max(512).refine(
      (value) => !value || MEDIA_KEY.test(value),
      words.photoKey,
    ),
  });
}

export const profileSchema = profileSchemaWith({
  nameRequired: "Display name is required.",
  photoKey: "Upload a photo — a picture is saved by its media key, not by an address.",
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export type ProfileActionResult =
  | { readonly ok: true; readonly user: BackendUserResponse }
  | {
      readonly ok: false;
      readonly message: string;
      readonly fieldErrors?: Partial<Record<keyof ProfileFormValues, string>>;
    };
