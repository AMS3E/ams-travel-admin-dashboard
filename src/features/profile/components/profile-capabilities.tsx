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

export function ProfileCapabilities({ capabilities }: { readonly capabilities: readonly Capability[] }) {
  const granted = capabilities.filter((capability) => capability.granted);
  const withheld = capabilities.filter((capability) => !capability.granted);

  return (
    <Surface aria-labelledby="capabilities-heading">
      <SurfaceHeader
        actions={<Badge>{granted.length} of {capabilities.length}</Badge>}
        description="Decided by your role. The screens offer exactly these."
        id="capabilities-heading"
        title="What you can do"
      />

      <ul className="grid sm:grid-cols-2 [&>li]:border-b [&>li]:border-line sm:[&>li:nth-child(odd)]:border-r">
        {granted.map(({ key, label, detail }) => {
          const Icon = ICONS[key];
          return (
            <li className="flex gap-2.5 px-4 py-2.5" key={key}>
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{label}</p>
                <p className="text-xs text-muted">{detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {withheld.length ? (
        <div className="px-4 py-3">
          <details className="group">
            <summary className="cursor-pointer text-sm text-ink-soft select-none hover:text-ink">
              Not part of your role ({withheld.length})
            </summary>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {withheld.map(({ key, label }) => (
                <li className="flex items-center gap-2 text-xs text-muted" key={key}>
                  <Lock aria-hidden className="size-3.5 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Need one of these? An administrator can change your role.</p>
          </details>
        </div>
      ) : null}
    </Surface>
  );
}
