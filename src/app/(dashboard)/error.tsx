"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

/**
 * Nearly every failure here is the same failure: Spring Boot is not running, or
 * it answered with something the screen could not use. Saying so plainly beats
 * a stack trace an editor cannot act on.
 */
export default function DashboardError({ error, reset }: ErrorProps) {
  const t = useTranslations("errors.screen");
  const common = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="panel mx-auto max-w-md p-6 text-center">
      <TriangleAlert aria-hidden className="mx-auto size-5 text-heritage" />
      <h1 className="heading mt-3 text-lg font-semibold text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">
        {t.rich("text", { code: (chunks) => <code className="font-mono">{chunks}</code> })}
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-2xs text-muted">{t("digest", { digest: error.digest })}</p>
      ) : null}

      <Button className="mt-5" onClick={reset} variant="secondary">
        <RotateCw aria-hidden className="size-4" />
        {common("tryAgain")}
      </Button>
    </div>
  );
}
