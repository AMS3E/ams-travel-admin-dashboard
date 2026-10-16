"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Check, Copy, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BUSINESS_ROLES, type BusinessRole } from "@/features/auth/permissions";
import { useCreateAccountMutation } from "@/features/people/api/people-api";
import { settled } from "@/store/api/api-error";
import {
  accountSchemaWith,
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
  const t = useTranslations("people");
  const profiles = useTranslations("common.roleProfiles");
  const say = useTranslations("people.validation");
  const schema = useMemo(() => accountSchemaWith((key) => say(key)), [say]);
  const [createAccount] = useCreateAccountMutation();
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [banner, setBanner] = useState<string | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
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
          <h2 className="text-sm font-semibold">{t("accountForm.created")}</h2>
        </div>

        <p className="text-sm text-muted">
          {t("accountForm.handover", { temporary: handover.temporary ? "yes" : "no" })}
        </p>

        <dl className="grid gap-3 rounded-md border border-line bg-sand px-3 py-2.5 font-mono text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">{t("fields.username")}</dt>
          <dd className="text-ink">{handover.username}</dd>
          <dt className="text-muted">{t("fields.password")}</dt>
          <dd className="text-ink">{handover.password}</dd>
          <dt className="text-muted">{t("accountForm.dashboard")}</dt>
          <dd className="text-ink">{profiles(`${handover.role}.title`)}</dd>
        </dl>

        <p className="text-sm text-muted">{t("accountForm.signInNote")}</p>

        <div className="rounded-md border border-teal/15 bg-teal-soft px-3 py-2.5 text-sm text-teal-deep">
          <p className="font-semibold">{t("accountForm.whatTheySee")}</p>
          <p className="mt-1">{t(`workspaceAccess.${handover.role}`)}</p>
          {handover.role === "PARTNER" || handover.role === "CONTRIBUTOR" ? (
            <p className="mt-2">{t("accountForm.startsEmpty")}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(
                t("handover.staffClipboard", { username: handover.username, password: handover.password }),
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
            {copied ? t("handover.copied") : t("handover.copy")}
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
            {t("handover.createAnother")}
          </Button>

          <Button onClick={() => router.push("/people")} size="sm" type="button">
            {t("handover.done")}
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
        <FormField error={errors.firstName?.message} label={t("fields.firstName")} required>
          {(field) => <Input {...field} {...form.register("firstName")} />}
        </FormField>

        <FormField error={errors.lastName?.message} label={t("fields.lastName")} required>
          {(field) => <Input {...field} {...form.register("lastName")} />}
        </FormField>

        <FormField error={errors.email?.message} label={t("fields.email")} required>
          {(field) => (
            <Input {...field} type="email" {...form.register("email")} />
          )}
        </FormField>

        <FormField
          error={errors.username?.message}
          hint={t("accountForm.usernameHint")}
          label={t("fields.username")}
          required
        >
          {(field) => <Input {...field} {...form.register("username")} />}
        </FormField>

        <FormField
          className="sm:col-span-2"
          error={errors.role?.message}
          hint={t("accountForm.roleHint")}
          label={t("accountForm.role")}
          required
        >
          {(field) => (
            <Select {...field} {...form.register("role")}>
              {BUSINESS_ROLES.map((role) => (
                <option key={role} value={role}>
                  {t("accountForm.roleOption", { role: t(`roleCodes.${role}`), blurb: profiles(`${role}.blurb`) })}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          className="sm:col-span-2"
          error={errors.password?.message}
          hint={t("fields.shownOnce")}
          label={t("accountForm.temporaryPassword")}
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
                aria-label={t("fields.generatePassword")}
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
        <p className="font-semibold">{profiles(`${selectedRole}.title`)}</p>
        <p className="mt-1">{t(`workspaceAccess.${selectedRole}`)}</p>
      </div>

      <Label className="flex items-center gap-2.5 font-normal">
        <Checkbox {...form.register("temporaryPassword")} />
        {t("fields.askNewPassword")}
      </Label>

      <div className="flex justify-end gap-2">
        <Button
          disabled={saving}
          onClick={() => router.push("/people")}
          type="button"
          variant="ghost"
        >
          {t("editing.cancel")}
        </Button>
        <Button disabled={saving} type="submit">
          {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {t("accountForm.create")}
        </Button>
      </div>
    </form>
  );
}
