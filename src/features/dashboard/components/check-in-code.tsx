"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Ban, Printer, QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { QueryState } from "@/features/cms/components/query-state";
import { useDates } from "@/i18n/use-dates";
import { useApiErrorMessage } from "@/store/api/api-error";
import type { StampCodeResponse, StampTarget } from "../api/contracts";
import { useGetStampCodesQuery, useIssueStampCodeMutation, useRetireStampCodeMutation, useWithdrawStampCodeMutation } from "../api/dashboard-api";

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** Which action is waiting for its confirm, and on which code. */
interface Confirming {
  readonly id: string;
  readonly action: "retire" | "withdraw";
}

/**
 * The check-in codes posted at a destination: the QRs the CMS prints, managed
 * per print. A place posts as many prints as it needs (the gate, a brochure, a
 * partner's desk), each with a label saying where it went and a count of the
 * check-ins it collected. Issuing another never touches the posted ones; a
 * print dies only when deliberately retired, so a leaked print is retired
 * alone. A check-in needs a code scanned and the phone within the radius, so a
 * place with no code posted cannot be stamped at all. The editorial desks
 * issue, retire and delete.
 */
export function CheckInCode({ targetType, targetId, name, manages }: {
  readonly targetType: StampTarget;
  readonly targetId: string;
  readonly name: string;
  /** Whether the viewer may issue, retire and delete codes. */
  readonly manages: boolean;
}) {
  const t = useTranslations("stats.checkIn");
  const errorMessage = useApiErrorMessage();
  const codes = useGetStampCodesQuery({ targetType, targetId });
  const [issue, issuing] = useIssueStampCodeMutation();
  const [retire, retiring] = useRetireStampCodeMutation();
  const [withdraw, withdrawing] = useWithdrawStampCodeMutation();
  const [label, setLabel] = useState("");
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const busy = issuing.isLoading || retiring.isLoading || withdrawing.isLoading;
  const active = codes.data?.filter((code) => code.retiredAt === null) ?? [];
  const retired = codes.data?.filter((code) => code.retiredAt !== null) ?? [];

  const run = (action: Promise<unknown>) => {
    setProblem(null);
    setConfirming(null);
    action.catch((error: unknown) => setProblem(errorMessage(error)));
  };

  return (
    <Surface aria-label={t("title")} className="p-4">
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <p className="mt-1 text-xs text-muted">{t("lead")}</p>
      {codes.isLoading || codes.error ? (
        <div className="mt-3">
          <QueryState error={codes.error} loading={codes.isLoading} retry={codes.refetch} />
        </div>
      ) : null}
      {manages && codes.data ? (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(issue({ targetType, targetId, label: label.trim() === "" ? null : label.trim() }).unwrap().then(() => setLabel("")));
          }}
        >
          <Input
            aria-label={t("labelPlaceholder")}
            className="h-8 max-w-64 text-sm"
            maxLength={80}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("labelPlaceholder")}
            value={label}
          />
          <Button disabled={busy} size="sm" type="submit">
            <QrCode aria-hidden className="size-3.5" />
            {t("issue")}
          </Button>
        </form>
      ) : null}
      {codes.data && active.length === 0 ? <p className="mt-3 text-xs text-muted">{t("none")}</p> : null}
      {active.length > 0 ? (
        <ul className="mt-3 space-y-4">
          {active.map((code) => (
            <ActiveCode
              busy={busy}
              code={code}
              confirming={confirming?.id === code.id ? confirming.action : null}
              key={code.id}
              manages={manages}
              name={name}
              onAsk={(action) => setConfirming({ id: code.id, action })}
              onCancel={() => setConfirming(null)}
              onGo={(action) => run((action === "retire" ? retire(code.id) : withdraw(code.id)).unwrap())}
            />
          ))}
        </ul>
      ) : null}
      {retired.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <h3 className="text-xs font-semibold text-muted">{t("retiredTitle", { count: retired.length })}</h3>
          <ul className="mt-2 space-y-2">
            {retired.map((code) => (
              <RetiredCode
                busy={busy}
                code={code}
                confirming={confirming?.id === code.id && confirming.action === "withdraw"}
                key={code.id}
                manages={manages}
                onAsk={() => setConfirming({ id: code.id, action: "withdraw" })}
                onCancel={() => setConfirming(null)}
                onGo={() => run(withdraw(code.id).unwrap())}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {problem ? <p className="mt-2 text-xs text-heritage" role="alert">{problem}</p> : null}
    </Surface>
  );
}

/** An active print: its QR, where it is posted, what it collected, and the ways it ends. */
function ActiveCode({ code, name, manages, busy, confirming, onAsk, onCancel, onGo }: {
  readonly code: StampCodeResponse;
  readonly name: string;
  readonly manages: boolean;
  readonly busy: boolean;
  readonly confirming: "retire" | "withdraw" | null;
  readonly onAsk: (action: "retire" | "withdraw") => void;
  readonly onCancel: () => void;
  readonly onGo: (action: "retire" | "withdraw") => void;
}) {
  const t = useTranslations("stats.checkIn");
  const locale = useLocale();
  const { dateTime } = useDates();
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void QRCode.toDataURL(code.payload, { errorCorrectionLevel: "M", margin: 1, width: 480 }).then((url) => {
      if (live) setImage(url);
    });
    return () => {
      live = false;
    };
  }, [code.payload]);

  /** A page with the QR, the place's name and the code, sent straight to the printer, in the language the dashboard is read in. */
  const print = () => {
    if (!image) return;
    const page = window.open("", "_blank", "width=720,height=960");
    if (!page) return;
    page.document.write(
      `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escape(t("printTitle", { name }))}</title>` +
        "<style>body{margin:0;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1d1d1b;display:flex;min-height:100vh;align-items:center;justify-content:center}" +
        "main{text-align:center;padding:32px;max-width:520px}h1{font-size:28px;margin:0 0 4px}p{margin:0 0 8px;color:#444}" +
        "img{width:360px;height:360px;margin:16px 0}.code{font:600 26px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;margin:0 0 16px}" +
        "footer{margin-top:24px;font-size:13px;color:#666}.where{font-size:13px;color:#666}@media print{body{min-height:auto}}</style></head><body><main>" +
        `<h1>${escape(name)}</h1><p>${escape(t("printLead"))}</p><img src="${image}" alt="">` +
        `<p class="code">${escape(code.code)}</p><p>${escape(t("printHow"))}</p>` +
        (code.label ? `<p class="where">${escape(t("printWhere", { label: code.label }))}</p>` : "") +
        `<footer>${escape(t("printFooter"))}</footer></main>` +
        "<script>window.onload=function(){window.print()}</script></body></html>",
    );
    page.document.close();
  };

  return (
    <li className="flex flex-wrap items-start gap-4">
      {image ? (
        <Image alt="" className="size-28 shrink-0 rounded-md ring-1 ring-line" height={112} src={image} unoptimized width={112} />
      ) : (
        <div aria-hidden className="size-28 shrink-0 animate-pulse rounded-md bg-sand" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-lg font-semibold tracking-widest text-ink" data-field="check-in-code">{code.code}</p>
        <p className="mt-0.5 text-xs font-medium text-ink">{code.label ?? t("noLabel")}</p>
        <p className="mt-0.5 text-xs text-muted">
          {code.issuedByName ? t("issuedBy", { date: dateTime(code.issuedAt), name: code.issuedByName }) : t("issuedShort", { date: dateTime(code.issuedAt) })}
          {" · "}
          {t("checkIns", { count: code.checkIns })}
        </p>
        <p className="mt-1 text-xs break-all text-muted">{code.payload}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button disabled={!image} onClick={print} size="sm" type="button" variant="secondary">
            <Printer aria-hidden className="size-3.5" />
            {t("print")}
          </Button>
          {manages && confirming === null ? (
            <>
              <Button disabled={busy} onClick={() => onAsk("retire")} size="sm" type="button" variant="ghost">
                <Ban aria-hidden className="size-3.5" />
                {t("retire")}
              </Button>
              {code.checkIns === 0 ? (
                <Button className="text-muted hover:text-heritage" disabled={busy} onClick={() => onAsk("withdraw")} size="sm" type="button" variant="ghost">
                  <Trash2 aria-hidden className="size-3.5" />
                  {t("withdraw")}
                </Button>
              ) : null}
            </>
          ) : null}
          {manages && confirming !== null ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">
                {confirming === "retire" ? t("confirmRetire") : t("confirmWithdraw")}
              </span>
              <Button disabled={busy} onClick={() => onGo(confirming)} size="sm" type="button" variant="destructive">
                {confirming === "retire" ? t("retire") : t("withdraw")}
              </Button>
              <Button onClick={onCancel} size="sm" type="button" variant="ghost">
                {t("cancel")}
              </Button>
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** A retired print: dead history the box keeps, erasable only while it never collected a check-in. */
function RetiredCode({ code, manages, busy, confirming, onAsk, onCancel, onGo }: {
  readonly code: StampCodeResponse;
  readonly manages: boolean;
  readonly busy: boolean;
  readonly confirming: boolean;
  readonly onAsk: () => void;
  readonly onCancel: () => void;
  readonly onGo: () => void;
}) {
  const t = useTranslations("stats.checkIn");
  const { dateTime } = useDates();

  return (
    <li className="text-xs text-muted">
      <p>
        <span className="font-mono font-semibold tracking-widest line-through">{code.code}</span>
        {" · "}
        {code.label ?? t("noLabel")}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5">
        {code.retiredByName ? t("retiredBy", { date: dateTime(code.retiredAt ?? code.issuedAt), name: code.retiredByName }) : t("retiredShort", { date: dateTime(code.retiredAt ?? code.issuedAt) })}
        {" · "}
        {t("checkIns", { count: code.checkIns })}
        {manages && code.checkIns === 0 && !confirming ? (
          <Button className="h-6 px-1.5 text-muted hover:text-heritage" disabled={busy} onClick={onAsk} size="sm" type="button" variant="ghost">
            <Trash2 aria-hidden className="size-3" />
            {t("withdraw")}
          </Button>
        ) : null}
        {manages && confirming ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{t("confirmWithdraw")}</span>
            <Button className="h-6 px-2" disabled={busy} onClick={onGo} size="sm" type="button" variant="destructive">
              {t("withdraw")}
            </Button>
            <Button className="h-6 px-2" onClick={onCancel} size="sm" type="button" variant="ghost">
              {t("cancel")}
            </Button>
          </span>
        ) : null}
      </p>
    </li>
  );
}
