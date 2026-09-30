"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
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
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="panel mx-auto max-w-md p-6 text-center">
      <TriangleAlert aria-hidden className="mx-auto size-5 text-heritage" />
      <h1 className="heading mt-3 text-lg font-semibold text-ink">
        This screen could not load
      </h1>
      <p className="mt-2 text-sm text-muted">
        The catalogue API did not answer as expected. Check that the Spring Boot
        service is running on the address in <code className="font-mono">API_BASE_URL</code>,
        then try again.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-2xs text-muted">Digest {error.digest}</p>
      ) : null}

      <Button className="mt-5" onClick={reset} variant="secondary">
        <RotateCw aria-hidden className="size-4" />
        Try again
      </Button>
    </div>
  );
}
