import type { Floor } from "@/types/design";

/** Re-exported here so the UI doesn't need to import from /api/. */
export type FindingSeverity = "critical" | "warning" | "suggestion";
export type FindingKind =
  | "blind-spot"
  | "redundant-coverage"
  | "missing-entry-coverage"
  | "missing-sensor"
  | "missing-network"
  | "compliance"
  | "improvement";

export type SuggestedAction =
  | {
      kind: "add-device";
      deviceType: "camera" | "reader" | "sensor" | "network";
      subtype?: string;
      x: number;
      y: number;
      rotationDegrees: number;
      label: string;
      rationale: string;
    }
  | { kind: "remove-device"; deviceId: string; rationale: string }
  | {
      kind: "rotate-device";
      deviceId: string;
      newRotationDegrees: number;
      rationale: string;
    }
  | {
      kind: "move-device";
      deviceId: string;
      newX: number;
      newY: number;
      rationale: string;
    }
  | { kind: "manual-review"; rationale: string };

export interface AdvisorFinding {
  id: string;
  kind: FindingKind;
  severity: FindingSeverity;
  title: string;
  description: string;
  location?: { x: number; y: number };
  suggestedAction: SuggestedAction;
}

export interface AdvisorResponse {
  summary: string;
  findings: AdvisorFinding[];
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Convert the active floor into the compact request shape the advisor route expects.
 */
export function summarizeFloorForAdvisor(
  floor: Floor,
  designName: string,
  buildingType?: string,
) {
  return {
    designName,
    buildingType,
    floor: {
      name: floor.name,
      scalePxPerMeter: floor.scale,
      ceilingHeightM: floor.ceilingHeight,
      walls: floor.walls.map((w) => ({
        startX: w.start.x,
        startY: w.start.y,
        endX: w.end.x,
        endY: w.end.y,
      })),
      devices: floor.devices.map((d) => {
        const subtype =
          d.type === "camera"
            ? d.cameraType
            : d.type === "reader"
              ? d.readerType
              : d.type === "sensor"
                ? d.sensorType
                : d.type === "network"
                  ? d.networkType
                  : undefined;
        const fovDegrees = d.type === "camera" ? d.fovDegrees : undefined;
        const rangeMeters =
          d.type === "camera"
            ? d.rangeMeters
            : d.type === "sensor"
              ? d.rangeMeters
              : undefined;
        return {
          id: d.id,
          type: d.type,
          subtype,
          label: d.label,
          x: d.position.x,
          y: d.position.y,
          rotationDegrees: (d.rotation * 180) / Math.PI,
          fovDegrees,
          rangeMeters,
          mountHeightM: d.mountHeight,
          installStatus: d.installStatus ?? "proposed",
        };
      }),
    },
  };
}

export async function runAIAdvisor(args: {
  designName: string;
  floor: Floor;
  buildingType?: string;
}): Promise<AdvisorResponse> {
  const body = summarizeFloorForAdvisor(
    args.floor,
    args.designName,
    args.buildingType,
  );
  const res = await fetch("/api/ai/advisor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string })?.error ??
        `Advisor request failed (${res.status})`,
    );
  }
  return (await res.json()) as AdvisorResponse;
}
