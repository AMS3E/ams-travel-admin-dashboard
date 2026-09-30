import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/features/dashboard/format";
import type { DestinationVerificationResponse, VerifiedStatusResponse } from "../api/contracts";
import { VerifyButton } from "./verify-button";

interface VerificationPanelProps {
  readonly destinationId: string;
  readonly name: string;
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
export function VerificationPanel({ destinationId, name, status, history }: VerificationPanelProps) {
  if (!status && !history) return null;

  const verified = status?.verified ?? history?.[0]?.verified ?? false;
  const latest = history?.[0];
  const detail = latest
    ? [
        `${latest.verified ? "Verified" : "Revoked"} by ${latest.decidedByName ?? "a deleted account"}`,
        formatDateTime(latest.createdAt),
        latest.reference,
      ]
        .filter(Boolean)
        .join(" · ")
    : verified && status?.createdAt
      ? `Verified since ${formatDateTime(status.createdAt)}.`
      : history
        ? "No decision has been recorded yet."
        : "A BDO verifies partner listings, an editor contributor drafts, and an administrator any destination.";

  return (
    <section className="panel flex flex-wrap items-center gap-4 p-4">
      <span className="grid size-10 place-items-center rounded-lg bg-gold-soft text-gold-deep">
        <ShieldCheck aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Verification</h2>
          <Badge tone={verified ? "gold" : "neutral"}>
            {verified ? "Verified" : "Not verified"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted">{detail}</p>
      </div>
      {history ? <VerifyButton destination={{ id: destinationId, name, verified }} /> : null}
    </section>
  );
}
