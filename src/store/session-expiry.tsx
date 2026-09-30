"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "./hooks";
import { selectSessionExpired } from "./slices/session-slice";

/**
 * Once a call has answered 401, sends the person to sign in again and back to
 * where they were. Mounted once, beside the store: no screen handles an ended
 * session on its own.
 */
export function SessionExpiry() {
  const expired = useAppSelector(selectSessionExpired);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!expired || pathname.startsWith("/login")) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [expired, pathname, router]);

  return null;
}
