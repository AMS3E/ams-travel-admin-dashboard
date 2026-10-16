"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, RefreshCw, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCustomerMutation } from "@/features/people/api/people-api";
import { AvatarPicker, ProfileAvatar } from "@/features/profile/components/avatar-picker";
import { useAvatarUpload } from "@/features/profile/use-avatar-upload";
import { useApiErrorMessage } from "@/store/api/api-error";
import { ErrorBanner, useTheirPhoto } from "./customer-row";

/**
 * Readable rather than maximal: this password gets read out or pasted into a
 * message once, and the customer changes it whenever they like. No look-alike
 * characters.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassword(length = 14): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return [...values].map((value) => ALPHABET[value % ALPHABET.length]).join("");
}

/**
 * Registers a customer from the back office.
 *
 * Creates both halves: a sign-in account in the `amstravel` realm and the
 * profile row that belongs to it, photo included. Customers normally arrive
 * by registering on the public site — this reaches the same outcome from the
 * inside.
 *
 * The password is generated here and shown once, because Keycloak keeps only a
 * hash and nothing can read it back afterwards. Same handover the staff form
 * makes.
 *
 * Opened and closed by the Users screen's toolbar; rendered only for
 * `PERM_USER_MANAGE`, and the API enforces the same rule.
 */
export function NewCustomerForm({ onClose }: { readonly onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState({ key: "", url: "" });
  const [password, setPassword] = useState(generatePassword);
  /* On by default: the customer picks a password only they know. */
  const [temporary, setTemporary] = useState(true);
  const [handover, setHandover] = useState<{
    name: string;
    email: string;
    avatarUrl: string;
    password: string;
    temporary: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [createCustomer, { isLoading, error, reset }] = useCreateCustomerMutation();
  const photo = useAvatarUpload(setAvatar);
  const busy = isLoading || photo.uploading;
  const t = useTranslations("people");
  const apiErrorMessage = useApiErrorMessage();
  const theirPhoto = useTheirPhoto();

  function clear() {
    setName("");
    setEmail("");
    setPhone("");
    setAvatar({ key: "", url: "" });
    setPassword(generatePassword());
    setTemporary(true);
    photo.clearFailure();
    reset();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    try {
      const customer = await createCustomer({
        fullName: name.trim(),
        email: email.trim(),
        password,
        temporaryPassword: temporary,
        /* Omitted rather than empty: the API treats blank as "none". */
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(avatar.key.trim() ? { avatarKey: avatar.key.trim() } : {}),
      }).unwrap();
      /* Held in state and never re-read — Keycloak keeps only a hash. */
      setHandover({
        name: customer.fullName?.trim() || name.trim(),
        email: customer.email,
        avatarUrl: customer.avatarUrl ?? avatar.url,
        password,
        temporary,
      });
      setCopied(false);
      clear();
    } catch {
      /* The banner renders it; unwrap only needs to not go unhandled. */
    }
  }

  if (handover) {
    return (
      <section aria-labelledby="customer-created" className="panel overflow-hidden">
        <div className="flex items-center gap-4 border-b border-line bg-success-soft px-4 py-3">
          <ProfileAvatar className="size-12 text-base ring-2 ring-paper" name={handover.name} src={handover.avatarUrl} />
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-md font-semibold text-teal-deep" id="customer-created">
              <Check aria-hidden className="size-4" />
              {t("newCustomer.created", { name: handover.name })}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {t("newCustomer.handover", { temporary: handover.temporary ? "yes" : "no" })}
            </p>
          </div>
        </div>

        <dl className="m-4 grid gap-2 rounded-md border border-line bg-sand px-3 py-2.5 font-mono text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">{t("fields.email")}</dt>
          <dd className="break-all text-ink">{handover.email}</dd>
          <dt className="text-muted">{t("fields.password")}</dt>
          <dd className="text-ink">{handover.password}</dd>
        </dl>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-sand px-4 py-3">
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(
                t("handover.customerClipboard", { email: handover.email, password: handover.password }),
              );
              setCopied(true);
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
            {copied ? t("handover.copied") : t("handover.copy")}
          </Button>
          <Button onClick={() => setHandover(null)} size="sm" type="button" variant="ghost">
            <UserPlus aria-hidden className="size-3.5" />
            {t("handover.createAnother")}
          </Button>
          <Button onClick={onClose} size="sm" type="button">
            {t("handover.done")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <form aria-labelledby="new-customer" className="panel overflow-hidden" noValidate onSubmit={submit}>
      <header className="flex items-start gap-3 border-b border-line px-4 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-md font-semibold text-ink" id="new-customer">
            {t("newCustomer.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{t("newCustomer.description")}</p>
        </div>
        <Button aria-label={t("editing.close")} disabled={busy} onClick={onClose} size="icon-sm" type="button" variant="ghost">
          <X aria-hidden className="size-4" />
        </Button>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">
        {error ? <ErrorBanner message={apiErrorMessage(error)} /> : null}

        <FormField hint={theirPhoto.hint} label={theirPhoto.label}>
          {(field) => (
            <AvatarPicker
              describedBy={field["aria-describedby"]}
              failure={photo.failure}
              id={field.id}
              labels={theirPhoto.labels}
              name={name}
              onChoose={photo.choose}
              onFile={(file) => void photo.upload(file)}
              onRemove={() => {
                setAvatar({ key: "", url: "" });
                photo.clearFailure();
              }}
              previewUrl={avatar.url}
              uploading={photo.uploading}
              value={avatar.key}
            />
          )}
        </FormField>
        <input {...photo.inputProps} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("fields.name")} required>
            {(field) => (
              <Input
                {...field}
                autoComplete="off"
                maxLength={255}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            )}
          </FormField>

          <FormField hint={t("newCustomer.emailHint")} label={t("fields.email")} required>
            {(field) => (
              <Input
                {...field}
                autoComplete="off"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            )}
          </FormField>

          <FormField hint={t("newCustomer.phoneHint")} label={t("fields.phone")}>
            {(field) => (
              <Input
                {...field}
                autoComplete="off"
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                value={phone}
              />
            )}
          </FormField>

          <FormField hint={t("fields.shownOnce")} label={t("fields.password")}>
            {(field) => (
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <KeyRound aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" />
                  <Input
                    {...field}
                    className="pl-8 font-mono"
                    minLength={8}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    value={password}
                  />
                </div>
                <Button
                  aria-label={t("fields.generatePassword")}
                  onClick={() => setPassword(generatePassword())}
                  size="icon"
                  title={t("fields.generatePassword")}
                  type="button"
                  variant="secondary"
                >
                  <RefreshCw aria-hidden className="size-4" />
                </Button>
              </div>
            )}
          </FormField>
        </div>

        <Label className="flex items-center gap-2.5 font-normal">
          <Checkbox checked={temporary} onChange={(event) => setTemporary(event.target.checked)} />
          {t("fields.askNewPassword")}
        </Label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-sand px-4 py-3">
        <Button disabled={busy} onClick={onClose} size="sm" type="button" variant="ghost">
          {t("editing.cancel")}
        </Button>
        <Button
          disabled={busy || !name.trim() || !email.trim() || password.length < 8}
          size="sm"
          type="submit"
        >
          {isLoading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <UserPlus aria-hidden className="size-3.5" />}
          {isLoading ? t("newCustomer.creating") : photo.uploading ? t("newCustomer.uploadingPhoto") : t("newCustomer.create")}
        </Button>
      </div>
    </form>
  );
}
