/**
 * The first line of a text that says anything, for a row's one-line summary;
 * null when there is none. Markdown's marks — a heading's #, a list's dash, a
 * bold word's stars — are taken off, so the line reads as prose.
 */
export function firstLine(text: string | null | undefined): string | null {
  const line = text
    ?.split(/\r?\n/)
    .map((each) => plain(each))
    .find(Boolean);
  return line ?? null;
}

/** One line of Markdown as prose: no heading, list or quote marks, no emphasis stars, a link's words only. */
export function plain(line: string): string {
  return line
    .replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)+/, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|\*|_|`|~~)(.+?)\1/g, "$2")
    .trim();
}
