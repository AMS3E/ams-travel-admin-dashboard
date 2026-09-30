"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  AtSign,
  BadgeCheck,
  Camera,
  Check,
  LayoutDashboard,
  Loader2,
  Lock,
  Mail,
  RotateCcw,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useUpdateProfileMutation } from "@/features/auth/api/auth-api";
import { profileSchema, type ProfileFormValues } from "@/features/auth/profile-form-state";
import { displayName, type BackendUserResponse } from "@/features/auth/types";
import { mediaPath } from "@/features/catalog/resource";
import { useUploadMedia } from "@/features/media/api/media-api";
import { cn } from "@/lib/utils";
import { apiErrorMessage, settled } from "@/store/api/api-error";
import { AvatarPicker, ProfileAvatar } from "./avatar-picker";

interface ProfileEditorProps {
  readonly user: BackendUserResponse;
  readonly roleLabel: string;
  readonly username: string;
  readonly emailVerified: boolean;
  /** Cards under the form, rendered on the server. */
  readonly children?: ReactNode;
  /** Cards in the side column, rendered on the server. */
  readonly aside?: ReactNode;
}

type Banner = { readonly ok: boolean; readonly message: string };

/**
 * The profile page's one interactive part: the cover and the details form.
 *
 * They share a form so the cover previews an edit as it is typed — a new name,
 * a new photo — before anything is saved. Everything else on the page is read
 * on the server and handed in as `children` and `aside`.
 */
