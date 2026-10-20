import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <div className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="panel max-w-sm p-6 text-center">
        <p className="text-xs font-medium text-muted">404</p>
        <h1 className="heading mt-2 text-xl font-semibold text-ink">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("text")}</p>
        <Link className={buttonVariants({ className: "mt-5" })} href="/">
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
