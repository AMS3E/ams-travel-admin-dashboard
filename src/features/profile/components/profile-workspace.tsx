import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { BUSINESS_ROLES } from "@/features/auth/permissions";
import type { Workspace } from "@/features/profile/access";

/** Where this account works: its role, its home screen, and the desks on either side of it. */
export function ProfileWorkspace({
  workspace,
  grants,
  homeTitle,
  blurb,
}: {
  readonly workspace: Workspace;
  readonly grants: readonly string[];
  readonly homeTitle: string;
  readonly blurb: string | null;
}) {
  const t = useTranslations("profile");
  const account = useTranslations("shell.account");
  const { role, fullControl, reviewDesks, submitDesk } = workspace;
  const held = BUSINESS_ROLES.filter((each) => grants.includes(each)).map((each) => account(`roles.${each}`));

  return (
    <Surface aria-labelledby="workspace-heading">
      <SurfaceHeader
        actions={<Badge tone="info">{role ? account(`roles.${role}`) : account("teamMember")}</Badge>}
        description={blurb ?? undefined}
        id="workspace-heading"
        title={t("workspace.title")}
      />
      <dl className="divide-y divide-line">
        <Row term={t("workspace.homeScreen")}>{homeTitle}</Row>
        <Row term={t("workspace.youReview")}>
          {reviewDesks.length ? (
            <span className="flex flex-wrap justify-end gap-1">
              {reviewDesks.map((desk) => (
                <Badge key={desk}>{t(`desks.${desk}`)}</Badge>
              ))}
            </span>
          ) : (
            <span className="text-muted">{t("workspace.noDesk")}</span>
          )}
        </Row>
        {submitDesk ? (
          <Row term={t("workspace.submissions")}>
            {t("workspace.reviewedBy", { reviewer: t(`reviewers.${submitDesk}`) })}
          </Row>
        ) : null}
        <Row term={t("workspace.access")}>{fullControl ? t("workspace.fullControl") : held.join(", ") || "—"}</Row>
      </dl>
    </Surface>
  );
}

function Row({ term, children }: { readonly term: string; readonly children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-sm text-muted">{term}</dt>
      <dd className="min-w-0 text-right text-sm text-ink">{children}</dd>
    </div>
  );
}
