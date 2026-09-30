"use client";
import type { ReactNode } from "react";
import { useGetCurrentUserQuery } from "@/features/auth/api/auth-api";
import { hasPermission } from "@/features/auth/permissions";
export function PermissionGate({
  permission,
  children,
}: {
  readonly permission: string;
  readonly children: ReactNode;
}) {
  const { data } = useGetCurrentUserQuery();
  return data && hasPermission(data.roles, permission) ? children : null;
}
