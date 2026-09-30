"use client";

import { useState } from "react";
import {
  Loader2,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  type CustomerAccount,
  useDeleteCustomerMutation,
  useUpdateCustomerMutation,
} from "@/features/people/api/people-api";
import { customerName } from "@/features/people/customers";
import {
  AvatarPicker,
  ProfileAvatar,
  type AvatarPickerLabels,
} from "@/features/profile/components/avatar-picker";
import { useAvatarUpload } from "@/features/profile/use-avatar-upload";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/store/api/api-error";

/** The drop zone's words when the photo is a customer's rather than your own. */
export const CUSTOMER_PHOTO: AvatarPickerLabels = {
  empty: "Add their photo",
  filled: "Their profile photo",
  uploading: "Uploading the photo…",
  instructions: "Drag an image here, or choose one from this computer.",
};

export const PHOTO_HINT = "JPEG, PNG, WebP or AVIF, up to 8 MB. A square photo looks best.";

const joined = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

/**
 * The columns a customer is read across — who, phone, joined, status, actions —
 * shared by the list's header row so the two always line up.
 */
export const CUSTOMER_COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 sm:grid-cols-[minmax(0,1fr)_6.5rem_auto] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_6.5rem_auto] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_7rem_6.5rem_4.5rem]";

/**
 * One customer on the Users screen, with what an account manager may do to
 * it: edit the profile — photo included — or delete the account for good.
 *
 * Both open inline, under the row, the way the catalogue tables confirm a
 * delete — no dialog to lose the list behind. The API keeps the customer's
 * sign-in in step with either: an edited e-mail becomes the address they sign
 * in with, Inactive stops them signing in, and a delete removes the sign-in
 * last, so a failure leaves the customer exactly as they were.
 */
