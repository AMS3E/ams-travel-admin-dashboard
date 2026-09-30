import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { canCreateResource, canDeleteResource, canManageResource } from "@/features/auth/permissions";
import { CoverageLists } from "@/features/heritage/components/coverage-page";
import { CREATE_HERITAGE } from "@/features/heritage/heritage-tabs";
import { PageHeader } from "@/features/shell/components/page-header";

/**
 * All Historical Coverage: each tourism region's list as its website page
 * shows it, numbered top to bottom. The kings, eras, faiths and styles an
 * ancient site's tags offer are kept in Heritage Tags.
 */
export function AllHistoricalCoverage({ roles }: { readonly roles: readonly string[] }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <PageHeader
        actions={
          canCreateResource(roles, "region-coverage") ? (
            <Link className={buttonVariants()} href={CREATE_HERITAGE}>
              <Plus aria-hidden className="size-4" />
              Create historical coverage
            </Link>
          ) : null
        }
        description="What each tourism region's website page lists under Historical coverage — Ancient Capitals' royal capitals, and any other region's entries — numbered top to bottom, with the line above them. What you make here is what travellers see there."
        eyebrow="History & Heritage"
        title="All Historical Coverage"
      />
      <CoverageLists
        canCreate={canCreateResource(roles, "region-coverage")}
        canDelete={canDeleteResource(roles, "region-coverage")}
        canEdit={canManageResource(roles, "region-coverage")}
        canEditIntro={canManageResource(roles, "regions")}
      />
    </div>
  );
}
