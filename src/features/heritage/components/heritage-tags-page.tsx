import Link from "next/link";
import { Crown, Flower2, Hourglass, Landmark, Plus, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { canCreateResource, canDeleteResource, canManageResource, canSetStatus } from "@/features/auth/permissions";
import { getRecords } from "@/features/catalog/api/catalog.server";
import { ResourceTable } from "@/features/catalog/components/resource-table";
import { getResource } from "@/features/catalog/resources";
import { HERITAGE_TABS, HERITAGE_TAGS, type HeritageTab, type HeritageTagKey } from "@/features/heritage/heritage-tabs";
import { PageHeader } from "@/features/shell/components/page-header";
import { cn } from "@/lib/utils";

/** One icon per kind, as the sidebar draws their rows. */
const ICONS: Readonly<Record<HeritageTagKey, LucideIcon>> = {
  "architecture-styles": Landmark,
  "historical-periods": Hourglass,
  monarchs: Crown,
  religions: Flower2,
};

/** The tabs this account may open. */
export function heritageTagTabs(roles: readonly string[]): readonly HeritageTab[] {
  return HERITAGE_TABS.filter((each) => canManageResource(roles, each.key));
}

/**
 * Heritage Tags: the values an Ancient Capitals site's tags offer — its
 * architecture style, historical period, king and religion — a tab each, A to Z,
 * with the count of each on its tab.
 */
export async function HeritageTags({ roles, tab }: { readonly roles: readonly string[]; readonly tab: unknown }) {
  const tabs = heritageTagTabs(roles);
  const chosen = tabs.find((each) => each.tab === tab) ?? tabs[0];
  const counts = await Promise.allSettled(tabs.map((each) => getRecords(each.key)));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <PageHeader
        actions={
          canCreateResource(roles, chosen.key) ? (
            <Link className={buttonVariants()} href={`/${chosen.key}/new`}>
              <Plus aria-hidden className="size-4" />
              New {chosen.one}
            </Link>
          ) : null
        }
        description={chosen.description}
        eyebrow="History & Heritage"
        title="Heritage Tags"
      />

      <nav aria-label="Kinds of heritage tag" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
        {tabs.map((each, index) => {
          const on = each.key === chosen.key;
          const Icon = ICONS[each.key];
          const count = counts[index];
          return (
            <Link
              aria-current={on ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                on ? "border-ink text-ink" : "border-transparent text-muted hover:border-line-strong hover:text-ink",
              )}
              href={`${HERITAGE_TAGS}?type=${each.tab}`}
              key={each.key}
            >
              <Icon aria-hidden className="size-4" strokeWidth={1.75} />
              {each.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", on ? "bg-sand-deep text-ink-soft" : "bg-sand text-muted")}>
                {count?.status === "fulfilled" ? count.value.length : "–"}
              </span>
            </Link>
          );
        })}
      </nav>

      <ResourceTable
        canDelete={canDeleteResource(roles, chosen.key)}
        canSetStatus={canSetStatus(roles, chosen.key)}
        definition={getResource(chosen.key)}
        grants={roles}
        key={chosen.key}
        referenceOptions={{}}
        userId={null}
      />
    </div>
  );
}
