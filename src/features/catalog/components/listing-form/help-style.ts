import { createContext } from "react";

/**
 * Where a field's help text goes: under its box, or behind an info icon beside
 * its label that opens on a click. The destination form uses the icon; the
 * others keep the text under the box until their screens are reviewed.
 */
export type HelpStyle = "below" | "icon";

export const HelpStyleContext = createContext<HelpStyle>("below");
