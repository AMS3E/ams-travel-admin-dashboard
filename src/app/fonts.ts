import { JetBrains_Mono, Kantumruy_Pro, Poppins } from "next/font/google";

/**
 * Self-hosted by `next/font` at build time — no runtime request to Google.
 *
 * Same split as the public site: Poppins carries Latin, Kantumruy Pro carries
 * Khmer, and because Poppins has no Khmer coverage the browser falls through
 * per glyph. Editors type both scripts into the same field, so a mixed string
 * has to set correctly without any language-aware class switching.
 *
 * Poppins is not a variable font, so every weight the UI asks for has to be
 * listed here: 400 body, 500 labels, 600 headings and most emphasis, 700 the
 * few places that need more. A weight left out of this list does not fail — it
 * gets synthesised by the browser, which is worse, because it looks nearly
 * right on the machine that has the real face installed and wrong everywhere
 * else.
 *
 * The mono face is here for IDs, slugs, and coordinates in table cells.
 */
export const sansFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-latin",
});

export const khmerFont = Kantumruy_Pro({
  subsets: ["khmer", "latin"],
  display: "swap",
  variable: "--font-khmer",
});

export const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-latin",
});

export const fontVariables = [
  sansFont.variable,
  khmerFont.variable,
  monoFont.variable,
].join(" ");
