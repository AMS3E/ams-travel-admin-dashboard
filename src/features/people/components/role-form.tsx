"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BUSINESS_ROLES, type BusinessRole } from "@/features/auth/permissions";
import { ROLE_PROFILES } from "@/features/dashboard/roles";
import { useSetRolesMutation } from "@/features/people/api/people-api";
import { settled } from "@/store/api/api-error";

interface RoleFormProps {
  readonly personId: string;
  readonly roles: readonly BusinessRole[];
  /** True when the signed-in administrator is editing their own account. */
  readonly self: boolean;
}

export function RoleForm({ personId, roles, self }: RoleFormProps) {
  const [setRoles] = useSetRolesMutation();
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [selected, setSelected] = useState<readonly BusinessRole[]>(roles);
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(
    null,
  );

  const changed =
    selected.length !== roles.length ||
    selected.some((role) => !roles.includes(role));

  function toggle(role: BusinessRole, checked: boolean) {
    setBanner(null);
    setSelected((current) =>
      checked
        ? [...current, role]
        : current.filter((existing) => existing !== role),
    );
  }

  function save() {
    startSaving(async () => {
      const result = await settled(setRoles({ id: personId, roles: selected }).unwrap());
      if (result.ok) {
        setBanner({ tone: "ok", text: "Roles saved." });
        // The account page around this form is rendered on the server.
        router.refresh();
      } else {
        setBanner({ tone: "bad", text: result.message });
        setSelected(roles);
      }
    });
  }

  return (
    <div className="panel flex flex-col gap-4 p-4">
      {banner ? (
        <div
          className={
            banner.tone === "ok"
              ? "flex gap-2.5 rounded-md border border-success/20 bg-success-soft px-3 py-2.5 text-success"
              : "flex gap-2.5 rounded-md border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-heritage"
          }
          role="status"
        >
          {banner.tone === "ok" ? (
            <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
          ) : (
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          )}
          <p className="text-sm">{banner.text}</p>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {BUSINESS_ROLES.map((role) => {
          const checked = selected.includes(role);
          /* Removing your own ADMIN would lock this screen behind itself. */
          const locked = self && role === "ADMIN" && roles.includes("ADMIN");

          return (
            <li key={role}>
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={checked}
                  className="mt-1"
                  disabled={locked || saving}
                  onChange={(event) => toggle(role, event.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    {role}
                  </span>
                  <span className="block text-xs text-muted">
                    {ROLE_PROFILES[role].blurb}
                    {locked ? " · Your own administrator role cannot be removed here." : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end gap-2">
        <Button
          disabled={!changed || saving}
          onClick={() => {
            setSelected(roles);
            setBanner(null);
          }}
          type="button"
          variant="ghost"
        >
          Reset
        </Button>
        <Button disabled={!changed || saving} onClick={save} type="button">
          {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          Save roles
        </Button>
      </div>
    </div>
  );
}
