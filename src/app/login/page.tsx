import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert, ShieldX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { safeReturnPath } from "@/features/auth/oidc";
import { getCurrentAdmin } from "@/features/auth/session";
import { LOGO } from "@/lib/brand";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Readonly<Record<string, { title: string; detail: string }>> = {
  oauth: {
    title: "Sign-in did not complete",
    detail: "The answer from the sign-in page could not be verified. Start again.",
  },
  forbidden: {
    title: "That account has no back-office role",
    detail:
      "You signed in, but the account holds none of PARTNER, CONTRIBUTOR, EDITOR, BDO or ADMIN. Ask an administrator to assign one, then sign in again.",
  },
};

/** Sign-in happens on Keycloak's form; this page only hands over, or explains a failed attempt. */
export default async function LoginPage(props: PageProps<"/login">) {
  const { error, next } = await props.searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);
  const failure = typeof error === "string" ? ERRORS[error] : undefined;
  const signIn = `/api/auth/login?next=${encodeURIComponent(returnPath)}`;

  if (!failure) {
    if (await getCurrentAdmin()) redirect(returnPath);
    redirect(signIn);
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="panel w-full max-w-sm p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image alt="" className="size-10 rounded-full object-cover ring-1 ring-line" height={40} priority src={LOGO} width={40} />
          <h1 className="heading text-xl font-semibold text-ink">AMS Travel Admin</h1>
        </div>
        <div className="mt-6 flex gap-2.5 rounded-md border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-heritage" role="alert">
          {error === "forbidden" ? (
            <ShieldX aria-hidden className="mt-0.5 size-4 shrink-0" />
          ) : (
            <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="text-sm">
            <p className="font-semibold">{failure.title}</p>
            <p className="mt-1 text-xs leading-relaxed">{failure.detail}</p>
          </div>
        </div>
        <a className={buttonVariants({ className: "mt-5 w-full" })} href={signIn}>
          Sign in again
        </a>
      </div>
    </div>
  );
}
