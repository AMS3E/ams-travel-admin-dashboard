/**
 * Getting many photographs into MinIO at once.
 *
 * A person may pick as many as they like, straight off a camera. Each is
 * shrunk in the browser first — a 6000-pixel, 12 MB original becomes a sharp
 * 2560-pixel JPEG of a megabyte or two — and they travel in batches the API
 * accepts: at most ten files, and well under its 50 MB request limit.
 */

export const IMAGE_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

/** What the dashboard's upload routes take per file, once shrunk. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** What may be picked: anything larger is unlikely to be a photograph worth decoding. */
export const MAX_PICKED_BYTES = 40 * 1024 * 1024;

/** One request to the API: at most ten files, and a margin under its 50 MB limit. */
const BATCH_FILES = 10;
const BATCH_BYTES = 36 * 1024 * 1024;

/** The longest side kept: full-screen sharp on the website, a fraction of a camera original. */
const EDGE = 2560;
/** Already this small, and no larger than the edge: sent untouched. */
const KEEP_AS_IS_BYTES = 2 * 1024 * 1024;
const QUALITY = 0.88;

/** Why a picked file cannot be used: not a photo type, or too large to decode. */
export type ImageProblem = "type" | "size";

/** Why a picked file cannot be used, or null when it can; `forms.upload.problems` says it in words. */
export function imageProblem(file: File): ImageProblem | null {
  if (!IMAGE_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_PICKED_BYTES) return "size";
  return null;
}

/** A decode that has not finished by now is given up on, and the original is sent. */
const DECODE_TIMEOUT_MS = 15_000;

function decode(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const image = document.createElement("img");
  image.src = url;
  /* An <img> applies the camera's orientation, so a portrait photo stays upright. */
  const decoded = image.decode().then(() => image);
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Timed out decoding the image")), DECODE_TIMEOUT_MS);
  });
  return Promise.race([decoded, timeout]).finally(() => URL.revokeObjectURL(url));
}

/**
 * The photo scaled so its longest side is at most 2560 pixels, as a JPEG.
 * Returns the original when it is already small, when shrinking would not
 * make it smaller, or when the browser cannot decode it.
 */
export async function prepareImage(file: File): Promise<File> {
  try {
    const image = await decode(file);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) return file;

    const scale = Math.min(1, EDGE / Math.max(width, height));
    if (scale === 1 && file.size <= KEEP_AS_IS_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    /* JPEG has no transparency: a see-through PNG gets a white ground, not black. */
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^./]*$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** Files grouped into requests the API accepts, in the order they were picked. */
export function batchesOf(files: readonly File[]): File[][] {
  const batches: File[][] = [];
  let current: File[] = [];
  let bytes = 0;
  for (const file of files) {
    if (current.length && (current.length === BATCH_FILES || bytes + file.size > BATCH_BYTES)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(file);
    bytes += file.size;
  }
  if (current.length) batches.push(current);
  return batches;
}
