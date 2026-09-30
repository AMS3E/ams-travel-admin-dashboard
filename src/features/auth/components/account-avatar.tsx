"use client";

import { useState } from "react";
import Image from "next/image";
import { initials } from "@/features/auth/types";
import { cn } from "@/lib/utils";

export function AccountAvatar({
  name,
  src,
  size = 36,
  className,
}: {
  readonly name: string;
  readonly src?: string | null;
  /** Diameter in pixels. */
  readonly size?: number;
  readonly className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  /* A full address, or an uploaded photo's origin-relative /api/v1/media/files/… link. */
  const validUrl = src && /^(https?:\/\/|\/(?!\/))/i.test(src);

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-sand-deep font-semibold text-ink-soft",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
    >
      {validUrl && src !== failedUrl ? (
        <Image
          alt=""
          className="object-cover"
          height={size}
          onError={() => setFailedUrl(src)}
          src={src}
          style={{ width: size, height: size }}
          unoptimized
          width={size}
        />
      ) : initials(name)}
    </span>
  );
}