export function ProfileEditor({
  user,
  roleLabel,
  username,
  emailVerified,
  children,
  aside,
}: ProfileEditorProps) {
  const [updateProfile] = useUpdateProfileMutation();
  const [saving, startSaving] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadFailure, setUploadFailure] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();
  /*
   * The form saves the photo's key; this is only where it is shown from —
   * the saved `avatarUrl` until an upload replaces it with the new address.
   */
  const [saved, setSaved] = useState({ key: user.avatarKey ?? "", url: user.avatarUrl ?? "" });
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName ?? "", avatarKey: user.avatarKey ?? "" },
  });
  const name = useWatch({ control, name: "fullName" });
  const avatarKey = useWatch({ control, name: "avatarKey" });
  const shownName = name.trim() || displayName(user);
  const avatarUrl = !avatarKey
    ? ""
    : avatarKey === saved.key && saved.url
      ? saved.url
      : (uploadedUrl ?? mediaPath(avatarKey));

  function choosePhoto() {
    fileInput.current?.click();
  }

  async function upload(file: File) {
    setBanner(null);
    if (!file.type.startsWith("image/")) {
      setUploadFailure("Choose a JPEG, PNG, WebP or AVIF image.");
      return;
    }
    setUploading(true);
    setUploadFailure(null);
    try {
      const body = new FormData();
      body.set("file", file, file.name);
      body.set("category", "avatar");
      const payload = await uploadMedia(body);
      setUploadedUrl(payload.uri || mediaPath(payload.key));
      setValue("avatarKey", payload.key, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      setUploadFailure(apiErrorMessage(error));
    } finally {
      setUploading(false);
      /* Let the same file be chosen again after a failure. */
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const submit = handleSubmit((values) => {
    if (uploading || saving) return;
    setBanner(null);
    startSaving(async () => {
      try {
        const result = await settled(updateProfile(values).unwrap());
        if (result.ok) {
          setSaved({ key: result.user.avatarKey ?? "", url: result.user.avatarUrl ?? "" });
          setUploadedUrl(null);
          reset({ fullName: result.user.fullName ?? "", avatarKey: result.user.avatarKey ?? "" });
          setBanner({ ok: true, message: "Profile saved. Your team sees the change now." });
        } else {
          for (const field of ["fullName", "avatarKey"] as const) {
            const message = "fieldErrors" in result ? result.fieldErrors?.[field] : undefined;
            if (message) setError(field, { message });
          }
          setBanner(result);
        }
      } catch {
        setBanner({ ok: false, message: "Your profile could not be saved. Please try again." });
      }
    });
  });

  function discard() {
    reset();
    setUploadedUrl(null);
    setBanner(null);
    setUploadFailure(null);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <header aria-labelledby="profile-name" className="flex flex-wrap items-center gap-4">
        <div className="relative shrink-0">
          <ProfileAvatar className="size-16 text-lg ring-1 ring-line" name={shownName} src={avatarUrl} />
          <button
            aria-label="Change profile photo"
            className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border border-line bg-paper text-ink-soft shadow-xs transition-colors hover:bg-sand hover:text-ink disabled:opacity-60"
            disabled={uploading || saving}
            onClick={choosePhoto}
            title="Change profile photo"
            type="button"
          >
            {uploading ? (
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
            ) : (
              <Camera aria-hidden className="size-3.5" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="heading min-w-0 truncate text-2xl font-semibold text-ink" id="profile-name">
              {shownName}
            </h1>
            <Badge tone="info">{roleLabel}</Badge>
            {isDirty ? <Badge tone="warning">Preview · not saved</Badge> : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
              {emailVerified ? (
                <BadgeCheck aria-label="Verified email" className="size-3.5 shrink-0 text-success" role="img" />
              ) : null}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <AtSign aria-hidden className="size-3.5" />
              {username}
            </span>
          </p>
        </div>

        <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href="/dashboard">
          <LayoutDashboard aria-hidden className="size-3.5" />
          My dashboard
        </Link>
      </header>

      <input
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
        ref={fileInput}
        tabIndex={-1}
        type="file"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <form aria-labelledby="details-heading" className="panel overflow-hidden" noValidate onSubmit={submit}>
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-md font-semibold text-ink" id="details-heading">
                Personal details
              </h2>
              <p className="mt-0.5 text-xs text-muted">How you appear to your team across the back office.</p>
            </header>

            <fieldset className="flex min-w-0 flex-col gap-4 px-4 py-4" disabled={saving}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  error={errors.fullName?.message}
                  hint="Shown on your requests, decisions and in the audit log."
                  label="Display name"
                  required
                >
                  {(props) => (
                    <Input
                      {...props}
                      {...register("fullName", { onChange: () => setBanner(null) })}
                      autoComplete="name"
                      maxLength={255}
                      required
                    />
                  )}
                </FormField>

                <FormField hint="Your sign-in address. Ask an administrator to change it." label="Email">
                  {(props) => (
                    <div className="relative">
                      <Input {...props} autoComplete="email" className="pr-9 text-muted" readOnly type="email" value={user.email} />
                      <Lock aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                    </div>
                  )}
                </FormField>
              </div>

              <FormField
                error={errors.avatarKey?.message}
                hint="JPEG, PNG, WebP or AVIF, up to 8 MB. A square photo looks best."
                label="Profile photo"
              >
                {(props) => (
                  <AvatarPicker
                    describedBy={props["aria-describedby"]}
                    failure={uploadFailure}
                    id={props.id}
                    invalid={props["aria-invalid"]}
                    name={shownName}
                    onChoose={choosePhoto}
                    onFile={(file) => void upload(file)}
                    onRemove={() => {
                      setValue("avatarKey", "", { shouldDirty: true, shouldValidate: true });
                      setBanner(null);
                      setUploadFailure(null);
                    }}
                    previewUrl={avatarUrl}
                    uploading={uploading}
                    value={avatarKey}
                  />
                )}
              </FormField>
            </fieldset>

            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5",
                isDirty ? "bg-paper" : "bg-sand",
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-2 text-xs font-medium",
                  banner && !banner.ok ? "text-heritage" : "text-ink-soft",
                )}
                role={banner && !banner.ok ? "alert" : "status"}
              >
                {banner ? (
                  <>
                    {banner.ok ? <Check aria-hidden className="size-3.5 text-success" /> : null}
                    {banner.message}
                  </>
                ) : isDirty ? (
                  <>
                    <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                    You have unsaved changes.
                  </>
                ) : (
                  <span className="text-muted">Everything is up to date.</span>
                )}
              </p>
              <div className="flex gap-2">
                <Button disabled={!isDirty || saving || uploading} onClick={discard} size="sm" type="button" variant="ghost">
                  <RotateCcw aria-hidden className="size-3.5" />
                  Discard
                </Button>
                <Button disabled={!isDirty || saving || uploading} size="sm" type="submit">
                  {saving ? (
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  ) : (
                    <Save aria-hidden className="size-3.5" />
                  )}
                  {saving ? "Saving…" : uploading ? "Uploading photo…" : "Save changes"}
                </Button>
              </div>
            </div>
          </form>

          {children}
        </div>

        <aside aria-label="Your account" className="flex flex-col gap-5 lg:sticky lg:top-20">
          {aside}
        </aside>
      </div>
    </div>
  );
}
