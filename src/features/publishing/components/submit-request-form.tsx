"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import type { ListingType } from "@/features/publishing/api/contracts";
import { useSubmitPublishRequestMutation } from "@/features/publishing/api/publishing-api";
import { listingLabel } from "@/features/publishing/listings";
import { apiErrorMessage } from "@/store/api/api-error";

/** An attraction, a stay or a food listing this account may send for review. */
export interface SubmittableListing {
  readonly type: ListingType;
  readonly id: string;
  readonly name: string;
}

/**
 * The submit half of the workflow.
 *
 * The dropdown holds only what can actually be submitted — rows the account
 * owns that are neither live nor already waiting — so the common failures are
 * absent from the screen rather than explained after the fact. A request
 * carries the listing and nothing else: the reviewer reads it.
 */
export function SubmitRequestForm({
  options,
}: {
  readonly options: readonly SubmittableListing[];
}) {
  const router = useRouter();
  const [submitRequest] = useSubmitPublishRequestMutation();
  const [saving, startSaving] = useTransition();
  const [listingId, setListingId] = useState("");
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  if (!options.length) {
    return (
      <p className="panel px-4 py-6 text-center text-sm text-muted">
        Nothing of yours is waiting to be submitted. Everything you own is either
        live or already with a reviewer.
      </p>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const chosen = options.find((option) => option.id === listingId);
    if (!chosen) {
      setBanner({ ok: false, text: "Choose which one to submit." });
      return;
    }

    startSaving(async () => {
      try {
        await submitRequest({ targetType: chosen.type, targetId: chosen.id }).unwrap();
        setBanner({ ok: true, text: "Submitted. It is now with a reviewer." });
        setListingId("");
        router.refresh();
      } catch (error) {
        setBanner({ ok: false, text: apiErrorMessage(error) });
      }
    });
  }

  return (
    <form className="panel flex flex-col gap-4 p-4" onSubmit={submit}>
      {banner ? (
        <div
          className={
            banner.ok
              ? "flex gap-2.5 rounded-md border border-success/20 bg-success-soft px-3 py-2.5 text-success"
              : "flex gap-2.5 rounded-md border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-heritage"
          }
          role="status"
        >
          {banner.ok ? (
            <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
          ) : (
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          )}
          <p className="text-sm">{banner.text}</p>
        </div>
      ) : null}

      <FormField label="Listing" required>
        {(field) => (
          <Select
            {...field}
            onChange={(event) => setListingId(event.target.value)}
            value={listingId}
          >
            <option value="">Choose one…</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({listingLabel(option.type).toLowerCase()})
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <div className="flex justify-end">
        <Button disabled={saving} size="sm" type="submit">
          {saving ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Send aria-hidden className="size-4" />
          )}
          Submit for publishing
        </Button>
      </div>
    </form>
  );
}
