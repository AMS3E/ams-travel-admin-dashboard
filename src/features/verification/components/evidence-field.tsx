"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, ImageOff, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadMedia } from "@/features/media/api/media-api";
import { prepareImage } from "@/features/catalog/media-upload";
import { cn } from "@/lib/utils";
import { useApiErrorMessage } from "@/store/api/api-error";
import { EVIDENCE_TYPES, MAX_EVIDENCE_BYTES, evidenceHref, isPdfEvidence } from "../evidence";

interface EvidenceFieldProps {
  readonly id: string;
  /** The uploaded file's key, e.g. `verification/{uploader}/{uuid}.pdf`; empty for none. */
  readonly value: string;
  readonly onChange: (key: string) => void;
  readonly describedBy?: string;
  readonly invalid?: boolean;
  readonly onUploadingChange?: (uploading: boolean) => void;
  /** What the paperwork is called here: "the invoice or receipt", "the letter or notice". */
  readonly noun?: string;
}

function sizeOf(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The invoice or receipt: a PDF as it was emailed, or a photo of the paper.
 *
 * Dropped or picked, never typed — evidence has to live in the private
 * `verification` folder and the API refuses any key it did not hand out for an
 * upload there. A photo is shrunk first, as catalogue photos are, which keeps
 * the print legible; a PDF goes as it is. The preview and the Open link read
 * through the dashboard's private route, with the session's token.
 */
export function EvidenceField({
  id,
  value,
  onChange,
  describedBy,
  invalid,
  onUploadingChange,
  noun: nounGiven,
}: EvidenceFieldProps) {
  const t = useTranslations("verification.evidence");
  const errorMessage = useApiErrorMessage();
  const noun = nounGiven ?? t("defaultNoun");
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ readonly name: string; readonly size: number } | null>(null);
  const [broken, setBroken] = useState(false);
  const href = evidenceHref(value);
  const pdf = isPdfEvidence(value);

  function busy(state: boolean) {
    setUploading(state);
    onUploadingChange?.(state);
  }

  async function upload(chosen: File | undefined) {
    if (!chosen) return;
    if (!EVIDENCE_TYPES.includes(chosen.type)) {
      setFailure(t("wrongType", { file: chosen.name }));
      return;
    }
    busy(true);
    setFailure(null);
    try {
      const file = chosen.type === "application/pdf" ? chosen : await prepareImage(chosen);
      if (file.size > MAX_EVIDENCE_BYTES) {
        setFailure(t("tooLarge", { file: chosen.name }));
        return;
      }
      const body = new FormData();
      body.set("file", file, file.name);
      body.set("category", "verification");
      const payload = await uploadMedia(body);
      setBroken(false);
      setPicked({ name: chosen.name, size: file.size });
      onChange(payload.key);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      busy(false);
      /* Let the same file be chosen again after a failure. */
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-muted p-2.5">
          {pdf ? (
            <span className="grid size-16 shrink-0 place-items-center rounded-md border border-line bg-paper text-heritage">
              <FileText aria-hidden className="size-7" strokeWidth={1.5} />
            </span>
          ) : href && !broken ? (
            <Image
              alt={t("previewAlt")}
              className="size-16 shrink-0 rounded-md border border-line object-cover"
              height={64}
              onError={() => setBroken(true)}
              src={href}
              unoptimized
              width={64}
            />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-md bg-paper text-muted">
              <ImageOff aria-hidden className="size-5" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{picked?.name ?? (pdf ? t("invoicePdf") : t("invoicePhoto"))}</p>
            <p className="text-xs text-muted">
              {[pdf ? t("kindPdf") : t("kindImage"), picked ? sizeOf(picked.size) : null, t("private")].filter(Boolean).join(" · ")}
            </p>
            {href ? (
              <a
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline"
                href={href}
                rel="noreferrer"
                target="_blank"
              >
                {t("open")}
                <ExternalLink aria-hidden className="size-3" />
              </a>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-1">
            <Button disabled={uploading} onClick={() => fileInput.current?.click()} size="sm" type="button" variant="secondary">
              {uploading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <RefreshCw aria-hidden className="size-3.5" />}
              {t("replace")}
            </Button>
            <Button
              disabled={uploading}
              onClick={() => {
                setPicked(null);
                setBroken(false);
                setFailure(null);
                onChange("");
              }}
              size="sm"
              type="button"
              variant="dangerGhost"
            >
              <Trash2 aria-hidden className="size-3.5" />
              {t("remove")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          aria-describedby={describedBy}
          className={cn(
            "flex min-h-32 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-6 py-5 text-center transition-colors disabled:cursor-progress",
            dragging
              ? "border-teal bg-teal-soft/60"
              : invalid
                ? "border-heritage bg-heritage-soft/40"
                : "border-line-strong bg-sand hover:border-line-hover hover:bg-sand-deep",
          )}
          disabled={uploading}
          id={id}
          onClick={() => fileInput.current?.click()}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void upload(event.dataTransfer.files?.[0]);
          }}
          type="button"
        >
          {uploading ? (
            <Loader2 aria-hidden className="size-5 animate-spin text-muted" />
          ) : (
            <Upload aria-hidden className={cn("size-5", dragging ? "text-teal" : "text-muted")} strokeWidth={1.75} />
          )}
          <span className="text-sm text-ink">
            {uploading ? (
              t("uploading")
            ) : dragging ? (
              t("drop")
            ) : (
              t.rich("attach", {
                noun,
                attach: (chunks) => <span className="font-medium text-teal-deep">{chunks}</span>,
              })
            )}
          </span>
          <span className="text-xs text-muted">{t("formats")}</span>
        </button>
      )}

      <input
        accept={EVIDENCE_TYPES.join(",")}
        className="hidden"
        onChange={(event) => void upload(event.target.files?.[0])}
        ref={fileInput}
        type="file"
      />

      {failure ? (
        <p className="text-xs font-medium text-heritage" role="alert">
          {failure}
        </p>
      ) : null}
    </div>
  );
}
