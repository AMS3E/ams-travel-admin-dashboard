"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Printer, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { QueryState } from "@/features/cms/components/query-state";
import { useDates } from "@/i18n/use-dates";
import { useApiErrorMessage } from "@/store/api/api-error";
import type { StampTarget } from "../api/contracts";
import { useGetStampCodesQuery, useIssueStampCodeMutation, useWithdrawStampCodeMutation } from "../api/dashboard-api";

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/**
 * The check-in code posted at a destination: the QR the CMS prints, the code
 * written under it, and the way to replace a leaked print. A check-in needs
 * this code scanned and the phone within the radius, so a place with no code
 * posted cannot be stamped at all. The editorial desks issue and withdraw.
 */
export function CheckInCode({ targetType, targetId, name, manages }: {
  readonly targetType: StampTarget;
  readonly targetId: string;
  readonly name: string;
  /** Whether the viewer may issue and withdraw codes. */
  readonly manages: boolean;
}) {
  const t = useTranslations("stats.checkIn");
  const locale = useLocale();
  const { dateTime } = useDates();
  const errorMessage = useApiErrorMessage();
  const codes = useGetStampCodesQuery({ targetType, targetId });
  const [issue, issuing] = useIssueStampCodeMutation();
  const [withdraw, withdrawing] = useWithdrawStampCodeMutation();
  const [confirming, setConfirming] = useState<"replace" | "withdraw" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const current = codes.data?.find((code) => code.replacedAt === null) ?? null;
  const payload = current?.payload ?? null;
  /* The QR drawn for the current payload; drawn again when the code changes. */
  const [drawn, setDrawn] = useState<{ readonly payload: string; readonly url: string } | null>(null);
  const image = drawn && drawn.payload === payload ? drawn.url : null;
  const busy = issuing.isLoading || withdrawing.isLoading;

  useEffect(() => {
    if (!payload) return;
    let live = true;
    void QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 480 }).then((url) => {
      if (live) setDrawn({ payload, url });
    });
    return () => {
      live = false;
    };
  }, [payload]);

  const run = (action: Promise<unknown>) => {
    setProblem(null);
    setConfirming(null);
    action.catch((error: unknown) => setProblem(errorMessage(error)));
  };

  /** A page with the QR, the place's name and the code, sent straight to the printer, in the language the dashboard is read in. */
  const print = () => {
    if (!image || !current) return;
    const page = window.open("", "_blank", "width=720,height=960");
    if (!page) return;
    page.document.write(
      `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escape(t("printTitle", { name }))}</title>` +
        "<style>body{margin:0;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1d1d1b;display:flex;min-height:100vh;align-items:center;justify-content:center}" +
        "main{text-align:center;padding:32px;max-width:520px}h1{font-size:28px;margin:0 0 4px}p{margin:0 0 8px;color:#444}" +
        "img{width:360px;height:360px;margin:16px 0}.code{font:600 26px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;margin:0 0 16px}" +
        "footer{margin-top:24px;font-size:13px;color:#666}@media print{body{min-height:auto}}</style></head><body><main>" +
        `<h1>${escape(name)}</h1><p>${escape(t("printLead"))}</p><img src="${image}" alt="">` +
        `<p class="code">${escape(current.code)}</p><p>${escape(t("printHow"))}</p>` +
        `<footer>${escape(t("printFooter"))}</footer></main>` +
        "<script>window.onload=function(){window.print()}</script></body></html>",
    );
    page.document.close();
  };

  return (
    <Surface aria-label={t("title")} className="p-4">
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <p className="mt-1 text-xs text-muted">{current ? t("issued", { date: dateTime(current.issuedAt) }) : t("none")}</p>
      {codes.isLoading || codes.error ? (
        <div className="mt-3">
          <QueryState error={codes.error} loading={codes.isLoading} retry={codes.refetch} />
        </div>
      ) : null}
      {current ? (
        <div className="mt-3 flex flex-wrap items-start gap-4">
          {image ? (
            <Image alt="" className="size-36 shrink-0 rounded-md ring-1 ring-line" height={144} src={image} unoptimized width={144} />
          ) : (
            <div aria-hidden className="size-36 shrink-0 animate-pulse rounded-md bg-sand" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-lg font-semibold tracking-widest text-ink" data-field="check-in-code">{current.code}</p>
            <p className="mt-1 text-xs break-all text-muted">{current.payload}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button disabled={!image} onClick={print} size="sm" type="button" variant="secondary">
                <Printer aria-hidden className="size-3.5" />
                {t("print")}
              </Button>
              {manages && confirming === null ? (
                <>
                  <Button disabled={busy} onClick={() => setConfirming("replace")} size="sm" type="button" variant="ghost">
                    <RefreshCw aria-hidden className="size-3.5" />
                    {t("issueNew")}
                  </Button>
                  <Button className="text-muted hover:text-heritage" disabled={busy} onClick={() => setConfirming("withdraw")} size="sm" type="button" variant="ghost">
                    <Trash2 aria-hidden className="size-3.5" />
                    {t("withdraw")}
                  </Button>
                </>
              ) : null}
              {manages && confirming !== null ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted">
                    {confirming === "replace" ? t("confirmReplace") : t("confirmWithdraw")}
                  </span>
                  <Button
                    disabled={busy}
                    onClick={() => run(confirming === "replace" ? issue({ targetType, targetId }).unwrap() : withdraw(current.id).unwrap())}
                    size="sm"
                    type="button"
                    variant={confirming === "replace" ? "default" : "destructive"}
                  >
                    {confirming === "replace" ? t("replace") : t("withdraw")}
                  </Button>
                  <Button onClick={() => setConfirming(null)} size="sm" type="button" variant="ghost">
                    {t("cancel")}
                  </Button>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : manages && codes.data ? (
        <Button className="mt-3" disabled={busy} onClick={() => run(issue({ targetType, targetId }).unwrap())} size="sm" type="button">
          <QrCode aria-hidden className="size-3.5" />
          {t("issue")}
        </Button>
      ) : null}
      {codes.data && codes.data.length > 1 ? (
        <p className="mt-3 text-xs text-muted">{t("replaced", { count: codes.data.length - 1 })}</p>
      ) : null}
      {problem ? <p className="mt-2 text-xs text-heritage" role="alert">{problem}</p> : null}
    </Surface>
  );
}
