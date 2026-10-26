import { useMessages, useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dateTimeOf } from "@/i18n/dates";
import { decidedVerified, type DestinationVerificationResponse, type VerifiedStatusResponse } from "../api/contracts";
import { VerifyButton } from "./verify-button";

interface VerificationPanelProps {
  readonly destinationId: string;
  readonly name: string;
  /** Which kind of listing; an attraction when left out. */
  readonly resource?: "destinations" | "stays" | "foods" | "activities";
  /** The public status; null when the API could not say. */
  readonly status: VerifiedStatusResponse | null;
  /** The decisions, newest first; null for an account whose desk may not verify this destination. */
  readonly history: readonly DestinationVerificationResponse[] | null;
}

/**
 * Verification, on the destination's own page.
 *
 * The edit form carries no Verified checkbox: a destination is verified on
 * evidence, through the verification drawer. This says where it stands and,
 * for a desk allowed to decide it, opens that drawer in place. Everyone else
 * sees the status alone.
 */
export function VerificationPanel({ destinationId, name, resource = "destinations", status, history }: VerificationPanelProps) {
  const t = useTranslations("verification");
  const dates = useMessages().common.dates;
  if (!status && !history) return null;

  const verified = status?.verified ?? history?.[0]?.verified ?? false;
  const basis = status?.basis ?? history?.[0]?.basis ?? null;
  const latest = history?.[0];
  const decider = latest?.decidedByName ?? t("line.deletedAccount");
  const decision = latest
    ? t("panel.sentence", {
        text: [
          latest.verified ? t("line.verifiedBy", { name: decider }) : t("line.revokedBy", { name: decider }),
          dateTimeOf(latest.createdAt, dates),
          latest.reference,
        ]
          .filter(Boolean)
          .join(" · "),
      })
    : verified && status?.createdAt
      ? t("panel.verifiedSince", { date: dateTimeOf(status.createdAt, dates) })
      : history
        ? t("noDecision")
        : t("panel.whoVerifies");
  const ratings = status?.ratingCount
    ? status.averageRating != null
      ? t("panel.ratingsAt", { count: status.ratingCount, average: String(status.averageRating) })
      : t("panel.ratings", { count: status.ratingCount })
    : null;
  const detail = [
    basis === "TRAVELER_SCORE" ? t("panel.byTravellers") : null,
    decision,
    verified ? t("panel.badgeShown") : null,
    ratings,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="panel flex flex-wrap items-center gap-4 p-4">
      <span className="grid size-10 place-items-center rounded-lg bg-gold-soft text-gold-deep">
        <ShieldCheck aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">{t("title")}</h2>
          <Badge tone={verified ? "success" : "neutral"}>
            {verified && basis ? t("badge.verifiedBasis", { basis: t(`basis.${basis}`) }) : verified ? t("badge.verified") : t("badge.notVerified")}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted">{detail}</p>
      </div>
      {history ? <VerifyButton destination={{ id: destinationId, name, verified: decidedVerified({ verified, basis }), resource }} /> : null}
    </section>
  );
}
