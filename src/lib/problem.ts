/**
 * The API answers errors as RFC 9457 problem documents, so the sentence worth
 * showing is `detail` inside the JSON rather than the whole body. Anything that
 * is not a problem document is passed through as the text it is.
 */
export function problemMessage(text: string | null | undefined): string {
  const raw = (text ?? "").trim();
  if (!raw.startsWith("{")) return raw;
  try {
    const problem = JSON.parse(raw) as { detail?: unknown; title?: unknown };
    if (typeof problem.detail === "string" && problem.detail.trim()) return problem.detail.trim();
    if (typeof problem.title === "string" && problem.title.trim()) return problem.title.trim();
  } catch {
    /* Not JSON after all; show it as it came. */
  }
  return raw;
}

/** The Khmer fields a refused publish names (`missingKhmer`): what is still to be written in Khmer. */
export function problemMissingKhmer(text: string | null | undefined): readonly string[] {
  const raw = (text ?? "").trim();
  if (!raw.startsWith("{")) return [];
  try {
    const problem = JSON.parse(raw) as { missingKhmer?: unknown };
    return Array.isArray(problem.missingKhmer) ? problem.missingKhmer.filter((name): name is string => typeof name === "string") : [];
  } catch {
    return [];
  }
}

/**
 * The fields a refused request names, by the form field they belong to: the
 * API lists them under `errors` as `{ field, label, message }`. A nested field
 * (`days[0].title`) is filed under its top-level name. A message that is not a
 * sentence of its own ("is required") is read with its label in front.
 */
export function problemFieldErrors(text: string | null | undefined): Record<string, string> {
  const raw = (text ?? "").trim();
  if (!raw.startsWith("{")) return {};
  try {
    const problem = JSON.parse(raw) as { errors?: unknown };
    if (!Array.isArray(problem.errors)) return {};
    const fields: Record<string, string> = {};
    for (const entry of problem.errors as { field?: unknown; label?: unknown; message?: unknown }[]) {
      if (typeof entry?.field !== "string" || typeof entry.message !== "string") continue;
      const name = entry.field.split(/[.[]/)[0];
      if (!name || fields[name]) continue;
      const own = /^[A-Z]/.test(entry.message);
      fields[name] = own || typeof entry.label !== "string" ? entry.message : `${entry.label} ${entry.message}`;
    }
    return fields;
  } catch {
    return {};
  }
}
