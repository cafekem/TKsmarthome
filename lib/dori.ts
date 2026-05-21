/**
 * DORI calculations per IEC 62676-4 / EN 50132-7.
 *
 * The standard defines four task classes by horizontal pixel density on the
 * subject (a "1.6 m tall person standing"). At a given distance from a
 * camera, you can compute the horizontal pixels-per-meter and bucket the
 * result. This module provides:
 *
 *  • thresholdsPxPerM:  the boundary pixel-densities (px/m) per task
 *  • pixelsPerMeter:     density at a distance for a given resolution + FOV
 *  • doriDistances:      max distance each task class is satisfied for a camera
 *  • classifyAtDistance: which task class is achieved at a given distance
 *
 * Numbers come from the official standard (rounded slightly for usability).
 */

export type DoriTask = "detect" | "observe" | "recognize" | "identify";

/**
 * IEC 62676-4 horizontal pixel densities (px/m) required for each task.
 * (Detect=25, Observe=63, Recognize=125, Identify=250.)
 */
export const DORI_THRESHOLDS_PX_PER_M: Record<DoriTask, number> = {
  detect: 25,
  observe: 63,
  recognize: 125,
  identify: 250,
};

export const DORI_LABELS: Record<DoriTask, string> = {
  detect: "Detect",
  observe: "Observe",
  recognize: "Recognize",
  identify: "Identify",
};

export const DORI_DESCRIPTIONS: Record<DoriTask, string> = {
  detect: "Person is reliably visible against background motion.",
  observe: "Subject's actions and clothing are discernible.",
  recognize: "Operator can tell a known person from a stranger.",
  identify:
    "Image quality sufficient to identify an unknown person beyond reasonable doubt (court-admissible).",
};

/**
 * Parse a resolution string like "4K", "1080p", "5MP", "1920x1080" into the
 * horizontal pixel count we use for density math. Returns null on garbage.
 */
export function horizontalPixelsFromResolution(
  resolution: string | undefined,
): number | null {
  if (!resolution) return null;
  const r = resolution.trim().toLowerCase();

  // Explicit WxH first ("1920x1080" / "1920×1080")
  const dim = r.match(/(\d{3,5})\s*[x×]\s*(\d{3,5})/);
  if (dim) return Number(dim[1]);

  // Common shorthands
  const aliases: Record<string, number> = {
    "720p": 1280,
    "1080p": 1920,
    "2k": 2560,
    "qhd": 2560,
    "1440p": 2560,
    "4k": 3840,
    uhd: 3840,
    "2160p": 3840,
    "5mp": 2592, // typical 2592x1944 sensor
    "6mp": 3072, // 3072x2048
    "8mp": 3840, // 4K
    "12mp": 4000, // 4000x3000
  };
  if (aliases[r]) return aliases[r];

  // "5 mp" / "5 megapixel"
  const mp = r.match(/(\d+)\s*(?:mp|megapixel)/);
  if (mp) {
    const m = Number(mp[1]);
    // Approx horizontal pixels from MP assuming 4:3 aspect:
    // h = sqrt(MP * 4/3 * 1e6)
    return Math.round(Math.sqrt((m * 4 * 1_000_000) / 3));
  }

  return null;
}

/**
 * Horizontal pixel density (px/m) on a subject at `distanceM` meters,
 * given the camera's horizontal FOV and horizontal pixel count.
 *
 * The horizontal width visible at distance d is: 2 * d * tan(FOV/2).
 * Density = horizontalPixels / horizontalWidth.
 */
export function pixelsPerMeter(args: {
  horizontalPixels: number;
  fovDegrees: number;
  distanceM: number;
}): number {
  const { horizontalPixels, fovDegrees, distanceM } = args;
  if (distanceM <= 0 || fovDegrees <= 0) return 0;
  const half = (fovDegrees / 2) * (Math.PI / 180);
  const widthM = 2 * distanceM * Math.tan(half);
  if (widthM <= 0) return 0;
  return horizontalPixels / widthM;
}

/**
 * Classify the task achievable at a given distance, given camera specs.
 * Returns null if the camera doesn't even hit Detect.
 */
export function classifyAtDistance(args: {
  horizontalPixels: number;
  fovDegrees: number;
  distanceM: number;
}): { task: DoriTask | null; pxPerM: number } {
  const px = pixelsPerMeter(args);
  let task: DoriTask | null = null;
  if (px >= DORI_THRESHOLDS_PX_PER_M.identify) task = "identify";
  else if (px >= DORI_THRESHOLDS_PX_PER_M.recognize) task = "recognize";
  else if (px >= DORI_THRESHOLDS_PX_PER_M.observe) task = "observe";
  else if (px >= DORI_THRESHOLDS_PX_PER_M.detect) task = "detect";
  return { task, pxPerM: px };
}

/**
 * For each DORI task class, what's the maximum distance (m) at which the
 * camera still meets that task's pixel density?
 *
 * Solve: density = pixels / (2 d tan(FOV/2)) = threshold
 *  →   d = pixels / (2 * threshold * tan(FOV/2))
 */
export function doriDistances(args: {
  horizontalPixels: number;
  fovDegrees: number;
}): Record<DoriTask, number> {
  const { horizontalPixels, fovDegrees } = args;
  const half = (fovDegrees / 2) * (Math.PI / 180);
  const tanHalf = Math.tan(half);
  const result = {} as Record<DoriTask, number>;
  for (const task of Object.keys(DORI_THRESHOLDS_PX_PER_M) as DoriTask[]) {
    const threshold = DORI_THRESHOLDS_PX_PER_M[task];
    if (threshold <= 0 || tanHalf <= 0) {
      result[task] = 0;
      continue;
    }
    result[task] = horizontalPixels / (2 * threshold * tanHalf);
  }
  return result;
}
