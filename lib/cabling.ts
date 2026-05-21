import type { Device, Floor } from "@/types/design";
import { distance } from "./geometry";

/**
 * Cabling estimator.
 *
 * Each "drop" device (camera, reader) needs a cable run to the nearest
 * "head-end" device (NVR for cameras; controller/switch for readers).
 * If no head-end exists, fall back to the floor's centroid as a generic
 * "IDF/MDF closet" stand-in so the user still gets a useful estimate.
 *
 * The path is L-shaped (Manhattan distance × scale) plus 15% slack for
 * service loops, conduit bends, and termination headroom — same rule of
 * thumb most low-voltage estimators use in the field. The result feeds
 * the Quote drawer's cabling subtotal in place of the old flat
 * `cablingPerCamera` / `cablingPerReader` rates when available.
 */

export interface CableRun {
  deviceId: string;
  /** What the cable terminates at — "nvr", "switch", or "centroid" (fallback). */
  headEnd: "nvr" | "switch" | "centroid";
  /** Real-world length in meters, including service-loop slack. */
  lengthM: number;
}

export interface CablingSummary {
  runs: CableRun[];
  totalLengthM: number;
  cameraRuns: number;
  readerRuns: number;
  /** True when we substituted the floor centroid because no head-end exists. */
  fellBackToCentroid: boolean;
}

/** Multiplier applied to the raw Manhattan path length for real-world slack. */
const SLACK_MULTIPLIER = 1.15;

/**
 * Build a cable run plan for the floor. Cameras → nearest NVR (or switch),
 * readers → nearest controller (modeled as "switch"). If no head-end exists,
 * we fall back to the floor's bounding-box centroid as a generic IDF point.
 */
export function planCabling(floor: Floor): CablingSummary {
  const nvrs = floor.devices.filter(
    (d) => d.type === "network" && d.networkType === "nvr",
  );
  const switches = floor.devices.filter(
    (d) => d.type === "network" && d.networkType === "switch",
  );

  // Fallback centroid in floor-plan pixels — only used if no head-ends.
  let fellBackToCentroid = false;
  const centroid = computeFloorCentroid(floor);

  const runs: CableRun[] = [];
  let cameraRuns = 0;
  let readerRuns = 0;

  for (const dev of floor.devices) {
    if (dev.type !== "camera" && dev.type !== "reader") continue;
    if ((dev.installStatus ?? "proposed") === "decommissioned") continue;

    // Cameras prefer NVR, fall back to switch; readers prefer switch.
    const preferred: Device[] =
      dev.type === "camera"
        ? [...nvrs, ...switches]
        : [...switches, ...nvrs];

    let lengthPx: number;
    let headEnd: CableRun["headEnd"];
    if (preferred.length > 0) {
      const nearest = nearestDevice(dev, preferred);
      lengthPx = manhattanPx(dev.position, nearest.position);
      headEnd = nearest.type === "network" && nearest.networkType === "nvr"
        ? "nvr"
        : "switch";
    } else {
      lengthPx = manhattanPx(dev.position, centroid);
      headEnd = "centroid";
      fellBackToCentroid = true;
    }

    const lengthM = (lengthPx / floor.scale) * SLACK_MULTIPLIER;
    runs.push({ deviceId: dev.id, headEnd, lengthM });
    if (dev.type === "camera") cameraRuns++;
    else readerRuns++;
  }

  const totalLengthM = runs.reduce((sum, r) => sum + r.lengthM, 0);

  return { runs, totalLengthM, cameraRuns, readerRuns, fellBackToCentroid };
}

/** Manhattan distance (|Δx| + |Δy|) in floor-plan pixels. */
function manhattanPx(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function nearestDevice(from: Device, candidates: Device[]): Device {
  let best = candidates[0];
  let bestDist = distance(from.position, best.position);
  for (const c of candidates.slice(1)) {
    const d = distance(from.position, c.position);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

function computeFloorCentroid(floor: Floor): { x: number; y: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const w of floor.walls) {
    xs.push(w.start.x, w.end.x);
    ys.push(w.start.y, w.end.y);
  }
  if (xs.length === 0) return { x: 200, y: 200 };
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}
