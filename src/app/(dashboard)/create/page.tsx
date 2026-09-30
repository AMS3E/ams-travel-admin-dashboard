import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BedDouble, MapPin, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { requireAdmin } from "@/features/auth/session";
import { createKinds, type CreateKindKey } from "@/features/catalog/create-kinds";
import { KindChooser } from "@/features/shell/components/kind-chooser";
import { PageHeader } from "@/features/shell/components/page-header";

export const metadata: Metadata = { title: "Create destination" };

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
  const kinds = createKinds(admin.roles);
  if (!kinds.length) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <PageHeader
        description="Choose the main type. The form that follows is written for it and asks only what it needs."
        eyebrow="Content Management"
        title="What are you adding?"
      />
      <KindChooser kinds={kinds.map((kind) => ({ ...kind, icon: ICONS[kind.key] }))} />
    </div>
  );
}
