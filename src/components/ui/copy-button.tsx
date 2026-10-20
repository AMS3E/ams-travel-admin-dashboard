"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  readonly value: string;
  /** What is copied, for the screen reader: "record ID". */
  readonly label: string;
  readonly className?: string;
}

/** A small icon button that copies one value and says so for a moment. */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const t = useTranslations("common.copy");
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  const title = state === "copied" ? t("copied") : state === "failed" ? t("failed") : t("copy", { label });
  return (
    <button
      aria-label={t("copy", { label })}
      className={cn(
        "inline-grid size-6 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-sand-deep hover:text-ink",
        state === "copied" && "text-success hover:text-success",
        state === "failed" && "text-heritage hover:text-heritage",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        void copy();
      }}
      title={title}
      type="button"
    >
      {state === "copied" ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? t("copied") : state === "failed" ? t("failed") : ""}
      </span>
    </button>
  );
}
