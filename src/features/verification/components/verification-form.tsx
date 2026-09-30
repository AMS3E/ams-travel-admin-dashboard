"use client";

import { useState, type FormEvent } from "react";
import { BadgeCheck, CircleCheck, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/store/api/api-error";
import { useRecordVerificationMutation } from "../api/verification-api";
import type { DestinationVerificationResponse } from "../api/contracts";
import { EvidenceField } from "./evidence-field";

export type VerificationDecision = "verify" | "revoke";

interface VerificationFormProps {
  readonly destinationId: string;
  readonly verified: boolean;
  /** Which decision the form opens on; revoking is only offered while verified. */
  readonly initialDecision?: VerificationDecision;
  /** The decision was filed; the caller shows what happened. */
  readonly onDone: (decision: DestinationVerificationResponse) => void;
  readonly onCancel?: () => void;
}

/** What a desk compares the paperwork against before it verifies. */
const CHECKS = [
  "The business or place name on it matches this listing.",
  "The address matches the listing's address and map pin.",
  "It is recent, such as this year's invoice or receipt.",
] as const;

/**
 * The verification form: a decision, the invoice or receipt, its number, and
 * a note.
 *
 * Verifying needs proof — the file, its number, or both — and the API refuses
 * it without. Verifying a destination that is already verified renews it
 * against new paperwork. Revoking needs a note, so the history says why, and
 * is only possible while the destination is verified.
 */
export function VerificationForm({
  destinationId,
  verified,
  initialDecision = "verify",
  onDone,
  onCancel,
}: VerificationFormProps) {
  const [recordVerification, mutation] = useRecordVerificationMutation();
  const [chosen, setDecision] = useState<VerificationDecision>(initialDecision);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [evidenceKey, setEvidenceKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<"proof" | "note" | null>(null);
  /* Once the destination is not verified — revoked here or elsewhere — there is nothing to revoke. */
  const revoking = verified && chosen === "revoke";
  const hasProof = Boolean(reference.trim() || evidenceKey);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (revoking && !note.trim()) {
      setMissing("note");
      return;
    }
    if (!revoking && !hasProof) {
      setMissing("proof");
      return;
    }
    setMissing(null);

    try {
      const decision = await recordVerification({
        destinationId,
        verified: !revoking,
        reference,
        note,
        evidenceKey,
      }).unwrap();
      onDone(decision);
    } catch (failure) {
      setError(apiErrorMessage(failure));
    }
  }

  const proofError = missing === "proof" && !hasProof ? "Attach the invoice or receipt, or type its number." : undefined;
  const noteError = missing === "note" && !note.trim() ? "Say why the verification is being revoked." : undefined;

  const evidence = (
    <FormField
      error={proofError}
      hint={
        revoking
          ? "A letter or notice the revocation rests on, if there is one."
          : "Kept with this decision for the verifying desks only. It never reaches the website."
      }
      label={revoking ? "Supporting document" : "Invoice or receipt"}
      required={!revoking}
    >
      {(aria) => (
        <EvidenceField
          describedBy={aria["aria-describedby"]}
          id={aria.id}
          invalid={Boolean(proofError)}
          noun={revoking ? "the letter or notice" : "the invoice or receipt"}
          onChange={(key) => setEvidenceKey(key)}
          onUploadingChange={setUploading}
          value={evidenceKey}
        />
      )}
    </FormField>
  );

  const number = (
    <FormField
      hint={revoking ? "The letter's or notice's reference." : "As printed on the paperwork. Enough on its own when there is no copy to attach."}
      label={revoking ? "Reference number" : "Invoice or receipt number"}
    >
      {(aria) => (
        <Input
          {...aria}
          aria-invalid={proofError ? true : undefined}
          maxLength={120}
          onChange={(event) => setReference(event.target.value)}
          placeholder="e.g. INV-2026-0042"
          value={reference}
        />
      )}
    </FormField>
  );

  const reason = (
    <FormField
      error={noteError}
      hint={
        revoking
          ? "Kept in the verification history, so whoever checks it next knows why."
          : "Anything the next person to check this should know."
      }
      label={revoking ? "Why is it being revoked?" : "Note"}
      required={revoking}
    >
      {(aria) => (
        <Textarea
          {...aria}
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          placeholder={revoking ? "e.g. The business has closed, or the invoice turned out not to match." : undefined}
          rows={revoking ? 4 : 3}
          value={note}
        />
      )}
    </FormField>
  );

  return (
    <form className="panel flex flex-col gap-5 p-4" noValidate onSubmit={submit}>
      <div>
        <h2 className="font-semibold">
          {verified ? "Renew or revoke this verification" : "Verify this destination"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {revoking
            ? "The destination stops showing as verified on the website straight away."
            : verified
              ? "Renew it when new paperwork comes in, such as next year's invoice."
              : "A verified destination shows travellers it has been checked against real paperwork."}
        </p>
      </div>

      {verified ? (
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Decision</legend>
          <DecisionOption
            checked={!revoking}
            description="File new paperwork, such as this year's invoice."
            label="Renew verification"
            onSelect={() => {
              setDecision("verify");
              setMissing(null);
            }}
          />
          <DecisionOption
            checked={revoking}
            danger
            description="It shows as not verified on the website."
            label="Revoke verification"
            onSelect={() => {
              setDecision("revoke");
              setMissing(null);
            }}
          />
        </fieldset>
      ) : null}

      {revoking ? (
        <>
          {reason}
          <div className="grid gap-4 md:grid-cols-2">
            {evidence}
            {number}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <p className="text-sm font-medium text-ink">Before you verify, check the paperwork</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {CHECKS.map((check) => (
                <li className="flex items-start gap-2 text-sm text-ink-soft" key={check}>
                  <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" strokeWidth={1.75} />
                  {check}
                </li>
              ))}
            </ul>
          </div>
          {evidence}
          {number}
          {reason}
        </>
      )}

      {error ? (
        <p className="rounded-md border border-heritage/15 bg-heritage-soft px-3 py-2 text-sm font-medium text-heritage" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
        ) : null}
        <Button
          disabled={mutation.isLoading || uploading}
          type="submit"
          variant={revoking ? "destructive" : "default"}
        >
          {mutation.isLoading ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : revoking ? (
            <ShieldOff aria-hidden className="size-4" />
          ) : (
            <BadgeCheck aria-hidden className="size-4" />
          )}
          {uploading
            ? "Waiting for the upload…"
            : revoking
              ? "Revoke verification"
              : verified
                ? "Renew verification"
                : "Verify destination"}
        </Button>
      </div>
    </form>
  );
}

function DecisionOption({
  checked,
  danger = false,
  label,
  description,
  onSelect,
}: {
  readonly checked: boolean;
  readonly danger?: boolean;
  readonly label: string;
  readonly description: string;
  readonly onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        checked
          ? danger
            ? "border-heritage bg-heritage-soft/60"
            : "border-teal bg-teal-soft/60"
          : "border-line hover:bg-sand",
      )}
    >
      <input
        checked={checked}
        className={cn("mt-0.5 size-4", danger ? "accent-heritage" : "accent-teal")}
        name="decision"
        onChange={onSelect}
        type="radio"
      />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
    </label>
  );
}
