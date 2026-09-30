"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Check, Copy, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BUSINESS_ROLES, type BusinessRole } from "@/features/auth/permissions";
import { WORKSPACE_ACCESS } from "@/features/people/workspace-roles";
import { ROLE_PROFILES } from "@/features/dashboard/roles";
import { useCreateAccountMutation } from "@/features/people/api/people-api";
import { settled } from "@/store/api/api-error";
import {
  accountSchema,
  type AccountFormValues,
} from "@/features/people/form-state";

/**
 * Readable rather than maximal: this password gets typed once, out of a message
 * or off a piece of paper, and Keycloak asks for a new one at first sign-in
 * anyway. No look-alike characters.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassword(length = 14): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return [...values].map((value) => ALPHABET[value % ALPHABET.length]).join("");
}

const BLANK = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  temporaryPassword: true,
  role: "PARTNER",
} as const;

interface Handover {
  readonly username: string;
  readonly password: string;
  readonly temporary: boolean;
  readonly role: AccountFormValues["role"];
}

export function AccountForm({ initialRole = "PARTNER" }: { readonly initialRole?: BusinessRole }) {
  const [createAccount] = useCreateAccountMutation();
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [banner, setBanner] = useState<string | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { ...BLANK, role: initialRole, password: generatePassword() },
  });
  const selectedRole = useWatch({ control: form.control, name: "role" });

  const errors = form.formState.errors;

  function submit(values: AccountFormValues) {
    setBanner(null);

    startSaving(async () => {
      const result = await settled(createAccount(values).unwrap());

      if (!result.ok) {
        setBanner(result.message);
        for (const [name, message] of Object.entries("fieldErrors" in result ? (result.fieldErrors ?? {}) : {})) {
          form.setError(name as keyof AccountFormValues, { message });
        }
        return;
      }

      /*
       * Held in state, never re-read from anywhere: Keycloak stores a hash, so
       * this is the only moment the password can be handed over.
       */
      setHandover({
        username: values.username,
        password: values.password,
        temporary: values.temporaryPassword,
        role: values.role,
      });
      // The people list around this form is rendered on the server.
      router.refresh();
    });
  }

  if (handover) {
    return (
      <div className="panel flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 text-teal-deep">
          <Check aria-hidden className="size-4" />
          <h2 className="text-sm font-semibold">Account created</h2>
        </div>

        <p className="text-sm text-muted">
          Hand these over now. The password is not stored and this dashboard
          cannot show it again.
          {handover.temporary
            ? " Keycloak asks for a new one at the first sign-in."
            : null}
          {" They can change it any time from Profile → Change password."}
        </p>

        <dl className="grid gap-3 rounded-md border border-line bg-sand px-3 py-2.5 font-mono text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Username</dt>
          <dd className="text-ink">{handover.username}</dd>
          <dt className="text-muted">Password</dt>
          <dd className="text-ink">{handover.password}</dd>
          <dt className="text-muted">Dashboard</dt>
          <dd className="text-ink">{ROLE_PROFILES[handover.role].title}</dd>
        </dl>

        <p className="text-sm text-muted">
          The new user signs in through the same dashboard login page. Use a
          separate browser session to try their account while keeping yours open.
        </p>

        <div className="rounded-md border border-teal/15 bg-teal-soft px-3 py-2.5 text-sm text-teal-deep">
          <p className="font-semibold">What they will see</p>
          <p className="mt-1">{WORKSPACE_ACCESS[handover.role]}</p>
          {handover.role === "PARTNER" || handover.role === "CONTRIBUTOR" ? (
            <p className="mt-2">Their workspace starts empty. Records they create belong to their account.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(
                `Username: ${handover.username}\nPassword: ${handover.password}`,
              );
              setCopied(true);
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            {copied ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
            {copied ? "Copied" : "Copy credentials"}
          </Button>

          <Button
            onClick={() => {
              form.reset({ ...BLANK, role: initialRole, password: generatePassword() });
              setCopied(false);
              setHandover(null);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Create another
          </Button>

          <Button onClick={() => router.push("/people")} size="sm" type="button">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="panel flex flex-col gap-4 p-4"
      onSubmit={form.handleSubmit(submit)}
    >
      {banner ? (
        <div
          className="flex gap-2.5 rounded-md border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-heritage"
          role="alert"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">{banner}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField error={errors.firstName?.message} label="First name" required>
          {(field) => <Input {...field} {...form.register("firstName")} />}
        </FormField>

        <FormField error={errors.lastName?.message} label="Last name" required>
          {(field) => <Input {...field} {...form.register("lastName")} />}
        </FormField>

        <FormField error={errors.email?.message} label="E-mail" required>
          {(field) => (
            <Input {...field} type="email" {...form.register("email")} />
          )}
        </FormField>

        <FormField
          error={errors.username?.message}
          hint="What they type at sign-in. Keycloak will not let it change later."
          label="Username"
          required
        >
          {(field) => <Input {...field} {...form.register("username")} />}
        </FormField>

        <FormField
          className="sm:col-span-2"
          error={errors.role?.message}
          hint="One role now; the rest can be granted from the account afterwards."
          label="Role"
          required
        >
          {(field) => (
            <Select {...field} {...form.register("role")}>
              {BUSINESS_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role} — {ROLE_PROFILES[role].blurb}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          className="sm:col-span-2"
          error={errors.password?.message}
          hint="Shown once, after the account is created."
          label="Temporary password"
          required
        >
          {(field) => (
            <div className="flex gap-2">
              <Input
                {...field}
                className="font-mono"
                {...form.register("password")}
              />
              <Button
                aria-label="Generate a new password"
                onClick={() =>
                  form.setValue("password", generatePassword(), {
                    shouldValidate: true,
                  })
                }
                size="icon"
                type="button"
                variant="secondary"
              >
                <RefreshCw aria-hidden className="size-4" />
              </Button>
            </div>
          )}
        </FormField>
      </div>

      <div className="rounded-md border border-teal/15 bg-teal-soft px-3 py-2.5 text-sm text-teal-deep" aria-live="polite">
        <p className="font-semibold">{ROLE_PROFILES[selectedRole].title}</p>
        <p className="mt-1">{WORKSPACE_ACCESS[selectedRole]}</p>
      </div>

      <Label className="flex items-center gap-2.5 font-normal">
        <Checkbox {...form.register("temporaryPassword")} />
        Ask for a new password at the first sign-in
      </Label>

      <div className="flex justify-end gap-2">
        <Button
          disabled={saving}
          onClick={() => router.push("/people")}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button disabled={saving} type="submit">
          {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          Create account
        </Button>
      </div>
    </form>
  );
}
