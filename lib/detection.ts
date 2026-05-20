import type { CameraDevice, SensorDevice, Vec2, Wall } from "@/types/design";
import { distance, pointNearSegment } from "./geometry";

/**
 * Returns true if the line segment from a to b is clear of every wall.
 * Walls are treated as line segments. Uses standard 2D segment-segment
 * intersection.
 */
export function lineOfSight(a: Vec2, b: Vec2, walls: Wall[]): boolean {
  for (const wall of walls) {
    if (segmentsIntersect(a, b, wall.start, wall.end)) return false;
  }
  return true;
}

function segmentsIntersect(p: Vec2, p2: Vec2, q: Vec2, q2: Vec2): boolean {
  const r = { x: p2.x - p.x, y: p2.y - p.y };
  const s = { x: q2.x - q.x, y: q2.y - q.y };
  const denom = r.x * s.y - r.y * s.x;
  if (denom === 0) return false; // parallel
  const t = ((q.x - p.x) * s.y - (q.y - p.y) * s.x) / denom;
  const u = ((q.x - p.x) * r.y - (q.y - p.y) * r.x) / denom;
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}

export interface DetectionInput {
  cameras: CameraDevice[];
  sensors: SensorDevice[];
  walls: Wall[];
  actorPosition: Vec2;
  scalePxPerMeter: number;
}

export interface DetectionResult {
  /** ids of cameras currently seeing the actor */
  detectingCameras: Set<string>;
  /** ids of sensors currently triggered */
  triggeredSensors: Set<string>;
}

export function computeDetection({
  cameras,
  sensors,
  walls,
  actorPosition,
  scalePxPerMeter,
}: DetectionInput): DetectionResult {
  const detectingCameras = new Set<string>();
  const triggeredSensors = new Set<string>();

  for (const cam of cameras) {
    const dxPx = actorPosition.x - cam.position.x;
    const dyPx = actorPosition.y - cam.position.y;
    const distM = Math.hypot(dxPx, dyPx) / scalePxPerMeter;
    if (distM > cam.rangeMeters) continue;

    // FOV angle test: angle from camera's facing direction to the actor.
    const camDir = { x: Math.cos(cam.rotation), y: Math.sin(cam.rotation) };
    const toActor = { x: dxPx, y: dyPx };
    const toActorLen = Math.hypot(toActor.x, toActor.y);
    if (toActorLen === 0) {
      detectingCameras.add(cam.id);
      continue;
    }
    const cosAngle =
      (camDir.x * toActor.x + camDir.y * toActor.y) / toActorLen;
    const halfFov = (cam.fovDegrees / 2) * (Math.PI / 180);
    if (cosAngle < Math.cos(halfFov)) continue;

    // Line of sight (walls block)
    if (!lineOfSight(cam.position, actorPosition, walls)) continue;

    detectingCameras.add(cam.id);
  }

  for (const sensor of sensors) {
    const distM =
      distance(sensor.position, actorPosition) / scalePxPerMeter;
    if (distM > sensor.rangeMeters) continue;
    // Glass-break ignores walls; motion sensors are blocked by them.
    if (
      sensor.sensorType !== "glass-break" &&
      !lineOfSight(sensor.position, actorPosition, walls)
    ) {
      continue;
    }
    triggeredSensors.add(sensor.id);
  }

  return { detectingCameras, triggeredSensors };
}

/**
 * Walk along a sequence of waypoints at a constant speed (in meters per
 * second). t is sim time in seconds; returns the actor's position in
 * floor-plan pixel space along with the index of the leg they're on.
 */
export function positionOnPath(
  path: Vec2[],
  t: number,
  speedMs: number,
  scalePxPerMeter: number,
): { position: Vec2; legIndex: number; doneAt: number } {
  if (path.length === 0) return { position: { x: 0, y: 0 }, legIndex: 0, doneAt: 0 };
  if (path.length === 1)
    return { position: path[0], legIndex: 0, doneAt: 0 };

  let elapsed = 0;
  const totalDistanceM =
    pathLengthPx(path) / scalePxPerMeter;
  const doneAt = totalDistanceM / speedMs;

  for (let i = 0; i < path.length - 1; i++) {
    const segDistM =
      Math.hypot(
        path[i + 1].x - path[i].x,
        path[i + 1].y - path[i].y
      ) / scalePxPerMeter;
    const segTime = segDistM / speedMs;
    if (t <= elapsed + segTime) {
      const segT = (t - elapsed) / Math.max(segTime, 1e-9);
      const clamped = Math.max(0, Math.min(1, segT));
      return {
        position: {
          x: path[i].x + (path[i + 1].x - path[i].x) * clamped,
          y: path[i].y + (path[i + 1].y - path[i].y) * clamped,
        },
        legIndex: i,
        doneAt,
      };
    }
    elapsed += segTime;
  }

  // Beyond the path — clamp to the last waypoint
  return {
    position: path[path.length - 1],
    legIndex: path.length - 2,
    doneAt,
  };
}

function pathLengthPx(path: Vec2[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += Math.hypot(
      path[i + 1].x - path[i].x,
      path[i + 1].y - path[i].y
    );
  }
  return total;
}

// Re-export geometry helpers callers might want from this module
export { pointNearSegment };
