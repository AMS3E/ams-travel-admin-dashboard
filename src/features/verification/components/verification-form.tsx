"use client";

import { useState, type FormEvent } from "react";
import { BadgeCheck, CircleCheck, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PublishDesk } from "@/features/publishing/api/contracts";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/store/api/api-error";
import { useRecordVerificationMutation } from "../api/verification-api";
import type { DestinationVerificationResponse, VerificationBasis } from "../api/contracts";
import { EvidenceField } from "./evidence-field";

export type VerificationDecision = "verify" | "revoke";

/** The bases a desk files; the travellers' is earned, never chosen here. */
type FiledBasis = Exclude<VerificationBasis, "TRAVELER_SCORE">;

interface VerificationFormProps {
  readonly destinationId: string;
  readonly verified: boolean;
  /** Whose writing the place is, when the screen knows: only a partner's own listing is verified as a partner's. */
  readonly desk?: PublishDesk;
  /** Which decision the form opens on; revoking is only offered while verified. */
  readonly initialDecision?: VerificationDecision;
  /** The decision was filed; the caller shows what happened. */
  readonly onDone: (decision: DestinationVerificationResponse) => void;
  readonly onCancel?: () => void;
}

interface Paperwork {
  readonly label: string;
  readonly noun: string;
  readonly number: string;
  readonly placeholder: string;
}

/** What each basis is called, what it rests on, and what a desk checks before filing it. */
const BASES: Readonly<
  Record<FiledBasis, { readonly label: string; readonly description: string; readonly paperwork: Paperwork | null; readonly checks: readonly string[] }>
> = {
  OFFICIAL_SITE: {
    label: "Official site",
    description: "A national or official place. No paperwork needed.",
    paperwork: null,
    checks: [],
  },
  PARTNER: {
    label: "Partner",
    description: "Partnered with AMS Travel. The agreement is the evidence.",
    paperwork: { label: "Partnership agreement", noun: "the agreement", number: "Agreement reference", placeholder: "e.g. AGR-2026-07" },
    checks: [
      "The business on the agreement is the one this listing is for.",
      "The listing was written by that partner's own account.",
      "The agreement is current.",
    ],
  },
  PAID: {
    label: "Paid",
    description: "Paid for verification. The invoice or receipt is the evidence.",
    paperwork: { label: "Invoice or receipt", noun: "the invoice or receipt", number: "Invoice or receipt number", placeholder: "e.g. INV-2026-0042" },
    checks: [
      "The business or place name on it matches this listing.",
      "The address matches the listing's address and map pin.",
      "It is recent, such as this year's invoice or receipt.",
    ],
  },
};

const FILED: readonly FiledBasis[] = ["OFFICIAL_SITE", "PARTNER", "PAID"];

/**
 * The verification form: what the verification rests on, the paperwork that
 * basis needs, and a note.
 *
 * An official site needs no paperwork. A partner's or a paid verification
 * needs the file, its number, or both, and the API refuses it without.
 * Verifying a destination that is already verified renews it, on the same
 * basis or another. Revoking needs a note, so the history says why, and is
 * only possible while a desk's decision stands; the travellers' seal is not
 * a desk's to take away.
 */
