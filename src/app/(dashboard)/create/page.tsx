import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BedDouble, MapPin, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/features/auth/session";
import { createKinds, type CreateKindKey } from "@/features/catalog/create-kinds";
import { KindChooser } from "@/features/shell/components/kind-chooser";
import { PageHeader } from "@/features/shell/components/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("forms.create");
  return { title: t("metaTitle") };
}

const ICONS: Readonly<Record<CreateKindKey, LucideIcon>> = {
  destinations: MapPin,
  stays: BedDouble,
  foods: UtensilsCrossed,
};

/**
 * "What are you adding?" — only the main type: an attraction, food or a stay.
 * The form that opens is written for that type and asks the rest.
 */
export default async function CreatePage() {
  const admin = await requireAdmin();
  const t = await getTranslations("forms.create");
  const kinds = createKinds(admin.roles, (key) => ({ title: t(`kinds.${key}.title`), description: t(`kinds.${key}.description`) }));
  if (!kinds.length) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <PageHeader description={t("description")} eyebrow={t("eyebrow")} title={t("title")} />
      <KindChooser kinds={kinds.map((kind) => ({ ...kind, icon: ICONS[kind.key] }))} />
    </div>
  );
}
