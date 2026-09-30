"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/features/auth/actions";
import { AccountAvatar } from "@/features/auth/components/account-avatar";
import {
  hasPermission,
  primaryRole,
  type BusinessRole,
} from "@/features/auth/permissions";
import type { AdminUser } from "@/features/auth/types";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<BusinessRole, string> = {
  ADMIN: "Administrator",
  EDITOR: "Editor",
  CONTRIBUTOR: "Contributor",
  PARTNER: "Partner",
  BDO: "Business development",
};

const ITEM =
  "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-ink-soft transition-colors hover:bg-sand-deep hover:text-ink";

export function AccountMenu({ admin }: { readonly admin: AdminUser }) {
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const role = primaryRole(admin.roles);
  const roleLabel = role ? ROLE_LABELS[role] : "Team member";

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: Event) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={container}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={`Account options for ${admin.name}`}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md py-1 pr-1.5 pl-1 text-left transition-colors",
          open ? "bg-sand-deep" : "hover:bg-sand-deep",
        )}
        onClick={() => setOpen(!open)}
        ref={trigger}
        type="button"
      >
        <AccountAvatar name={admin.name} size={28} src={admin.avatarUrl} />
        <span className="hidden max-w-40 min-w-0 lg:block">
          <span className="block truncate text-sm leading-tight font-medium text-ink">{admin.name}</span>
          <span className="block truncate text-2xs leading-tight text-muted">{roleLabel}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-3.5 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          aria-label="Account options"
          className="glass absolute top-full right-0 z-50 mt-1.5 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-line shadow-pop"
          id={panelId}
        >
          <div className="px-3 pt-3 pb-2.5">
            <p className="text-2xs font-medium text-muted">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">{admin.name}</p>
            <p className="truncate text-xs text-muted" title={admin.email || admin.username}>
              {admin.email || admin.username}
            </p>
            <Badge className="mt-2" tone="info">
              {roleLabel}
            </Badge>
          </div>

          <div className="border-t border-line p-1">
            <Link className={ITEM} href="/profile" onClick={() => setOpen(false)}>
              <UserRound aria-hidden className="size-4 text-muted" strokeWidth={1.75} />
              My profile
            </Link>
            {hasPermission(admin.roles, "PERM_FULL_CONTROL") ? (
              <Link className={ITEM} href="/settings" onClick={() => setOpen(false)}>
                <Settings2 aria-hidden className="size-4 text-muted" strokeWidth={1.75} />
                Workspace settings
              </Link>
            ) : null}
          </div>

          <div className="border-t border-line p-1">
            <button
              className={cn(ITEM, "text-heritage hover:bg-heritage-soft hover:text-heritage disabled:opacity-50")}
              disabled={signingOut}
              onClick={() => startSignOut(() => logoutAction())}
              type="button"
            >
              <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
