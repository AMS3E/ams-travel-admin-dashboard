import {
  BadgeCheck,
  BedDouble,
  FilePlus2,
  Globe,
  ImagePlus,
  Lock,
  MessageSquare,
  PencilLine,
  PenTool,
  Route,
  ScrollText,
  Store,
  Tags,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import type { Capability, CapabilityKey } from "@/features/profile/access";

const ICONS: Readonly<Record<CapabilityKey, LucideIcon>> = {
  create: FilePlus2,
  edit: PencilLine,
  publish: Globe,
  "approve-partners": Store,
  "approve-contributors": PenTool,
  "approve-staff": UserCheck,
  verify: BadgeCheck,
  listings: BedDouble,
  corridors: Route,
  taxonomy: Tags,
  reviews: MessageSquare,
  media: ImagePlus,
  people: Users,
  audit: ScrollText,
};

export function ProfileCapabilities({
  capabilities,
  permissions,
}: {
  readonly capabilities: readonly Capability[];
  readonly permissions: readonly string[];
}) {
  const t = useTranslations("profile.capabilities");
  const granted = capabilities.filter((capability) => capability.granted);
  const withheld = capabilities.filter((capability) => !capability.granted);

  return (
    <Surface aria-labelledby="capabilities-heading">
      <SurfaceHeader
        actions={<Badge>{t("count", { granted: granted.length, total: capabilities.length })}</Badge>}
        description={t("description")}
        id="capabilities-heading"
        title={t("title")}
      />

      <ul className="grid sm:grid-cols-2 [&>li]:border-b [&>li]:border-line sm:[&>li:nth-child(odd)]:border-r">
        {granted.map(({ key, text }) => {
          const Icon = ICONS[key];
          return (
            <li className="flex gap-2.5 px-4 py-2.5" key={key}>
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{t(`items.${text}.label`)}</p>
                <p className="text-xs text-muted">{t(`items.${text}.detail`)}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 px-4 py-3">
        {withheld.length ? (
          <details className="group">
            <summary className="cursor-pointer text-sm text-ink-soft select-none hover:text-ink">
              {t("withheld", { count: withheld.length })}
            </summary>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {withheld.map(({ key, text }) => (
                <li className="flex items-center gap-2 text-xs text-muted" key={key}>
                  <Lock aria-hidden className="size-3.5 shrink-0" />
                  {t(`items.${text}.label`)}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{t("needOne")}</p>
          </details>
        ) : null}

        <details>
          <summary className="cursor-pointer text-sm text-ink-soft select-none hover:text-ink">
            {t("technical", { count: permissions.length })}
          </summary>
          <p className="mt-2 text-xs text-muted">{t("technicalHint")}</p>
          <ul className="mt-2 flex flex-wrap gap-1">
            {permissions.map((permission) => (
              <li key={permission}>
                <code className="rounded-sm border border-line bg-sand px-1.5 py-0.5 font-mono text-2xs text-ink-soft">{permission}</code>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </Surface>
  );
}
