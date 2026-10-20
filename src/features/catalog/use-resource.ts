"use client";

import { useMemo } from "react";
import { useMessages } from "next-intl";
import type { ResourceDefinition, ResourceKey } from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import { localizeWith } from "@/features/catalog/localize";

/** A registry definition in the reader's language, for a client component that looks one up itself. */
export function useResource(key: ResourceKey): ResourceDefinition {
  const messages = useMessages();
  return useMemo(() => localizeWith(getResource(key), messages), [key, messages]);
}

/** A definition handed in (perhaps narrowed) in the reader's language; harmless on one already translated. */
export function useLocalizedDefinition(definition: ResourceDefinition): ResourceDefinition {
  const messages = useMessages();
  return useMemo(() => localizeWith(definition, messages), [definition, messages]);
}
