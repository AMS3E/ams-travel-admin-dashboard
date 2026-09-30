import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentProfile, getSignInDetails } from "@/features/auth/profile.server";
import { requireAdmin } from "@/features/auth/session";
import { dashboardTitle, ROLE_PROFILES } from "@/features/dashboard/roles";
import { capabilitiesOf, ROLE_LABELS, workspaceOf } from "@/features/profile/access";
import { ProfileCapabilities } from "@/features/profile/components/profile-capabilities";
import {
  ContributionsSkeleton,
  ProfileContributions,
} from "@/features/profile/components/profile-contributions";
import { ProfileEditor } from "@/features/profile/components/profile-editor";
import { ProfileSecurity, type PasswordChange } from "@/features/profile/components/profile-security";
import { ProfileWorkspace } from "@/features/profile/components/profile-workspace";

export const metadata: Metadata = { title: "My profile" };

const PASSWORD_CHANGES: readonly string[] = ["success", "cancelled", "error"] satisfies PasswordChange[];

export default async function ProfilePage(props: PageProps<"/profile">) {
  const admin = await requireAdmin("/profile");
  /* Set by the sign-in callback after "Change password" (Keycloak's kc_action_status). */
  const { password } = await props.searchParams;
  const passwordChange =
    typeof password === "string" && PASSWORD_CHANGES.includes(password) ? (password as PasswordChange) : undefined;
  const [user, signIn] = await Promise.all([getCurrentProfile(), getSignInDetails()]);
  const grants = admin.roles;
  const workspace = workspaceOf(grants);
  const role = workspace.role;

  return (
    <ProfileEditor
      aside={
        <>
          <ProfileWorkspace
            blurb={role ? ROLE_PROFILES[role].blurb : null}
            grants={grants}
            homeTitle={dashboardTitle(grants)}
            workspace={workspace}
          />
          <ProfileSecurity details={signIn} passwordChange={passwordChange} />
        </>
      }
      emailVerified={signIn.emailVerified}
      roleLabel={role ? ROLE_LABELS[role] : "Team member"}
      user={user}
      username={signIn.username}
    >
      <Suspense fallback={<ContributionsSkeleton />}>
        <ProfileContributions grants={grants} submitsTo={workspace.submitsTo} userId={user.id} />
      </Suspense>
      <ProfileCapabilities capabilities={capabilitiesOf(grants)} permissions={workspace.permissions} />
    </ProfileEditor>
  );
}
