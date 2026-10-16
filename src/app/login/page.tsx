import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldAlert, ShieldX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { safeReturnPath } from "@/features/auth/oidc";
import { getCurrentAdmin } from "@/features/auth/session";
import { LOGO } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

/* The failures this page explains; their words are in auth.json. */
const ERRORS = ["oauth", "forbidden"] as const;
type Failure = (typeof ERRORS)[number];
const isFailure = (value: unknown): value is Failure => typeof value === "string" && (ERRORS as readonly string[]).includes(value);

/** Sign-in happens on Keycloak's form; this page only hands over, or explains a failed attempt. */
export default async function LoginPage(props: PageProps<"/login">) {
  const { error, next } = await props.searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);
  const t = await getTranslations("auth");
  const failure = isFailure(error) ? { title: t(`errors.${error}.title`), detail: t(`errors.${error}.detail`) } : undefined;
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
          <h1 className="heading text-xl font-semibold text-ink">{t("heading")}</h1>
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
          {t("signInAgain")}
        </a>
      </div>
    </div>
  );
}
