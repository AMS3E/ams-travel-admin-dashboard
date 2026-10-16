"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, History, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifyDrawer, type DrawerFocus, type VerifiableDestination } from "./verify-drawer";

/**
 * Where one destination's verification is managed from a screen that shows a
 * single row — the destination's own page. It opens the verification drawer
 * in place rather than flipping a flag, because a destination is verified on
 * evidence and the drawer is where the invoice goes.
 */
export function VerifyButton({ destination }: { readonly destination: VerifiableDestination }) {
  const t = useTranslations("verification.actions");
  const [focus, setFocus] = useState<DrawerFocus | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={() => setFocus("history")}
        size="sm"
        type="button"
        variant="ghost"
      >
        <History aria-hidden className="size-4" />
        {t("history")}
      </Button>
      <Button
        onClick={() => setFocus("verify")}
        size="sm"
        type="button"
        variant={destination.verified ? "secondary" : "default"}
      >
        {destination.verified ? (
          <ShieldCheck aria-hidden className="size-4" />
        ) : (
          <BadgeCheck aria-hidden className="size-4" />
        )}
        {destination.verified ? t("renewOrRevoke") : t("verify")}
      </Button>
      {focus ? (
        <VerifyDrawer destination={destination} focus={focus} onClose={() => setFocus(null)} />
      ) : null}
    </div>
  );
}
