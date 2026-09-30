import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/features/dashboard/format";
import {
  DESK_LABELS,
  REQUEST_LABELS,
  REQUEST_TONES,
  listingHref,
  type ListingType,
  type PublishRequestResponse,
} from "@/features/publishing/api/contracts";
import { listingLabel } from "@/features/publishing/listings";

interface RequestRowsProps {
  readonly requests: readonly PublishRequestResponse[];
  readonly empty: string;
  /** Shown with the submitter's name — off on a screen where it is always you. */
  readonly showRequester?: boolean;
  /** The kinds of listing this role may open: a row links to its listing only then. */
  readonly openable?: readonly ListingType[];
  readonly actions?: (request: PublishRequestResponse) => ReactNode;
  readonly limit?: number;
}

export function RequestRows({
  requests,
  empty,
  showRequester = false,
  openable = [],
  actions,
  limit,
}: RequestRowsProps) {
  if (!requests.length) {
    return <p className="panel px-4 py-6 text-center text-sm text-muted">{empty}</p>;
  }

  const shown = limit ? requests.slice(0, limit) : requests;

  return (
    <ul className="panel divide-y divide-line overflow-hidden">
      {shown.map((request) => (
        <li className="flex flex-col gap-1.5 px-4 py-3" key={request.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              {openable.includes(request.targetType) ? (
                <Link
                  className="truncate text-sm font-medium text-ink hover:text-teal-deep hover:underline"
                  href={listingHref(request)}
                >
                  {request.targetName}
                </Link>
              ) : (
                <span className="truncate text-sm font-medium text-ink">
                  {request.targetName}
                </span>
              )}
              <Badge tone="neutral">{listingLabel(request.targetType)}</Badge>
              <Badge dot tone={REQUEST_TONES[request.status]}>
                {REQUEST_LABELS[request.status]}
              </Badge>
              <Badge tone="neutral">
                {DESK_LABELS[request.desk]}
              </Badge>
            </span>

            <span className="text-xs text-muted tabular-nums">
              {formatDateTime(request.requestedAt)}
            </span>
          </div>

          {showRequester ? (
            <p className="text-xs text-muted">
              Submitted by {request.requestedByName ?? "an account that no longer exists"}
            </p>
          ) : null}

          {request.status !== "PENDING_REVIEW" ? (
            <p className="text-xs text-ink-soft">
              {REQUEST_LABELS[request.status]} by{" "}
              {request.reviewerName ?? "a reviewer"}
              {request.reviewedAt ? ` · ${formatDateTime(request.reviewedAt)}` : ""}
              {request.reviewNote ? ` — ${request.reviewNote}` : ""}
            </p>
          ) : request.status === "PENDING_REVIEW" && request.reviewNote ? (
            /*
             * Pending again after a round of changes. The reviewer needs the
             * feedback they gave in front of them to judge whether it was met.
             */
            <p className="text-xs text-ink-soft">
              Resubmitted · {request.reviewerName ?? "a reviewer"} asked for:{" "}
              {request.reviewNote}
            </p>
          ) : null}

          {actions ? <div className="pt-1">{actions(request)}</div> : null}
        </li>
      ))}
    </ul>
  );
}
