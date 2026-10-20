"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, ExternalLink, MapPin, ShieldOff, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetCatalogQuery, useGetCatalogRecordQuery } from "@/features/catalog/api/catalog-api";
import { QueryState } from "@/features/cms/components/query-state";
import { useDates } from "@/i18n/use-dates";
import type { PublishDesk } from "@/features/publishing/api/contracts";
import { useGetDestinationVerificationsQuery } from "../api/verification-api";
import type { DestinationVerificationResponse } from "../api/contracts";
import { VerificationForm, type VerificationDecision } from "./verification-form";
import { VerificationHistory } from "./verification-history";

export interface VerifiableDestination {
  readonly id: string;
  readonly name: string;
  readonly verified: boolean;
  /** Whose writing it is, when the screen knows — the queue does. */
  readonly desk?: PublishDesk;
}

/** What the drawer opened for: a decision to make, or the record to read first. */
export type DrawerFocus = VerificationDecision | "history";

interface VerifyDrawerProps {
  readonly destination: VerifiableDestination;
  readonly focus?: DrawerFocus;
  readonly onClose: () => void;
}

/** Each listing status's tone; its words are `verification.destinationStatus`. */
const STATUS_TONES = {
  PUBLISHED: "active",
  DRAFT: "neutral",
  ARCHIVED: "inactive",
} as const satisfies Readonly<Record<string, "active" | "neutral" | "inactive">>;

type ListingStatus = keyof typeof STATUS_TONES;
const isListingStatus = (value: unknown): value is ListingStatus => typeof value === "string" && value in STATUS_TONES;

/**
 * The verification form and the destination's history, opened over whichever
 * screen the destination was found on — the verification queue, the
 * destination itself — so verifying never means leaving it.
 *
 * The listing sits at the top, because verifying is comparing: the name and
 * address on the paperwork against the name and address travellers will see.
 * Once a decision is filed the form gives way to what was recorded.
 *
 * Mounted open and closed by unmounting: the caller decides when it exists,
 * which keeps one drawer per list rather than one per row.
 */
