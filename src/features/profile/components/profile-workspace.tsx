import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { BUSINESS_ROLES } from "@/features/auth/permissions";
import { ROLE_LABELS, type Workspace } from "@/features/profile/access";

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
  const { role, fullControl, reviews, submitsTo } = workspace;
  const held = BUSINESS_ROLES.filter((each) => grants.includes(each)).map((each) => ROLE_LABELS[each]);

  return (
    <Surface aria-labelledby="workspace-heading">
      <SurfaceHeader
        actions={<Badge tone="info">{role ? ROLE_LABELS[role] : "Team member"}</Badge>}
        description={blurb ?? undefined}
        id="workspace-heading"
        title="Your role"
      />
      <dl className="divide-y divide-line">
        <Row term="Home screen">{homeTitle}</Row>
        <Row term="You review">
          {reviews.length ? (
            <span className="flex flex-wrap justify-end gap-1">
              {reviews.map((desk) => (
                <Badge key={desk}>{desk}</Badge>
              ))}
            </span>
          ) : (
            <span className="text-muted">No review desk</span>
          )}
        </Row>
        {submitsTo ? <Row term="Your submissions">Reviewed by {submitsTo}</Row> : null}
        <Row term="Access">{fullControl ? "Every workspace, with full control" : held.join(", ") || "—"}</Row>
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
