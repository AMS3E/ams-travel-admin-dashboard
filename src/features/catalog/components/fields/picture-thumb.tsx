import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A row's picture at icon size; an empty frame until one is uploaded. */
export function PictureThumb({
  src,
  className,
  iconClassName = "size-3",
}: {
  readonly src?: string;
  readonly className?: string;
  readonly iconClassName?: string;
}) {
  return (
    <span aria-hidden className={cn("relative block shrink-0 overflow-hidden rounded-sm border border-line bg-sand-deep", className)}>
      {src ? (
        <Image alt="" className="object-cover" fill sizes="40px" src={src} unoptimized />
      ) : (
        <ImageIcon className={cn("absolute inset-0 m-auto text-muted", iconClassName)} strokeWidth={1.75} />
      )}
    </span>
  );
}