export function VerifyDrawer({ destination, focus = "verify", onClose }: VerifyDrawerProps) {
  const t = useTranslations("verification");
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const history = useGetDestinationVerificationsQuery(destination.id);
  const [filed, setFiled] = useState<DestinationVerificationResponse | null>(null);
  const titleId = `verify-${destination.id}-title`;

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

  const verified = filed ? filed.verified : destination.verified;

  const form = filed ? (
    <Filed decision={filed} onAnother={() => setFiled(null)} onClose={onClose} />
  ) : (
    <VerificationForm
      desk={destination.desk}
      destinationId={destination.id}
      initialDecision={focus === "revoke" ? "revoke" : "verify"}
      onCancel={onClose}
      onDone={(decision) => {
        setFiled(decision);
        /* A server-rendered destination page shows the status too. */
        router.refresh();
      }}
      verified={destination.verified}
    />
  );
  const record = (
    <>
      <QueryState error={history.error} loading={history.isLoading} retry={history.refetch} />
      {history.data ? <VerificationHistory history={history.data} /> : null}
    </>
  );

  return (
    <dialog
      aria-labelledby={titleId}
      className="verify-dialog fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim backdrop:backdrop-blur-sm"
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
      <div className="verify-drawer relative ml-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-shell shadow-pop">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-paper px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{t("title")}</p>
            <h2 className="heading truncate text-lg font-semibold text-ink" id={titleId}>
              {destination.name}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={verified ? "success" : "neutral"}>{verified ? t("badge.verified") : t("badge.notVerified")}</Badge>
            <Button aria-label={t("drawer.closeButton")} onClick={onClose} size="icon-sm" type="button" variant="ghost">
              <X aria-hidden className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-4 p-4">
          <ListingSummary desk={destination.desk} id={destination.id} />
          {/* Opened for the record, the record comes first; opened to decide, the form does. */}
          {focus === "history" && !filed ? (
            <>
              {record}
              {form}
            </>
          ) : (
            <>
              {form}
              {record}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

/** The listing as travellers see it: what the paperwork has to match. */
function ListingSummary({ id, desk }: { readonly id: string; readonly desk?: PublishDesk }) {
  const t = useTranslations("verification");
  const desks = useTranslations("publishing.desk");
  const listing = useGetCatalogRecordQuery({ resource: "destinations", id });
  const provinces = useGetCatalogQuery("provinces");

  if (listing.isLoading) {
    return <div aria-hidden className="panel h-28 animate-pulse" />;
  }
  if (!listing.data) return null;

  const record = listing.data;
  const text = (name: string) => (typeof record[name] === "string" && (record[name] as string).trim()) || null;
  const province = provinces.data?.find((row) => row.id === record.provinceId);
  const provinceName = province && typeof province.name === "string" ? province.name : null;
  const cover = text("coverUrl");
  const address = text("address");
  const latitude = typeof record.latitude === "number" ? record.latitude : null;
  const longitude = typeof record.longitude === "number" ? record.longitude : null;
  const status = isListingStatus(record.status) ? record.status : null;

  return (
    <section aria-label={t("drawer.listingLabel")} className="panel flex gap-3 p-3">
      {cover ? (
        <Image
          alt=""
          className="size-20 shrink-0 rounded-md object-cover ring-1 ring-line"
          height={80}
          src={cover}
          unoptimized
          width={80}
        />
      ) : (
        <span className="grid size-20 shrink-0 place-items-center rounded-md bg-sand-deep text-muted">
          <MapPin aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted">{t("drawer.compare")}</p>
        <p className="truncate text-sm font-semibold text-ink">{text("name")}</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {[address, provinceName].filter(Boolean).join(", ") || t("drawer.noAddress")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {status ? (
            <Badge dot tone={STATUS_TONES[status]}>
              {t(`destinationStatus.${status}`)}
            </Badge>
          ) : null}
          {desk ? <Badge>{desks(desk)}</Badge> : null}
          <a
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline"
            href={`/destinations/${id}`}
            rel="noreferrer"
            target="_blank"
          >
            {t("drawer.openListing")}
            <ExternalLink aria-hidden className="size-3" />
          </a>
          {latitude != null && longitude != null ? (
            <a
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline"
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              rel="noreferrer"
              target="_blank"
            >
              {t("drawer.seePin")}
              <ExternalLink aria-hidden className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** What was just recorded, in place of the form. */
function Filed({
  decision,
  onAnother,
  onClose,
}: {
  readonly decision: DestinationVerificationResponse;
  readonly onAnother: () => void;
  readonly onClose: () => void;
}) {
  const t = useTranslations("verification");
  const { dateTime } = useDates();
  const revoked = !decision.verified;
  const details = [
    decision.basis ? t(`basis.${decision.basis}`) : null,
    decision.reference ? t("filed.number", { reference: decision.reference }) : decision.evidenceKey ? t("filed.paperworkAttached") : null,
    decision.reference && decision.evidenceKey ? t("filed.paperworkAttachedLower") : null,
    dateTime(decision.createdAt),
  ].filter(Boolean);

  return (
    <section
      aria-live="polite"
      className={
        revoked
          ? "panel flex flex-col gap-3 border-heritage/25 p-4"
          : "panel flex flex-col gap-3 border-success/25 p-4"
      }
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          className={
            revoked
              ? "grid size-10 shrink-0 place-items-center rounded-full bg-heritage-soft text-heritage"
              : "grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success"
          }
        >
          {revoked ? <ShieldOff aria-hidden className="size-5" /> : <BadgeCheck aria-hidden className="size-5" />}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">{revoked ? t("filed.revokedTitle") : t("filed.verifiedTitle")}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {revoked
              ? t("filed.revokedBody")
              : decision.basis === "OFFICIAL_SITE"
                ? t("filed.officialBody")
                : t("filed.paperworkBody")}
          </p>
          {details.length ? <p className="mt-1 text-xs text-ink-soft">{details.join(" · ")}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onAnother} type="button" variant="ghost">
          {t("filed.another")}
        </Button>
        <Button onClick={onClose} type="button">
          {t("filed.done")}
        </Button>
      </div>
    </section>
  );
}
