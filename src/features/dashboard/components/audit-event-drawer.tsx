"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, ChevronUp, ExternalLink, History, Lock, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  AUDIT_ACTION_TONES,
  shortId,
  type AuditFieldChange,
  type AuditRow,
  type AuditValue,
} from "@/features/dashboard/audit";
import { cn } from "@/lib/utils";

interface AuditEventDrawerProps {
  readonly row: AuditRow;
  /** Where the event sits in the list being shown, from 1. */
  readonly position: number;
  readonly total: number;
  readonly onClose: () => void;
  readonly onNewer?: () => void;
  readonly onOlder?: () => void;
  /** Narrows the page to this record's history. */
  readonly onRecordHistory?: () => void;
  /** Narrows the page to this person's events. */
  readonly onActorHistory?: () => void;
}

/* Longer text folds behind "Show more". */
const CLAMP = 280;
/* JSON longer than this many lines starts folded. */
const JSON_LINES = 8;

/** One audit event in full, over the table it was opened from. Mounted open; closed by unmounting. */
export function AuditEventDrawer({
  row,
  position,
  total,
  onClose,
  onNewer,
  onOlder,
  onRecordHistory,
  onActorHistory,
}: AuditEventDrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      element.close();
    };
  }, []);

  const t = useTranslations("audit");
  const title = row.action === "PURGE" ? t("drawer.theAuditLog") : (row.name ?? row.typeLabel);

  return (
    <dialog
      aria-labelledby={titleId}
      className="side-dialog fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-scrim"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialog}
    >
      <button
        aria-label={t("drawer.close")}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div className="side-drawer relative ml-auto flex h-full w-full max-w-2xl flex-col bg-paper shadow-pop sm:border-l sm:border-line">
        <header className="flex shrink-0 items-start gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="heading truncate text-lg font-semibold text-ink" id={titleId} title={title}>
              {title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <Badge dot tone={AUDIT_ACTION_TONES[row.action]}>
                {t(`actions.${row.action}`)}
              </Badge>
              <span className="whitespace-nowrap">
                {row.typeLabel}
                <span aria-hidden> · </span>
                <time className="tabular-nums" dateTime={row.iso} title={row.at}>
                  {t("drawer.dayAt", { day: row.day, time: row.time })}
                </time>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <span className="mr-1.5 hidden text-xs text-muted tabular-nums sm:inline">
              {t("drawer.position", { position, total })}
            </span>
            <Button aria-label={t("drawer.newer")} disabled={!onNewer} onClick={onNewer} size="icon-sm" title={t("drawer.newer")} type="button" variant="ghost">
              <ChevronUp aria-hidden className="size-4" />
            </Button>
            <Button aria-label={t("drawer.older")} disabled={!onOlder} onClick={onOlder} size="icon-sm" title={t("drawer.older")} type="button" variant="ghost">
              <ChevronDown aria-hidden className="size-4" />
            </Button>
            <Button aria-label={t("drawer.close")} autoFocus onClick={onClose} size="icon-sm" title={t("drawer.closeEsc")} type="button" variant="ghost">
              <X aria-hidden className="size-4" />
            </Button>
          </div>
        </header>

        {/* Keyed, so walking to another change starts at its top with everything folded. */}
        <div className="min-h-0 flex-1 overflow-y-auto" key={row.id}>
          <Changes row={row} />
          <Details onActorHistory={onActorHistory} onRecordHistory={onRecordHistory} row={row} />
          <MoreDetails row={row} />
        </div>
      </div>
    </dialog>
  );
}

function Section({ title, aside, children }: { readonly title: string; readonly aside?: ReactNode; readonly children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-b border-line px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink" id={id}>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <>
      <dt className="pt-0.5 text-xs font-medium text-muted">{label}</dt>
      <dd className="min-w-0 text-sm text-ink-soft">{children}</dd>
    </>
  );
}

/** A full identifier with its copy button. */
function Identifier({ value, label, shown }: { readonly value: string; readonly label: string; readonly shown?: string }) {
  return (
    <span className="flex min-w-0 items-start gap-1">
      <span className="min-w-0 pt-0.5 break-all tabular-nums">{shown ?? value}</span>
      <CopyButton label={label} value={value} />
    </span>
  );
}

