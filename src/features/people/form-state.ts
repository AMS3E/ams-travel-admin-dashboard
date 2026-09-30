import { z } from "zod";
import { BUSINESS_ROLES } from "@/features/auth/permissions";

/**
 * Shapes shared between the people forms and the routes behind them
 * (`app/api/people`), which check them again before Spring does.
 */

/**
 * Keycloak enforces its own password policy, and the realm sets none in
 * development. Eight characters is this dashboard saying that an account handed
 * to somebody else needs more than a word, without pretending to be the policy.
 */
export const accountSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid e-mail address"),
  username: z
    .string()
    .trim()
    .min(3, "Username needs at least three characters")
    .regex(
      /^[a-z0-9._@-]+$/,
      "Use lowercase letters, digits, and . _ - @ only",
    ),
  password: z.string().min(8, "Use at least eight characters"),
  temporaryPassword: z.boolean(),
  role: z.enum(BUSINESS_ROLES),
});

export type AccountFormValues = z.infer<typeof accountSchema>;

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

export const GENERIC_ACCOUNT_ERROR =
  "Keycloak rejected this change. Check the details and try again.";
