import { useDesignStore } from "@/lib/store";
import type { SurveyResponse } from "@/lib/ai-survey";
import type { Device, DeviceType } from "@/types/design";

/**
 * Apply a survey response from /api/ai/survey to the active floor.
 *
 * - Sets the floor's planImage to the original uploaded data URL.
 * - Sets the floor's pixel-per-meter scale from Claude's estimate.
 * - Replaces walls + devices with the proposed ones (so a user can re-run
 *   the survey without piling on duplicates).
 *
 * Returns counts of what was applied so the toast can confirm.
 */
export function applySurveyToActiveFloor(
  survey: SurveyResponse,
  planImageDataUrl: string,
): { wallsAdded: number; devicesAdded: number } {
  const store = useDesignStore.getState();
  const designId = store.currentDesignId;
  if (!designId) return { wallsAdded: 0, devicesAdded: 0 };
  const design = store.designs[designId];
  if (!design) return { wallsAdded: 0, devicesAdded: 0 };
  const floor = design.floors.find((f) => f.id === design.activeFloorId);
  if (!floor) return { wallsAdded: 0, devicesAdded: 0 };

  // 1. Update the floor with the plan image + scale, and clear existing
  //    walls/devices so the AI proposal is a clean apply.
  store.updateFloor(floor.id, {
    planImage: planImageDataUrl,
    scale: survey.scalePxPerMeter,
    walls: [],
    devices: [],
  });

  // 2. Add proposed walls
  let wallsAdded = 0;
  for (const w of survey.walls) {
    store.addWall(floor.id, {
      start: { x: w.startX, y: w.startY },
      end: { x: w.endX, y: w.endY },
      height: floor.ceilingHeight,
    });
    wallsAdded++;
  }

  // 3. Add proposed devices and apply per-device overrides (rotation,
  //    label, range/FOV).
  let devicesAdded = 0;
  for (const d of survey.devices) {
    const safeType: DeviceType = (
      ["camera", "reader", "sensor", "network"] as DeviceType[]
    ).includes(d.type)
      ? d.type
      : "camera";

    const created = store.addDevice(floor.id, safeType, { x: d.x, y: d.y });
    if (!created) continue;

    const partial: Partial<Device> = {
      label: d.label,
      rotation: (d.rotationDegrees * Math.PI) / 180,
      notes: d.rationale,
    } as Partial<Device>;

    // Apply subtype + range/FOV per device kind
    if (safeType === "camera") {
      const cameraPartial = partial as Partial<
        Extract<Device, { type: "camera" }>
      >;
      if (d.subtype) cameraPartial.cameraType = d.subtype as never;
      if (typeof d.fovDegrees === "number")
        cameraPartial.fovDegrees = d.fovDegrees;
      if (typeof d.rangeMeters === "number")
        cameraPartial.rangeMeters = d.rangeMeters;
    } else if (safeType === "sensor") {
      const sensorPartial = partial as Partial<
        Extract<Device, { type: "sensor" }>
      >;
      if (d.subtype) sensorPartial.sensorType = d.subtype as never;
      if (typeof d.rangeMeters === "number")
        sensorPartial.rangeMeters = d.rangeMeters;
    } else if (safeType === "reader") {
      const readerPartial = partial as Partial<
        Extract<Device, { type: "reader" }>
      >;
      if (d.subtype) readerPartial.readerType = d.subtype as never;
    } else if (safeType === "network") {
      const networkPartial = partial as Partial<
        Extract<Device, { type: "network" }>
      >;
      if (d.subtype) networkPartial.networkType = d.subtype as never;
    }

    store.updateDevice(floor.id, created.id, partial);
    devicesAdded++;
  }

  return { wallsAdded, devicesAdded };
}