/** When, who, and which record: what someone reading the log asks first. */
function Details({
  row,
  onRecordHistory,
  onActorHistory,
}: {
  readonly row: AuditRow;
  readonly onRecordHistory?: () => void;
  readonly onActorHistory?: () => void;
}) {
  const t = useTranslations("audit.drawer.details");
  const drawer = useTranslations("audit.drawer");
  const named = Boolean(row.raw.userName?.trim() || row.raw.userEmail?.trim());

  return (
    <Section title={t("title")}>
      <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <Fact label={t("when")}>
          <time className="tabular-nums" dateTime={row.iso}>
            {row.at}
          </time>
          <span className="block text-xs text-muted">{t("cambodiaTime")}</span>
        </Fact>

        <Fact label={t("by")}>
          <span className={cn(!row.userId && "text-muted")}>{row.actor}</span>
          {row.actorEmail ? <span className="block truncate text-xs text-muted">{row.actorEmail}</span> : null}
          {!row.userId ? (
            <span className="block text-xs text-muted">{t("automatic")}</span>
          ) : null}
        </Fact>

        <Fact label={t("record")}>
          {row.action === "PURGE" ? (
            drawer("theAuditLog")
          ) : (
            <span className="flex flex-wrap items-center gap-x-2">
              <span className={cn(!row.name && "text-muted")}>{row.name ?? t("unnamed")}</span>
              <span className="text-xs text-muted">{row.typeLabel}</span>
              {row.href ? (
                <Link className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline" href={row.href}>
                  {t("openRecord")}
                  <ExternalLink aria-hidden className="size-3" />
                </Link>
              ) : null}
            </span>
          )}
        </Fact>
      </dl>

      {onRecordHistory || onActorHistory ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onRecordHistory ? (
            <Button onClick={onRecordHistory} size="sm" type="button" variant="secondary">
              <History aria-hidden className="size-3.5" />
              {t("recordHistory")}
            </Button>
          ) : null}
          {onActorHistory ? (
            <Button className="max-w-full" onClick={onActorHistory} size="sm" type="button" variant="secondary">
              <UserRound aria-hidden className="size-3.5" />
              <span className="truncate">{t("personHistory", { name: named ? row.actor : t("thisAccount") })}</span>
            </Button>
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}

function Changes({ row }: { readonly row: AuditRow }) {
  const t = useTranslations("audit.drawer");
  const [showBlank, setShowBlank] = useState(false);

  if (row.action === "PURGE") {
    return (
      <Section title={t("sections.PURGE")}>
        <Notice
          text={
            row.removed == null
              ? t("purgedAll")
              : t("purgedCount", { count: row.removed })
          }
        />
      </Section>
    );
  }

  const blank = row.changes.filter((change) => change.blank).length;
  const shown = showBlank ? row.changes : row.changes.filter((change) => !change.blank);
  const withBefore = row.changes.some((change) => change.before !== null);
  const withAfter = row.changes.some((change) => change.after !== null);
  const compare = row.action === "UPDATE" && withBefore && withAfter;

  return (
    <Section
      aside={
        blank ? (
          <button
            className="text-xs font-medium text-teal-deep hover:underline"
            onClick={() => setShowBlank((current) => !current)}
            type="button"
          >
            {showBlank ? t("hideEmpty") : t("showEmpty", { count: blank })}
          </button>
        ) : null
      }
      title={shown.length ? t("sections.count", { title: t(`sections.${row.action}`), count: shown.length }) : t(`sections.${row.action}`)}
    >
      {row.action === "UPDATE" && !withBefore && row.changes.length ? (
        <p className="mb-3 text-xs text-muted">{t("noBefore")}</p>
      ) : null}

      {shown.length ? (
        <ChangeTable
          afterLabel={compare ? t("table.after") : t("table.value")}
          beforeLabel={compare ? t("table.before") : t("table.value")}
          changes={shown}
          compare={compare}
          withAfter={withAfter}
          withBefore={withBefore}
        />
      ) : (
        <Notice
          text={
            row.action === "UPDATE"
              ? t("noFieldChanges")
              : blank
                ? t("allEmpty")
                : t("noValues")
          }
        />
      )}
    </Section>
  );
}

function Notice({ text }: { readonly text: string }) {
  return <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-sm text-muted">{text}</p>;
}

/* Static class names, so Tailwind finds them. */
const TWO_SIDES = "sm:grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_minmax(0,1fr)]";
const ONE_SIDE = "sm:grid-cols-[minmax(7rem,12rem)_minmax(0,1fr)]";

function ChangeTable({
  changes,
  withBefore,
  withAfter,
  compare,
  beforeLabel,
  afterLabel,
}: {
  readonly changes: readonly AuditFieldChange[];
  readonly withBefore: boolean;
  readonly withAfter: boolean;
  readonly compare: boolean;
  readonly beforeLabel: string;
  readonly afterLabel: string;
}) {
  const t = useTranslations("audit.drawer.table");
  const template = withBefore && withAfter ? TWO_SIDES : ONE_SIDE;
  return (
    <div aria-label={t("label")} className="overflow-hidden rounded-lg border border-line" role="table">
      <div className="hidden border-b border-line bg-sand sm:block" role="rowgroup">
        <div className={cn("grid", template)} role="row">
          <span className="px-3 py-2 text-xs font-medium text-muted" role="columnheader">
            {t("field")}
          </span>
          {withBefore ? (
            <span className="px-3 py-2 text-xs font-medium text-muted" role="columnheader">
              {beforeLabel}
            </span>
          ) : null}
          {withAfter ? (
            <span className="px-3 py-2 text-xs font-medium text-muted" role="columnheader">
              {afterLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="divide-y divide-line" role="rowgroup">
        {changes.map((change) => (
          <div className={cn("grid grid-cols-1", template)} key={change.field} role="row">
            <span
              className="px-3 pt-2.5 text-xs font-medium wrap-break-word text-ink sm:py-2.5"
              role="rowheader"
              title={change.field}
            >
              {change.label}
            </span>
            {withBefore ? (
              <ValueCell label={beforeLabel} tint={compare ? "before" : null} value={change.before} />
            ) : null}
            {withAfter ? <ValueCell label={afterLabel} tint={compare ? "after" : null} value={change.after} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function copyTextOf(value: AuditValue): string | null {
  switch (value.kind) {
    case "boolean":
    case "date":
      return value.raw;
    case "id":
      return value.raw;
    case "number":
    case "text":
    case "json":
      return value.text;
    default:
      return null;
  }
}

function ValueCell({
  value,
  label,
  tint,
}: {
  readonly value: AuditValue | null;
  readonly label: string;
  readonly tint: "before" | "after" | null;
}) {
  const shown = value ?? { kind: "absent" as const };
  const copy = copyTextOf(shown);
  return (
    <div
      className={cn(
        "group min-w-0 px-3 py-1.5 last:pb-2.5 sm:py-2.5",
        tint === "before" && "bg-heritage-soft/60",
        tint === "after" && "bg-success-soft/60",
      )}
      role="cell"
    >
      <span className="block text-2xs font-medium text-muted sm:hidden">{label}</span>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1 text-sm text-ink-soft">
          <ValueView value={shown} />
        </div>
        {copy ? (
          <CopyButton
            className="-my-0.5 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
            label={label.toLowerCase()}
            value={copy}
          />
        ) : null}
      </div>
    </div>
  );
}

function ValueView({ value }: { readonly value: AuditValue }) {
  const t = useTranslations("audit.values");
  switch (value.kind) {
    case "absent":
      return (
        <span className="text-muted" title={t("absentTitle")}>
          —
        </span>
      );
    case "null":
      return <span className="text-muted italic">{t("notSet")}</span>;
    case "empty":
      return <span className="text-muted italic">{t("empty")}</span>;
    case "hidden":
      return (
        <span className="inline-flex items-center gap-1 text-muted" title={t("hiddenTitle")}>
          <Lock aria-hidden className="size-3" />
          {t("hidden")}
        </span>
      );
    case "boolean":
      return <span title={value.raw}>{value.value ? t("yes") : t("no")}</span>;
    case "number":
      return <span className="tabular-nums">{value.text}</span>;
    case "date":
      return (
        <time className="tabular-nums" dateTime={value.raw} title={value.raw}>
          {value.text}
        </time>
      );
    case "id":
      return value.name ? (
        <span>
          {value.name}
          <span className="ml-1.5 text-xs text-muted tabular-nums" title={value.raw}>
            #{shortId(value.raw)}
          </span>
        </span>
      ) : (
        <span className="break-all tabular-nums" title={value.raw}>
          {value.raw}
        </span>
      );
    case "text":
      /* A status or kind as the API names it, said in words; the value itself is unchanged. */
      return t.has(`enums.${value.text}` as "enums.DRAFT") ? (
        <span title={value.text}>{t(`enums.${value.text}` as "enums.DRAFT")}</span>
      ) : (
        <LongText text={value.text} />
      );
    case "json":
      return <JsonValue summary={t(value.shape, { count: value.count })} text={value.text} />;
  }
}

function LongText({ text }: { readonly text: string }) {
  const t = useTranslations("audit.values");
  const [full, setFull] = useState(false);
  const long = text.length > CLAMP;
  return (
    <span className="block wrap-break-word whitespace-pre-wrap">
      {long && !full ? `${text.slice(0, CLAMP).trimEnd()}…` : text}
      {long ? (
        <button
          className="ml-1.5 text-xs font-medium whitespace-nowrap text-teal-deep hover:underline"
          onClick={() => setFull((current) => !current)}
          type="button"
        >
          {full ? t("showLess") : t("showMore")}
        </button>
      ) : null}
    </span>
  );
}

function JsonValue({ text, summary }: { readonly text: string; readonly summary: string }) {
  const t = useTranslations("audit.values");
  const long = text.split("\n").length > JSON_LINES;
  const [open, setOpen] = useState(false);
  return (
    <span className="block min-w-0">
      <pre
        className={cn(
          "rounded-md border border-line bg-sand px-2 py-1.5 font-mono text-xs leading-relaxed whitespace-pre text-ink-soft",
          long && !open ? "max-h-28 overflow-hidden" : "max-h-80 overflow-auto",
        )}
      >
        {text}
      </pre>
      {long ? (
        <button
          aria-expanded={open}
          className="mt-1 text-xs font-medium text-teal-deep hover:underline"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? t("showLess") : t("showAll", { summary })}
        </button>
      ) : null}
    </span>
  );
}

/** Codes and raw data, folded away: for tracing a problem, not for reading the log. */
function MoreDetails({ row }: { readonly row: AuditRow }) {
  const t = useTranslations("audit.drawer.more");
  const json = JSON.stringify(row.raw, null, 2);
  return (
    <details className="group/raw">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-ink-soft select-none hover:text-ink sm:px-5 [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 text-muted transition-transform group-open/raw:rotate-90" />
        {t("title")}
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-5 sm:px-5">
        <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 sm:grid-cols-[7rem_minmax(0,1fr)]">
          {row.entityId ? (
            <Fact label={t("recordId")}>
              <Identifier label={t("copyRecordId")} value={row.entityId} />
            </Fact>
          ) : null}
          {row.userId ? (
            <Fact label={t("personId")}>
              <Identifier label={t("copyPersonId")} value={row.userId} />
            </Fact>
          ) : null}
          <Fact label={t("changeNo")}>
            <Identifier label={t("copyChangeNo")} value={String(row.id)} />
          </Fact>
          {row.ipAddress ? (
            <Fact label={t("ipAddress")}>
              <Identifier label={t("copyIpAddress")} value={row.ipAddress} />
            </Fact>
          ) : null}
          {row.userAgent ? (
            <Fact label={t("device")}>
              <span className="line-clamp-2 text-xs wrap-break-word text-muted" title={row.userAgent}>
                {row.userAgent}
              </span>
            </Fact>
          ) : null}
        </dl>
        <div>
          <p className="mb-2 text-xs text-muted">{t("raw")}</p>
          <div className="relative">
            <pre className="max-h-96 overflow-auto rounded-lg border border-line bg-sand p-3 pr-10 font-mono text-xs leading-relaxed whitespace-pre text-ink-soft">
              {json}
            </pre>
            <CopyButton className="absolute top-2 right-2 bg-paper" label={t("copyRaw")} value={json} />
          </div>
        </div>
      </div>
    </details>
  );
}
