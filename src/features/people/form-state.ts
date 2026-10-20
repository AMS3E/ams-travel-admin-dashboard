import { z } from "zod";
import english from "@locales/en/people.json";
import { BUSINESS_ROLES } from "@/features/auth/permissions";

/**
 * Shapes shared between the people forms and the routes behind them
 * (`app/api/people`), which check them again before Spring does.
 */

/** A check's sentence, by its key under `people.validation`. */
export type ValidationMessage = keyof typeof english.validation;
export type Say = (key: ValidationMessage) => string;

const ENGLISH: Say = (key) => english.validation[key];

/**
 * Keycloak enforces its own password policy, and the realm sets none in
 * development. Eight characters is this dashboard saying that an account handed
 * to somebody else needs more than a word, without pretending to be the policy.
 */
export function accountSchemaWith(say: Say = ENGLISH) {
  return z.object({
    firstName: z.string().trim().min(1, say("firstNameRequired")),
    lastName: z.string().trim().min(1, say("lastNameRequired")),
    email: z.string().trim().email(say("emailInvalid")),
    username: z
      .string()
      .trim()
      .min(3, say("usernameShort"))
      .regex(
        /^[a-z0-9._@-]+$/,
        say("usernameCharacters"),
      ),
    password: z.string().min(8, say("passwordShort")),
    temporaryPassword: z.boolean(),
    role: z.enum(BUSINESS_ROLES),
  });
}

export const accountSchema = accountSchemaWith();

export type AccountFormValues = z.infer<typeof accountSchema>;

/** A stored photo's key (`avatar/{uuid}/{file}`), never an address. */
const MEDIA_KEY = /^[a-z]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[\w.-]+$/i;

/** An edited account, sent whole: an empty phone or photo removes it. */
export function accountChangesSchemaWith(say: Say = ENGLISH) {
  return z.object({
    firstName: z.string().trim().min(1, say("firstNameRequired")).max(64),
    lastName: z.string().trim().max(64),
    email: z.string().trim().email(say("emailInvalid")),
    phone: z.string().trim().max(50, say("phoneLong")),
    avatarKey: z.string().trim().max(512).refine((value) => !value || MEDIA_KEY.test(value), say("photoAgain")),
    enabled: z.boolean(),
  });
}

export const accountChangesSchema = accountChangesSchemaWith();

export type AccountChanges = z.infer<typeof accountChangesSchema>;

export interface ActionSuccess {
  readonly ok: true;
  /** The Keycloak id of the account the action touched. */
  readonly id: string;
}

export interface ActionFailure {
  readonly ok: false;
  readonly message: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
}

export type ActionResult = ActionSuccess | ActionFailure;