export function VerificationForm({
  destinationId,
  verified,
  desk,
  initialDecision = "verify",
  onDone,
  onCancel,
}: VerificationFormProps) {
  const [recordVerification, mutation] = useRecordVerificationMutation();
  const [chosen, setDecision] = useState<VerificationDecision>(initialDecision);
  /* A partner's listing is most likely verified as a partner's; anything else is most likely paid for. */
  const [basis, setBasis] = useState<FiledBasis>(desk === "PARTNER" ? "PARTNER" : "PAID");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [evidenceKey, setEvidenceKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<"proof" | "note" | null>(null);
  /* Once the destination is not verified — revoked here or elsewhere — there is nothing to revoke. */
  const revoking = verified && chosen === "revoke";
  const paperwork = revoking ? null : BASES[basis].paperwork;
  const hasProof = Boolean(reference.trim() || evidenceKey);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (revoking && !note.trim()) {
      setMissing("note");
      return;
    }
    if (paperwork && !hasProof) {
      setMissing("proof");
      return;
    }
    setMissing(null);

    try {
      const decision = await recordVerification({
        destinationId,
        verified: !revoking,
        ...(revoking ? {} : { basis }),
        reference,
        note,
        evidenceKey,
      }).unwrap();
      onDone(decision);
    } catch (failure) {
      setError(apiErrorMessage(failure));
    }
  }

  const proofError =
    missing === "proof" && paperwork && !hasProof
      ? `Attach ${paperwork.noun}, or type its ${basis === "PAID" ? "number" : "reference"}.`
      : undefined;
  const noteError = missing === "note" && !note.trim() ? "Say why the verification is being revoked." : undefined;

  const evidence = (
    <FormField
      error={proofError}
      hint={
        revoking
          ? "A letter or notice the revocation rests on, if there is one."
          : "Kept with this decision for the verifying desks only. It never reaches the app."
      }
      label={revoking ? "Supporting document" : (paperwork?.label ?? "Paperwork")}
      required={!revoking}
    >
      {(aria) => (
        <EvidenceField
          describedBy={aria["aria-describedby"]}
          id={aria.id}
          invalid={Boolean(proofError)}
          noun={revoking ? "the letter or notice" : (paperwork?.noun ?? "the paperwork")}
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
      label={revoking ? "Reference number" : (paperwork?.number ?? "Reference")}
    >
      {(aria) => (
        <Input
          {...aria}
          aria-invalid={proofError ? true : undefined}
          maxLength={120}
          onChange={(event) => setReference(event.target.value)}
          placeholder={revoking ? "e.g. INV-2026-0042" : paperwork?.placeholder}
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
          : basis === "OFFICIAL_SITE"
            ? "Which list or decree names it, if you know. Kept for the next person to check this."
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
            ? "The app stops showing it as verified, and as Recommended by AMS Travel, straight away."
            : verified
              ? "Renew it when new paperwork comes in, such as next year's invoice, or when what it rests on changes."
              : "A verified destination shows as Recommended by AMS Travel in the app, with the Verified tag on its photo."}
        </p>
      </div>

      {verified ? (
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Decision</legend>
          <ChoiceOption
            checked={!revoking}
            description="File new paperwork, such as this year's invoice."
            label="Renew verification"
            name="decision"
            onSelect={() => {
              setDecision("verify");
              setMissing(null);
            }}
          />
          <ChoiceOption
            checked={revoking}
            danger
            description="It shows as not verified in the app."
            label="Revoke verification"
            name="decision"
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
          <fieldset className="grid gap-3 sm:grid-cols-3" data-field="basis">
            <legend className="mb-2 text-sm font-medium text-ink">What does it rest on?</legend>
            {FILED.map((each) => {
              /* The queue knows whose listing it is; a partner's verification is only for a partner's own. */
              const notTheirs = each === "PARTNER" && desk !== undefined && desk !== "PARTNER";
              return (
                <ChoiceOption
                  checked={basis === each}
                  description={notTheirs ? "Only for a listing written by a partner's own account." : BASES[each].description}
                  disabled={notTheirs}
                  key={each}
                  label={BASES[each].label}
                  name="basis"
                  onSelect={() => {
                    setBasis(each);
                    setMissing(null);
                  }}
                />
              );
            })}
          </fieldset>
          {BASES[basis].checks.length ? (
            <div className="rounded-lg border border-line bg-surface-muted p-3">
              <p className="text-sm font-medium text-ink">Before you verify, check the paperwork</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {BASES[basis].checks.map((check) => (
                  <li className="flex items-start gap-2 text-sm text-ink-soft" key={check}>
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" strokeWidth={1.75} />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border border-line bg-surface-muted p-3 text-sm text-ink-soft">
              An official site is verified on its standing alone. Say in the note which list or decree names it, so the next person knows.
            </p>
          )}
          {paperwork ? (
            <>
              {evidence}
              {number}
            </>
          ) : null}
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

/** One radio in a row of choices: a decision, or what the verification rests on. */
function ChoiceOption({
  checked,
  danger = false,
  disabled = false,
  label,
  description,
  name,
  onSelect,
}: {
  readonly checked: boolean;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly label: string;
  readonly description: string;
  readonly name: string;
  readonly onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
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
        disabled={disabled}
        name={name}
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
