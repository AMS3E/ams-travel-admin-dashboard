"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, CircleCheck, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PublishDesk } from "@/features/publishing/api/contracts";
import { cn } from "@/lib/utils";
import { useApiErrorMessage } from "@/store/api/api-error";
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

/** The `verification.form.paperwork` entry each basis needs, if any. */
type Paperwork = "partner" | "paid";

type Check = "agreementBusiness" | "agreementAccount" | "agreementCurrent" | "invoiceName" | "invoiceAddress" | "invoiceRecent";

/** What each basis rests on, and what a desk checks before filing it; the words are in `verification.form`. */
const BASES: Readonly<Record<FiledBasis, { readonly paperwork: Paperwork | null; readonly checks: readonly Check[] }>> = {
  OFFICIAL_SITE: { paperwork: null, checks: [] },
  PARTNER: { paperwork: "partner", checks: ["agreementBusiness", "agreementAccount", "agreementCurrent"] },
  PAID: { paperwork: "paid", checks: ["invoiceName", "invoiceAddress", "invoiceRecent"] },
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
  const t = useTranslations("verification");
  const errorMessage = useApiErrorMessage();
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
  const paperworkKey = revoking ? null : BASES[basis].paperwork;
  const paperwork = paperworkKey
    ? {
        label: t(`form.paperwork.${paperworkKey}.label`),
        noun: t(`form.paperwork.${paperworkKey}.noun`),
        number: t(`form.paperwork.${paperworkKey}.number`),
        placeholder: t(`form.paperwork.${paperworkKey}.placeholder`),
      }
    : null;
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
      setError(errorMessage(failure));
    }
  }

  const proofError =
    missing === "proof" && paperwork && !hasProof
      ? t(basis === "PAID" ? "form.proofErrorNumber" : "form.proofErrorReference", { noun: paperwork.noun })
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
      hint={
        revoking
          ? t("form.reasonHintRevoke")
          : basis === "OFFICIAL_SITE"
            ? t("form.reasonHintOfficial")
            : t("form.reasonHint")
      }
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
          <fieldset className="grid gap-3 sm:grid-cols-3" data-field="basis">
            <legend className="mb-2 text-sm font-medium text-ink">{t("form.basisLegend")}</legend>
            {FILED.map((each) => {
              /* The queue knows whose listing it is; a partner's verification is only for a partner's own. */
              const notTheirs = each === "PARTNER" && desk !== undefined && desk !== "PARTNER";
              return (
                <ChoiceOption
                  checked={basis === each}
                  description={notTheirs ? t("form.notTheirs") : t(`form.bases.${each}`)}
                  disabled={notTheirs}
                  key={each}
                  label={t(`basis.${each}`)}
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
              <p className="text-sm font-medium text-ink">{t("form.checksTitle")}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {BASES[basis].checks.map((check) => (
                  <li className="flex items-start gap-2 text-sm text-ink-soft" key={check}>
                    <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" strokeWidth={1.75} />
                    {t(`form.checks.${check}`)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border border-line bg-surface-muted p-3 text-sm text-ink-soft">
              {t("form.officialNote")}
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
