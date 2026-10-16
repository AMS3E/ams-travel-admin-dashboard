"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiErrorMessage } from "@/store/api/api-error";

export function QueryState({
  loading,
  error,
  retry,
}: {
  readonly loading?: boolean;
  readonly error?: unknown;
  readonly retry?: () => unknown;
}) {
  const t = useTranslations("common");
  const apiErrorMessage = useApiErrorMessage();
  if (error)
    return (
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-sm text-heritage"
        role="alert"
      >
        <CircleAlert aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">{apiErrorMessage(error)}</span>
        {typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 401 ? (
          <Link className="font-medium underline underline-offset-2" href="/login">
            {t("signIn")}
          </Link>
        ) : (
          retry && (
            <Button onClick={() => retry()} size="sm" variant="secondary">
              {t("tryAgain")}
            </Button>
          )
        )}
      </div>
    );
  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        {t("loading")}
      </div>
    );
  return null;
}

/** Nothing to list: one quiet line, centred where the rows would be. */
export function EmptyState({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}
