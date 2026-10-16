"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  dashboardItem,
  isNavigationActive,
  navGroups,
  type NavItem,
} from "@/features/shell/nav";
import { useNavText } from "@/features/shell/nav-text";
import { useTranslations } from "next-intl";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setGroupOpen } from "@/store/slices/sidebar-slice";
import { cn } from "@/lib/utils";

/**
 * The role's navigation, grouped as the back office is organised.
 *
 * Groups fold: the one holding the current page opens by itself, and any group
 * the person opens or closes stays that way. Collapsed to icons, every link is
 * shown with a hairline between groups and its name as a tooltip.
 */
export function SidebarNav({
  onNavigate,
  roles,
  collapsed = false,
}: {
  readonly onNavigate?: () => void;
  readonly roles: readonly string[];
  readonly collapsed?: boolean;
}) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const chosen = useAppSelector((state) => state.sidebar.groups);
  const groups = navGroups(roles);
  const t = useTranslations("shell.sidebar");
  const nav = useNavText();

  function renderLink(item: NavItem, nested: boolean) {
    const active = isNavigationActive(item, pathname);
    const Icon = item.icon;
    const label = nav.label(item.text);
    return (
      <Link
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        className={cn(
          /* One line for most; a long name — Create Historical Coverage — takes a second rather than being cut. */
          "group/link relative flex min-h-8 items-center gap-2.5 rounded-md py-1 text-sm transition-colors",
          collapsed ? "justify-center px-0" : nested ? "pr-2 pl-2" : "px-2",
          active
            ? "bg-teal-soft font-medium text-teal-deep"
            : "text-sidebar-text hover:bg-sand-deep hover:text-ink",
        )}
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? label : undefined}
      >
        <Icon
          aria-hidden
          className={cn("size-4 shrink-0", active ? "text-teal" : "text-muted group-hover/link:text-ink-soft")}
          strokeWidth={1.75}
        />
        {!collapsed ? <span className="line-clamp-2 min-w-0 flex-1 leading-tight">{label}</span> : null}
      </Link>
    );
  }

  return (
    <nav aria-label={t("navigation")} className={cn("flex flex-col pb-4", collapsed ? "gap-1 px-2" : "gap-0.5 px-2.5")}>
      {renderLink(dashboardItem, false)}

      {groups.map((group) => {
        /* Open or closed is remembered by the group, not by its title, which changes with the language. */
        const stateKey = group.desk ? `${group.key}-${group.desk}` : group.key;
        const id = `nav-${stateKey}`;
        const title = nav.group(group);
        const holdsCurrent = group.items.some((item) => isNavigationActive(item, pathname));
        const open = chosen[stateKey] ?? holdsCurrent;

        if (collapsed) {
          return (
            <section aria-label={title} className="mt-1 flex flex-col gap-1 border-t border-line pt-2" key={stateKey}>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>{renderLink(item, false)}</li>
                ))}
              </ul>
            </section>
          );
        }

        return (
          <section className="mt-3 first-of-type:mt-4" key={stateKey}>
            <button
              aria-controls={id}
              aria-expanded={open}
              className="group/head flex min-h-8 w-full items-center gap-1.5 rounded-md px-2 text-left text-sm font-medium text-muted transition-colors hover:bg-sand-deep hover:text-ink-soft"
              onClick={() => dispatch(setGroupOpen({ title: stateKey, open: !open }))}
              type="button"
            >
              <ChevronRight
                aria-hidden
                className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
              />
              <span className="min-w-0 flex-1 truncate">{title}</span>
              {!open && holdsCurrent ? (
                <span aria-hidden className="size-1.5 rounded-full bg-teal" title={t("currentInGroup")} />
              ) : !open ? (
                <span className="text-xs text-muted/80 tabular-nums opacity-0 transition-opacity group-hover/head:opacity-100">
                  {group.items.length}
                </span>
              ) : null}
            </button>
            {open ? (
              <ul className="mt-0.5 ml-3.5 flex flex-col gap-0.5 border-l border-line pl-1.5" id={id}>
                {group.items.map((item) => (
                  <li key={item.href}>{renderLink(item, true)}</li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}
