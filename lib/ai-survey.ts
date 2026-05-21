import type { DeviceType } from "@/types/design";

export interface SurveyProposedWall {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rationale?: string;
}

export interface SurveyProposedDevice {
  type: DeviceType;
  subtype?: string;
  x: number;
  y: number;
  rotationDegrees: number;
  label: string;
  rangeMeters?: number;
  fovDegrees?: number;
  rationale: string;
}

export interface SurveyResponse {
  scalePxPerMeter: number;
  walls: SurveyProposedWall[];
  devices: SurveyProposedDevice[];
  summary: string;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Read a File (from a file input) into a base64 data URL and capture its
 * dimensions.
 *
 * Large images (>1500 px on the long edge) are downscaled before
 * returning. We do this for TWO reasons:
 *
 *  1. **Claude vision coordinate stability.** When the source image is
 *     significantly larger than ~1500 px, Claude tends to return
 *     wall/device coordinates compressed into a smaller logical range
 *     (e.g. 0–700) instead of the actual image-pixel range. The result
 *     is walls clustered in the top-left corner of the canvas while the
 *     planImage extends the full size. Normalizing the input fixes this
 *     reliably.
 *  2. **Token cost.** Bigger images cost more input tokens for no
 *     additional value — Claude has already understood the layout at
 *     1500 px.
 *
 * The downscaled image is what we save as `planImage` AND what we send
 * to Claude, so coordinates and rendering stay aligned.
 */
export async function loadImageMeta(file: File): Promise<{
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  width: number;
  height: number;
}> {
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  const mediaType = allowed.includes(file.type)
    ? (file.type as "image/png" | "image/jpeg" | "image/webp" | "image/gif")
    : "image/png";

  const rawBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not load image"));
    i.src = rawBase64;
  });

  const MAX_EDGE = 1500;
  const longest = Math.max(img.naturalWidth, img.naturalHeight);

  // Already small enough — return the raw image untouched.
  if (longest <= MAX_EDGE) {
    return {
      base64: rawBase64,
      mediaType,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  }

  const scale = MAX_EDGE / longest;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Canvas unavailable — fall back to the raw image and accept the
    // coordinate-compression risk rather than blowing up.
    return {
      base64: rawBase64,
      mediaType,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  // JPEG at 92% is visually indistinguishable from PNG for typical
  // architectural line art with labels, and is ~3-4× smaller. Switching
  // PNG → JPEG also drops alpha which is fine for floor plans.
  const downscaledBase64 = canvas.toDataURL("image/jpeg", 0.92);

  return {
    base64: downscaledBase64,
    mediaType: "image/jpeg",
    width: w,
    height: h,
  };
}

/**
 * POST to /api/ai/survey with the image and any user-provided context.
 */
export async function runAISurvey(args: {
  imageBase64: string;
  imageMediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  imageWidth: number;
  imageHeight: number;
  buildingType?: string;
  projectNotes?: string;
}): Promise<SurveyResponse> {
  const res = await fetch("/api/ai/survey", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string })?.error ??
        `Survey request failed (${res.status})`,
    );
  }
  return (await res.json()) as SurveyResponse;
}
