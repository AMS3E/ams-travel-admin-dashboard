"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useUpdateAccountMutation } from "@/features/people/api/people-api";
import { ErrorBanner, useTheirPhoto } from "@/features/people/components/customer-row";
import type { Person } from "@/features/people/people.server";
import { AvatarPicker } from "@/features/profile/components/avatar-picker";
import { useAvatarUpload } from "@/features/profile/use-avatar-upload";
import { cn } from "@/lib/utils";
import { settled } from "@/store/api/api-error";

interface AccountProfileFormProps {
  readonly person: Person;
  /** True when the signed-in administrator is editing their own account. */
  readonly self: boolean;
}

/** A back-office account's photo and details, edited by whoever manages accounts. */
export function AccountProfileForm({ person, self }: AccountProfileFormProps) {
  const router = useRouter();
  const [updateAccount, { isLoading }] = useUpdateAccountMutation();
  const [firstName, setFirstName] = useState(person.firstName);
  const [lastName, setLastName] = useState(person.lastName);
  const [email, setEmail] = useState(person.email ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [enabled, setEnabled] = useState(person.enabled);
  const [avatar, setAvatar] = useState({ key: person.avatarKey ?? "", url: person.avatarUrl ?? "" });
  const [failure, setFailure] = useState<{ message: string; fields: Readonly<Record<string, string>> } | null>(null);
  const [saved, setSaved] = useState(false);
  const photo = useAvatarUpload(setAvatar);
  const t = useTranslations("people");
  const theirPhoto = useTheirPhoto();

  const dirty =
    firstName.trim() !== person.firstName ||
    lastName.trim() !== person.lastName ||
    email.trim().toLowerCase() !== (person.email ?? "").toLowerCase() ||
    phone.trim() !== (person.phone ?? "") ||
    enabled !== person.enabled ||
    avatar.key !== (person.avatarKey ?? "");
  const busy = isLoading || photo.uploading;

  function changed<T>(set: (value: T) => void) {
    return (value: T) => {
      setSaved(false);
      setFailure(null);
      set(value);
    };
  }

  function discard() {
    setFirstName(person.firstName);
    setLastName(person.lastName);
    setEmail(person.email ?? "");
    setPhone(person.phone ?? "");
    setEnabled(person.enabled);
    setAvatar({ key: person.avatarKey ?? "", url: person.avatarUrl ?? "" });
    setFailure(null);
    photo.clearFailure();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const result = await settled(
      updateAccount({
        id: person.id,
        changes: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          /* Empty removes the number or the photo; neither is stored blank. */
          phone: phone.trim(),
          avatarKey: avatar.key.trim(),
          enabled,
        },
      }).unwrap(),
    );
    if (result.ok) {
      setFailure(null);
      setSaved(true);
      /* The account page around this form is rendered on the server. */
      router.refresh();
    } else {
      setSaved(false);
      setFailure({ message: result.message, fields: ("fieldErrors" in result && result.fieldErrors) || {} });
    }
  }

  return (
    <form aria-label={t("editing.editName", { name: person.name })} className="panel overflow-hidden" noValidate onSubmit={submit}>
      <div className="flex flex-col gap-4 p-4">
        {failure ? <ErrorBanner message={failure.message} /> : null}

        <FormField error={failure?.fields.avatarKey} hint={theirPhoto.hint} label={theirPhoto.label}>
          {(field) => (
            <AvatarPicker
              describedBy={field["aria-describedby"]}
              failure={photo.failure}
              id={field.id}
              labels={theirPhoto.labels}
              name={[firstName, lastName].join(" ").trim() || person.name}
              onChoose={photo.choose}
              onFile={(file) => void photo.upload(file)}
              onRemove={() => {
                changed(setAvatar)({ key: "", url: "" });
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
          <FormField error={failure?.fields.firstName} label={t("fields.firstName")} required>
            {(field) => (
              <Input
                {...field}
                autoComplete="off"
                maxLength={64}
                onChange={(event) => changed(setFirstName)(event.target.value)}
                required
                value={firstName}
              />
            )}
          </FormField>

          <FormField error={failure?.fields.lastName} label={t("fields.lastName")}>
            {(field) => (
              <Input
                {...field}
                autoComplete="off"
                maxLength={64}
                onChange={(event) => changed(setLastName)(event.target.value)}
                value={lastName}
              />
            )}
          </FormField>

          <FormField error={failure?.fields.email} hint={t("accountProfile.emailHint")} label={t("fields.email")} required>
            {(field) => (
              <Input
                {...field}
                autoComplete="off"
                onChange={(event) => changed(setEmail)(event.target.value)}
                required
                type="email"
                value={email}
              />
            )}
          </FormField>

          <FormField error={failure?.fields.phone} hint={t("fields.phoneRemovable")} label={t("fields.phone")}>
            {(field) => (
              <Input
                {...field}
                autoComplete="off"
                inputMode="tel"
                maxLength={50}
                onChange={(event) => changed(setPhone)(event.target.value)}
                value={phone}
              />
            )}
          </FormField>

          <FormField hint={t("accountProfile.usernameHint")} label={t("fields.username")}>
            {(field) => <Input {...field} disabled readOnly value={person.username} />}
          </FormField>

          <FormField
            hint={self ? t("accountProfile.statusSelf") : t("accountProfile.statusHint")}
            label={t("fields.status")}
          >
            {(field) => (
              <Select
                {...field}
                disabled={self}
                onChange={(event) => changed(setEnabled)(event.target.value === "enabled")}
                value={enabled ? "enabled" : "disabled"}
              >
                <option value="enabled">{t("status.activeOption")}</option>
                <option value="disabled">{t("status.disabledOption")}</option>
              </Select>
            )}
          </FormField>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5",
          dirty ? "bg-paper" : "bg-sand",
        )}
      >
        <p className="flex items-center gap-2 text-xs font-medium text-ink-soft" role="status">
          {photo.uploading ? (
            <>
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              {t("editing.uploadingPhoto")}
            </>
          ) : dirty ? (
            <>
              <span aria-hidden className="size-1.5 rounded-full bg-gold" />
              {t("editing.unsaved")}
            </>
          ) : saved ? (
            <span className="flex items-center gap-1.5 text-success">
              <Check aria-hidden className="size-3.5" />
              {t("editing.saved")}
            </span>
          ) : (
            <span className="text-muted">{t("editing.noChanges")}</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button disabled={busy || !dirty} onClick={discard} size="sm" type="button" variant="ghost">
            <RotateCcw aria-hidden className="size-3.5" />
            {t("editing.discard")}
          </Button>
          <Button disabled={busy || !dirty || !firstName.trim() || !email.trim()} size="sm" type="submit">
            {isLoading ? (
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
            ) : (
              <Save aria-hidden className="size-3.5" />
            )}
            {isLoading ? t("editing.saving") : t("editing.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
