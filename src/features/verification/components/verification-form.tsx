"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, CircleCheck, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useApiErrorMessage } from "@/store/api/api-error";
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

/** What a desk checks before filing the paid verification; the words are in `verification.form.checks`. */
const CHECKS = ["invoiceName", "invoiceAddress", "invoiceRecent"] as const;

/**
 * The verification form: a desk files the paid verification, with the invoice
 * behind it and a note.
 *
 * A paid verification needs the file, its number, or both, and the API
 * refuses it without. Verifying a destination that is already verified renews
 * it. Revoking needs a note, so the history says why, and is only possible
 * while a desk's decision stands; the travellers' score is not a desk's to
 * take away.
 */
export function VerificationForm({
  destinationId,
  verified,
  initialDecision = "verify",
  onDone,
  onCancel,
}: VerificationFormProps) {
  const t = useTranslations("verification");
  const errorMessage = useApiErrorMessage();
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
  const paperwork = revoking
    ? null
    : {
        label: t("form.paperwork.paid.label"),
        noun: t("form.paperwork.paid.noun"),
        number: t("form.paperwork.paid.number"),
        placeholder: t("form.paperwork.paid.placeholder"),
      };
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
        ...(revoking ? {} : { basis: "PAID" as const }),
        reference,
        note,
        evidenceKey,
      }).unwrap();
      onDone(decision);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  const proofError =
    missing === "proof" && paperwork && !hasProof
      ? t("form.proofErrorNumber", { noun: paperwork.noun })
      : undefined;
  const noteError = missing === "note" && !note.trim() ? t("form.noteError") : undefined;

  const evidence = (
    <FormField
      error={proofError}
      hint={revoking ? t("form.evidenceHintRevoke") : t("form.evidenceHint")}
      label={revoking ? t("form.supportingDocument") : (paperwork?.label ?? t("form.paperworkFallback"))}
      required={!revoking}
    >
      {(aria) => (
        <EvidenceField
          describedBy={aria["aria-describedby"]}
          id={aria.id}
          invalid={Boolean(proofError)}
          noun={revoking ? t("form.nounRevoke") : (paperwork?.noun ?? t("form.nounFallback"))}
          onChange={(key) => setEvidenceKey(key)}
          onUploadingChange={setUploading}
          value={evidenceKey}
        />
      )}
    </FormField>
  );

  const number = (
    <FormField
      hint={revoking ? t("form.numberHintRevoke") : t("form.numberHint")}
      label={revoking ? t("form.referenceNumber") : (paperwork?.number ?? t("form.reference"))}
    >
      {(aria) => (
        <Input
          {...aria}
          aria-invalid={proofError ? true : undefined}
          maxLength={120}
          onChange={(event) => setReference(event.target.value)}
          placeholder={revoking ? t("form.referencePlaceholderRevoke") : paperwork?.placeholder}
          value={reference}
        />
      )}
    </FormField>
  );

  const reason = (
    <FormField
      error={noteError}
      hint={revoking ? t("form.reasonHintRevoke") : t("form.reasonHint")}
      label={revoking ? t("form.reasonLabelRevoke") : t("form.note")}
      required={revoking}
    >
      {(aria) => (
        <Textarea
          {...aria}
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          placeholder={revoking ? t("form.reasonPlaceholderRevoke") : undefined}
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
          {verified ? t("form.headingRenew") : t("form.headingVerify")}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {revoking
            ? t("form.introRevoke")
            : verified
              ? t("form.introRenew")
              : t("form.introVerify")}
        </p>
      </div>

      {verified ? (
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">{t("form.decision")}</legend>
          <ChoiceOption
            checked={!revoking}
            description={t("form.renewDescription")}
            label={t("form.renewLabel")}
            name="decision"
            onSelect={() => {
              setDecision("verify");
              setMissing(null);
            }}
          />
          <ChoiceOption
            checked={revoking}
            danger
            description={t("form.revokeDescription")}
            label={t("form.revokeLabel")}
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
          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <p className="text-sm font-medium text-ink">{t("form.checksTitle")}</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {CHECKS.map((check) => (
                <li className="flex items-start gap-2 text-sm text-ink-soft" key={check}>
                  <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" strokeWidth={1.75} />
                  {t(`form.checks.${check}`)}
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
            {t("form.cancel")}
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
            ? t("form.waitingUpload")
            : revoking
              ? t("form.submitRevoke")
              : verified
                ? t("form.submitRenew")
                : t("form.submitVerify")}
        </Button>
      </div>
    </form>
  );
}

/** One radio in a row of choices: renew the verification, or revoke it. */
function ChoiceOption({
  checked,
  danger = false,
  label,
  description,
  name,
  onSelect,
}: {
  readonly checked: boolean;
  readonly danger?: boolean;
  readonly label: string;
  readonly description: string;
  readonly name: string;
  readonly onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
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
