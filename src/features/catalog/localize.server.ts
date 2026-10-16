import "server-only";
import { getMessages } from "next-intl/server";
import type { ResourceDefinition, ResourceKey } from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import { localizeWith } from "@/features/catalog/localize";

/** A registry definition in the reader's language, for a server component to hand to a form or table. */
export async function localizedResource(key: ResourceKey): Promise<ResourceDefinition> {
  return localizeWith(getResource(key), await getMessages());
}

/** The same for a definition already narrowed on the server (`withoutField` and the like). */
export async function localizeDefinition(definition: ResourceDefinition): Promise<ResourceDefinition> {
  return localizeWith(definition, await getMessages());
}
