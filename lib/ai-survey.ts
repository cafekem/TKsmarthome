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
 * native pixel dimensions.
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

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const dims = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = base64;
    },
  );

  return { base64, mediaType, width: dims.width, height: dims.height };
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
