"use client";

import { useTranslations } from "next-intl";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { LOGO } from "@/lib/brand";
import type { AdminUser } from "@/features/auth/types";
import { SidebarNav } from "@/features/shell/components/sidebar-nav";
import { cn } from "@/lib/utils";

export function SidebarBrand({
  iconOnly = false,
  onNavigate,
}: {
  readonly iconOnly?: boolean;
  readonly onNavigate?: () => void;
}) {
  const t = useTranslations("shell.brand");
  return (
    <Link
      aria-label={t("home")}
      className="flex min-w-0 items-center gap-2.5 rounded-md"
      href="/dashboard"
      onClick={onNavigate}
    >
      <Image
        alt=""
        className="size-7 shrink-0 rounded-full object-cover ring-1 ring-line"
        height={28}
        src={LOGO}
        width={28}
      />
      <span className={cn("flex min-w-0 items-baseline gap-1.5", iconOnly && "sr-only")}>
        <span className="truncate text-sm font-semibold text-ink">{t("name")}</span>
        <span className="text-xs text-muted">{t("product")}</span>
      </span>
    </Link>
  );
}

export function SidebarPanel({
  admin,
  onNavigate,
  onClose,
  collapsed = false,
}: {
  readonly admin: AdminUser;
  readonly onNavigate?: () => void;
  readonly onClose?: () => void;
  readonly collapsed?: boolean;
}) {
  const t = useTranslations("shell.sidebar");
  return (
    <div className="glass-sidebar relative flex h-full min-h-0 flex-col border-r border-line">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <SidebarBrand iconOnly={collapsed} onNavigate={onNavigate} />
        {onClose ? (
          <button
            aria-label={t("close")}
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-sand-deep hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="quiet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pt-3">
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} roles={admin.roles} />
      </div>
    </div>
  );
}
