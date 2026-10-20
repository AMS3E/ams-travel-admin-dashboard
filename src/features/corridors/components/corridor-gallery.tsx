"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { useSaveRecordMutation } from "@/features/catalog/api/catalog-api";
import { GalleryManager, type CoverPhoto, type PendingPhoto } from "@/features/catalog/components/listing-form/gallery-manager";
import { toFormValues } from "@/features/catalog/resource";
import { useResource } from "@/features/catalog/use-resource";
import type { CorridorSummary } from "@/features/corridors/api/contracts";
import { useApiErrorMessage } from "@/store/api/api-error";

interface CorridorGalleryProps {
  readonly corridor: CorridorSummary;
  /** What the signed-in curator may do to the photos; both false shows them read-only. */
  readonly canAdd: boolean;
  readonly canDelete: boolean;
}

/**
 * The corridor's photographs, on its page: the gallery the app pages through,
 * one of them its cover. The same box as a destination's, filling the
 * `corridor-media` gallery. The corridor exists already, so every photo is a
 * row the moment it is uploaded, and making one the cover is saved at once:
 * the API sets the corridor's cover from the row marked as it.
 *
 * A cover chosen on the form before the gallery existed is shown first and
 * joins the gallery when another takes its place. The one case the gallery
 * cannot settle through a row — the last photo deleted, or the cover passing
 * back to that older picture — is written onto the corridor itself here.
 */
export function CorridorGallery({ corridor, canAdd, canDelete }: CorridorGalleryProps) {
  const router = useRouter();
  const t = useTranslations("corridors.gallery");
  const apiErrorMessage = useApiErrorMessage();
  const definition = useResource("corridors");
  const [saveRecord] = useSaveRecordMutation();
  const [cover, setCover] = useState<CoverPhoto | null>(
    corridor.coverKey ? { key: corridor.coverKey, url: corridor.coverUrl ?? "" } : null,
  );
  /* Never used: the corridor exists, so nothing waits for a save. The box asks for it all the same. */
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  async function onCover(photo: CoverPhoto | null, saved: boolean) {
    setCover(photo);
    setProblem(null);
    if (!saved) {
      const values = toFormValues(definition, { ...corridor });
      values.coverKey = photo?.key ?? "";
      values.coverUrl = photo?.url ?? "";
      try {
        const result = await saveRecord({ resource: "corridors", id: corridor.id, values }).unwrap();
        if (!result.ok) setProblem(result.message);
      } catch (error) {
        setProblem(apiErrorMessage(error));
      }
    }
    /* The page around the box is rendered on the server, and its list row leads with the cover. */
    router.refresh();
  }

  return (
    <Surface aria-labelledby="corridor-photos-title" id="corridor-photos">
      <SurfaceHeader
        description={t("description")}
        id="corridor-photos-title"
        title={t("title")}
      />
      <div className="flex flex-col gap-2 p-4">
        <GalleryManager
          canAdd={canAdd}
          canDelete={canDelete}
          coverKey={cover?.key ?? ""}
          coverUrl={cover?.url ?? ""}
          listing="corridors"
          listingId={corridor.id}
          onCover={(photo, saved) => void onCover(photo, saved)}
          onPendingChange={setPending}
          pending={pending}
        />
        {problem ? (
          <p className="text-xs text-heritage" role="alert">
            {t("coverFailed", { problem })}
          </p>
        ) : null}
      </div>
    </Surface>
  );
}
