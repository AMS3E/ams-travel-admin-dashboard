"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSetCorridorPublishedMutation } from "@/features/corridors/api/corridors-api";
import { settled } from "@/store/api/api-error";

/** Publish or unpublish from the corridor's page; a refusal — a stop at a draft destination — is said beside it. */
export function PublishButton({ corridorId, published }: { readonly corridorId: string; readonly published: boolean }) {
  const router = useRouter();
  const t = useTranslations("corridors.words");
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const [setCorridorPublished] = useSetCorridorPublishedMutation();

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        disabled={pending}
        onClick={() => {
          setProblem(null);
          startTransition(async () => {
            const result = await settled(setCorridorPublished({ corridorId, published: !published }).unwrap());
            if (!result.ok) {
              setProblem(result.message);
              return;
            }
            // The corridor page around this button is rendered on the server.
            router.refresh();
          });
        }}
        type="button"
        variant="secondary"
      >
        {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
        {published ? t("unpublish") : t("publish")}
      </Button>
      {problem ? (
        <span className="max-w-xs text-right text-xs text-heritage" role="alert">
          {problem}
        </span>
      ) : null}
    </span>
  );
}