export function CustomerRow({
  customer,
  canManage,
}: {
  readonly customer: CustomerAccount;
  readonly canManage: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [deleteCustomer, removal] = useDeleteCustomerMutation();
  const active = customer.status === "ACTIVE";
  const name = customerName(customer);

  async function confirmDelete() {
    try {
      await deleteCustomer(customer.id).unwrap();
      /* The list refetches without this row; nothing more to do here. */
    } catch {
      /* The banner below renders the API's reason. */
    }
  }

  return (
    <div className={cn(mode !== "view" && "bg-sand")}>
      <div className={cn(CUSTOMER_COLUMNS, "min-h-12 py-2 transition-colors hover:bg-sand")}>
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar
            className={cn("size-8 text-xs", !active && "opacity-60 grayscale")}
            name={name}
            src={customer.avatarUrl ?? ""}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {name}
              {/* The badge is hidden on a phone to give the address room; say the status instead. */}
              <span className="sr-only sm:hidden">, {active ? "Active" : "Inactive"}</span>
            </p>
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <Mail aria-hidden className="size-3 shrink-0" />
              <span className="truncate">{customer.email}</span>
            </p>
          </div>
        </div>

        <span className="hidden min-w-0 items-center gap-1.5 text-sm text-ink-soft md:flex">
          {customer.phone ? (
            <>
              <Phone aria-hidden className="size-3.5 shrink-0 text-muted" />
              <span className="truncate">{customer.phone}</span>
            </>
          ) : (
            <span className="text-muted">—</span>
          )}
        </span>
        <span className="hidden text-sm text-muted tabular-nums lg:block">
          {joined.format(new Date(customer.createdAt))}
        </span>
        <span className="hidden sm:block">
          <Badge dot tone={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
        </span>

        {canManage ? (
          <span className="flex items-center justify-end gap-0.5">
            <Button
              aria-expanded={mode === "edit"}
              aria-label={`Edit ${name}`}
              className={cn("text-muted hover:text-ink", mode === "edit" && "bg-teal-soft text-teal-deep")}
              disabled={removal.isLoading}
              onClick={() => setMode(mode === "edit" ? "view" : "edit")}
              size="icon-sm"
              title="Edit"
              type="button"
              variant="ghost"
            >
              <Pencil aria-hidden className="size-4" />
            </Button>
            <Button
              aria-label={`Delete ${name}`}
              disabled={removal.isLoading}
              onClick={() => {
                removal.reset();
                setMode("delete");
              }}
              size="icon-sm"
              className="text-muted hover:bg-heritage-soft hover:text-heritage"
              title="Delete permanently"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </span>
        ) : (
          <span />
        )}
      </div>

      {mode === "edit" ? (
        <EditCustomerForm customer={customer} onDone={() => setMode("view")} />
      ) : null}

      {mode === "delete" ? (
        <div className="flex flex-col gap-3 border-t border-line bg-heritage-soft/60 px-4 py-3">
          {removal.error ? <ErrorBanner message={apiErrorMessage(removal.error)} /> : null}
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-ink">
              Delete <strong>{name}</strong> for good? Their sign-in, reviews,
              favourites and badges go too. To stop them signing in but keep
              their history, edit them and set them to Inactive instead.
            </p>
            <Button
              disabled={removal.isLoading}
              onClick={() => void confirmDelete()}
              size="sm"
              type="button"
              variant="destructive"
            >
              {removal.isLoading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              Delete customer
            </Button>
            <Button
              disabled={removal.isLoading}
              onClick={() => setMode("view")}
              size="sm"
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditCustomerForm({
  customer,
  onDone,
}: {
  readonly customer: CustomerAccount;
  readonly onDone: () => void;
}) {
  const [name, setName] = useState(customer.fullName ?? "");
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [status, setStatus] = useState(customer.status);
  const [avatar, setAvatar] = useState({ key: customer.avatarKey ?? "", url: customer.avatarUrl ?? "" });
  const [updateCustomer, { isLoading, error }] = useUpdateCustomerMutation();
  const photo = useAvatarUpload(setAvatar);

  const dirty =
    name.trim() !== (customer.fullName ?? "") ||
    email.trim().toLowerCase() !== customer.email.toLowerCase() ||
    phone.trim() !== (customer.phone ?? "") ||
    status !== customer.status ||
    avatar.key !== (customer.avatarKey ?? "");
  const busy = isLoading || photo.uploading;

  function discard() {
    setName(customer.fullName ?? "");
    setEmail(customer.email);
    setPhone(customer.phone ?? "");
    setStatus(customer.status);
    setAvatar({ key: customer.avatarKey ?? "", url: customer.avatarUrl ?? "" });
    photo.clearFailure();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    try {
      await updateCustomer({
        id: customer.id,
        changes: {
          fullName: name.trim(),
          email: email.trim(),
          /* Empty clears the number on the API; it is not stored blank. */
          phone: phone.trim(),
          status,
          /* Empty removes the photo, so their initials show again. */
          avatarKey: avatar.key.trim(),
        },
      }).unwrap();
      onDone();
    } catch {
      /* The banner renders it; unwrap only needs to not go unhandled. */
    }
  }

  return (
    <form
      aria-label={`Edit ${customerName(customer)}`}
      className="border-t border-line"
      noValidate
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        {error ? <ErrorBanner message={apiErrorMessage(error)} /> : null}

        <FormField hint={PHOTO_HINT} label="Profile photo">
          {(field) => (
            <AvatarPicker
              describedBy={field["aria-describedby"]}
              failure={photo.failure}
              id={field.id}
              labels={CUSTOMER_PHOTO}
              name={name.trim() || customerName(customer)}
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
          <FormField label="Name" required>
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

          <FormField hint="Also what they sign in with." label="E-mail" required>
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

          <FormField hint="Optional. Leave empty to remove it." label="Phone number">
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

          <FormField hint="Inactive customers cannot sign in." label="Status">
            {(field) => (
              <Select
                {...field}
                onChange={(event) => setStatus(event.target.value as CustomerAccount["status"])}
                value={status}
              >
                <option value="ACTIVE">Active — can sign in</option>
                <option value="INACTIVE">Inactive — sign-in blocked</option>
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
              Uploading the photo…
            </>
          ) : dirty ? (
            <>
              <span aria-hidden className="size-1.5 rounded-full bg-gold" />
              Unsaved changes.
            </>
          ) : (
            <span className="text-muted">No changes yet.</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button
            disabled={busy}
            onClick={dirty ? discard : onDone}
            size="sm"
            type="button"
            variant="ghost"
          >
            {dirty ? <RotateCcw aria-hidden className="size-3.5" /> : null}
            {dirty ? "Discard" : "Close"}
          </Button>
          <Button disabled={busy || !dirty || !name.trim() || !email.trim()} size="sm" type="submit">
            {isLoading ? (
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
            ) : (
              <Save aria-hidden className="size-3.5" />
            )}
            {isLoading ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ErrorBanner({ message }: { readonly message: string }) {
  return (
    <div className="flex gap-2.5 rounded-md border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-heritage" role="alert">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
