import {
  CircleAlert,
  CircleCheck,
  ExternalLink,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { getMessages, getTranslations } from "next-intl/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { logoutAction } from "@/features/auth/actions";
import type { SignInDetails } from "@/features/auth/profile.server";
import { dateTimeOf } from "@/i18n/dates";

/** How the last password change ended, as the sign-in callback reports it. */
export type PasswordChange = "success" | "cancelled" | "error";

/** Keycloak's "Set a new password" page, then back to this profile. A plain link: it redirects to Keycloak. */
const CHANGE_PASSWORD_HREF = "/api/auth/login?action=password&next=%2Fprofile";

/**
 * The sign-in half of the account, which belongs to Keycloak: the password and
 * the signed-in devices live there, so this links to them.
 */
export async function ProfileSecurity({
  details,
  passwordChange,
}: {
  readonly details: SignInDetails;
  readonly passwordChange?: PasswordChange;
}) {
  const [t, messages] = await Promise.all([getTranslations("profile.security"), getMessages()]);
  const newTab = t("newTab");

  return (
    <Surface aria-labelledby="security-heading">
      <SurfaceHeader
        description={t("description")}
        id="security-heading"
        title={t("title")}
      />

      <div className="flex flex-col gap-2 border-b border-line px-4 py-3">
        {passwordChange ? <PasswordNotice change={passwordChange} text={t(`notices.${passwordChange}`)} /> : null}
        <a className={buttonVariants({ className: "w-full", size: "sm" })} href={CHANGE_PASSWORD_HREF}>
          <KeyRound aria-hidden className="size-3.5" />
          {t("changePassword")}
        </a>
        <p className="text-xs text-muted">{t("changePasswordNote")}</p>
      </div>

      <ul className="divide-y divide-line border-b border-line">
        <AccountLink
          description={t("methodsDescription")}
          href={`${details.accountUrl}/account-security/signing-in`}
          icon={ShieldCheck}
          label={t("methods")}
          newTab={newTab}
        />
        <AccountLink
          description={t("devicesDescription")}
          href={`${details.accountUrl}/account-security/device-activity`}
          icon={MonitorSmartphone}
          label={t("devices")}
          newTab={newTab}
        />
      </ul>

      <dl className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
        <div className="min-w-0">
          <dt className="text-muted">{t("username")}</dt>
          <dd className="mt-0.5 truncate font-medium text-ink">{details.username || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted">{t("signedIn")}</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {details.signedInAt ? (
              <time dateTime={details.signedInAt}>{dateTimeOf(details.signedInAt, messages.common.dates)}</time>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      <form action={logoutAction} className="border-t border-line px-4 py-3">
        <Button className="w-full text-heritage hover:bg-heritage-soft hover:text-heritage" size="sm" type="submit" variant="secondary">
          <LogOut aria-hidden className="size-3.5" />
          {t("signOut")}
        </Button>
      </form>
    </Surface>
  );
}

const NOTICES: Record<PasswordChange, { icon: LucideIcon; className: string }> = {
  success: {
    icon: CircleCheck,
    className: "border-success/20 bg-success-soft text-success-strong",
  },
  cancelled: {
    icon: CircleAlert,
    className: "border-line bg-sand text-ink-soft",
  },
  error: {
    icon: CircleAlert,
    className: "border-heritage/20 bg-heritage-soft text-heritage",
  },
};

function PasswordNotice({ change, text }: { readonly change: PasswordChange; readonly text: string }) {
  const { icon: Icon, className } = NOTICES[change];
  return (
    <p className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${className}`} role="status">
      <Icon aria-hidden className="mt-px size-3.5 shrink-0" />
      {text}
    </p>
  );
}

function AccountLink({
  href,
  icon: Icon,
  label,
  description,
  newTab,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly description: string;
  /** "(opens in a new tab)", for screen readers. */
  readonly newTab: string;
}) {
  return (
    <li>
      <a className="group flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-sand" href={href} rel="noreferrer" target="_blank">
        <Icon aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{label}</span>
          <span className="block text-xs text-muted">{description}</span>
        </span>
        <ExternalLink aria-hidden className="size-3.5 shrink-0 text-muted group-hover:text-ink" />
        <span className="sr-only">{newTab}</span>
      </a>
    </li>
  );
}
