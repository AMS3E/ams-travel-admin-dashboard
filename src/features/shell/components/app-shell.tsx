"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Menu, PanelLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/features/auth/types";
import { AccountMenu } from "@/features/shell/components/account-menu";
import { SidebarPanel } from "@/features/shell/components/sidebar-panel";
import { dashboardItem, navigationForPath } from "@/features/shell/nav";
import { useNavText } from "@/features/shell/nav-text";
import { LanguageMenu } from "@/features/shell/components/language-menu";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMobileOpen, toggleSidebar } from "@/store/slices/sidebar-slice";
import { useGetCurrentUserQuery } from "@/features/auth/api/auth-api";
import { ThemeMenu } from "@/features/theme/components/theme-menu";
import { useMediaQuery } from "@/lib/use-media-query";
import { WorkspaceTools } from "./workspace-tools";

interface AppShellProps {
  readonly admin: AdminUser;
  readonly children: ReactNode;
}

export function AppShell({ admin, children }: AppShellProps) {
  const dispatch = useAppDispatch();
  const { mobileOpen: drawerOpen, collapsed } = useAppSelector(
    (state) => state.sidebar,
  );
  const { data: currentUser } = useGetCurrentUserQuery();
  const account = currentUser ?? admin;
  /* A tablet keeps the sidebar as an icon rail; the menu button opens it in full. */
  const tablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const rail = collapsed || tablet;
  const t = useTranslations("shell");
  const nav = useNavText();
  const pathname = usePathname();
  const currentPage = navigationForPath(pathname, account.roles);
  const routeParts = pathname.split("/").filter(Boolean);
  const pageTitle =
    (currentPage ? nav.label(currentPage.text) : null) ??
    (routeParts[0] && routeParts[0] !== "dashboard"
      ? routeParts[0]
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : nav.label(dashboardItem.text));
  const recordAction =
    routeParts.length > 1 && currentPage?.href !== pathname
      ? routeParts.at(-1) === "new"
        ? t("breadcrumb.create")
        : routeParts[0] === "destination-stats" || (routeParts[0] === "regions" && routeParts.length === 2)
          ? t("breadcrumb.detail")
          : t("breadcrumb.edit")
      : null;
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (!drawerOpen) {
      dialog.close();
      return;
    }

    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dispatch(setMobileOpen(false));
    };
    desktop.addEventListener("change", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
      dialog.close();
    };
  }, [drawerOpen, dispatch]);

  return (
    <div
      style={{ "--sidebar-width": rail ? "3.5rem" : "16rem" } as CSSProperties}
      className="cms-shell min-h-dvh md:grid md:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]"
    >
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2 focus:text-sm focus:shadow-pop"
        href="#main-content"
      >
        {t("skipToContent")}
      </a>
      <aside aria-label={t("sidebar.label")} className="sticky top-0 hidden h-dvh min-h-0 md:block">
        <SidebarPanel admin={account} collapsed={rail} />
      </aside>

      <dialog
        aria-label={t("sidebar.drawer")}
        className="sidebar-dialog fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim"
        id="mobile-navigation"
        onCancel={() => dispatch(setMobileOpen(false))}
        ref={drawer}
      >
        <button
          aria-label={t("sidebar.close")}
          className="absolute inset-0 cursor-default"
          onClick={() => dispatch(setMobileOpen(false))}
          tabIndex={-1}
          type="button"
        />
        <div className="sidebar-drawer relative h-full w-64 max-w-[calc(100vw-3rem)] shadow-pop">
          <SidebarPanel
            admin={account}
            onClose={() => dispatch(setMobileOpen(false))}
            onNavigate={() => dispatch(setMobileOpen(false))}
          />
        </div>
      </dialog>

      <div className="flex min-w-0 flex-col">
        <header className="glass-topbar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 md:px-4">
          <Button
            aria-controls="mobile-navigation"
            aria-expanded={drawerOpen}
            aria-label={t("sidebar.open")}
            className="lg:hidden"
            onClick={() => dispatch(setMobileOpen(true))}
            size="icon-sm"
            variant="ghost"
          >
            <Menu aria-hidden className="size-4" />
          </Button>
          <Button
            aria-expanded={!collapsed}
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className="hidden text-muted lg:inline-flex"
            onClick={() => dispatch(toggleSidebar())}
            size="icon-sm"
            title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            variant="ghost"
          >
            <PanelLeft aria-hidden className="size-4" />
          </Button>

          <span aria-hidden className="hidden h-5 w-px bg-line lg:block" />

          <nav aria-label={t("breadcrumb.label")} className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            {currentPage && currentPage.href !== "/dashboard" ? (
              <>
                <span className="hidden truncate text-muted lg:inline">{nav.group(currentPage.navGroup)}</span>
                <ChevronRight aria-hidden className="hidden size-3.5 shrink-0 text-line-hover lg:block" />
              </>
            ) : null}
            {recordAction && currentPage ? (
              <>
                <Link className="min-w-0 truncate text-muted hover:text-ink" href={currentPage.href}>
                  {pageTitle}
                </Link>
                <ChevronRight aria-hidden className="size-3.5 shrink-0 text-line-hover" />
                <span aria-current="page" className="font-medium text-ink">
                  {recordAction}
                </span>
              </>
            ) : (
              <span aria-current="page" className="min-w-0 truncate font-medium text-ink">
                {pageTitle}
              </span>
            )}
          </nav>

          <WorkspaceTools accountId={account.id} grants={account.roles} />
          <LanguageMenu />
          <ThemeMenu />
          <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />
          <AccountMenu admin={account} />
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 lg:px-8 lg:py-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
