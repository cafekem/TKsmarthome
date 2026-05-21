import type { Device, Floor } from "@/types/design";
import { useDesignStore } from "@/lib/store";

/** One message in the chat panel. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Operations Claude queued for this turn (assistant messages only). */
  operations?: ChatOperation[];
  /** UI flag — set true once we've applied operations to the store. */
  applied?: boolean;
}

export type ChatOperation =
  | {
      kind: "add-device";
      deviceType: "camera" | "reader" | "sensor" | "network";
      subtype?: string;
      x: number;
      y: number;
      rotationDegrees: number;
      label: string;
      rangeMeters?: number;
      fovDegrees?: number;
      mountHeightM?: number;
      notes?: string;
    }
  | {
      kind: "move-device";
      deviceId: string;
      newX: number;
      newY: number;
    }
  | {
      kind: "rotate-device";
      deviceId: string;
      newRotationDegrees: number;
    }
  | {
      kind: "remove-device";
      deviceId: string;
    }
  | {
      kind: "update-device";
      deviceId: string;
      label?: string;
      rangeMeters?: number;
      fovDegrees?: number;
      mountHeightM?: number;
      notes?: string;
      installStatus?: "proposed" | "installed" | "decommissioned";
    }
  | {
      kind: "add-wall";
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    };

export interface ChatResponse {
  reply: string;
  operations: ChatOperation[];
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Build the floor snapshot the chat endpoint expects. We pass exactly the
 * fields Claude needs and nothing more, both to keep tokens down and to
 * make the prompt easy to read.
 */
function summarizeFloorForChat(floor: Floor) {
  // Compute the floor-plan image dimensions from the planImage data URL if
  // we can — Claude uses this as a hint for what coordinate range it should
  // stay inside.
  return {
    name: floor.name,
    scalePxPerMeter: floor.scale,
    ceilingHeightM: floor.ceilingHeight,
    walls: floor.walls.map((w) => ({
      id: w.id,
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
    doors: (floor.doors ?? []).map((d) => ({
      id: d.id,
      x: d.position.x,
      y: d.position.y,
      widthMeters: d.widthMeters,
      locked: d.locked,
      label: d.label,
    })),
  };
}

/**
 * Send the current chat conversation + floor snapshot to the API and get
 * Claude's reply plus a list of operations to apply.
 */
export async function runAIChat(args: {
  designName: string;
  buildingType?: string;
  floor: Floor;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<ChatResponse> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      designName: args.designName,
      buildingType: args.buildingType,
      floor: summarizeFloorForChat(args.floor),
      messages: args.messages,
    }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string })?.error ??
        `Chat request failed (${res.status})`,
    );
  }
  return (await res.json()) as ChatResponse;
}

/**
 * Apply a list of operations to the active floor in the global store.
 * Returns how many of each kind succeeded so the UI can report it back.
 *
 * Errors here are swallowed silently — the worst case is "Claude tried to
 * move a device id that doesn't exist", which we'd rather skip than crash
 * the chat panel for.
 */
export function applyChatOperations(
  floorId: string,
  ops: ChatOperation[],
): { added: number; moved: number; rotated: number; removed: number; updated: number; walls: number } {
  const counts = { added: 0, moved: 0, rotated: 0, removed: 0, updated: 0, walls: 0 };
  const store = useDesignStore.getState();
  const design = store.currentDesignId
    ? store.designs[store.currentDesignId]
    : null;
  const floor = design?.floors.find((f) => f.id === floorId);
  if (!floor) return counts;

  for (const op of ops) {
    try {
      if (op.kind === "add-device") {
        const created = store.addDevice(floorId, op.deviceType, {
          x: op.x,
          y: op.y,
        });
        if (!created) continue;
        const partial: Partial<Device> = {
          label: op.label,
          rotation: (op.rotationDegrees * Math.PI) / 180,
        } as Partial<Device>;
        if (op.mountHeightM != null) partial.mountHeight = op.mountHeightM;
        if (op.notes) partial.notes = op.notes;
        if (op.subtype) {
          if (op.deviceType === "camera") {
            (
              partial as Partial<Extract<Device, { type: "camera" }>>
            ).cameraType = op.subtype as never;
          } else if (op.deviceType === "reader") {
            (
              partial as Partial<Extract<Device, { type: "reader" }>>
            ).readerType = op.subtype as never;
          } else if (op.deviceType === "sensor") {
            (
              partial as Partial<Extract<Device, { type: "sensor" }>>
            ).sensorType = op.subtype as never;
          } else if (op.deviceType === "network") {
            (
              partial as Partial<Extract<Device, { type: "network" }>>
            ).networkType = op.subtype as never;
          }
        }
        if (op.deviceType === "camera") {
          if (op.fovDegrees != null) {
            (
              partial as Partial<Extract<Device, { type: "camera" }>>
            ).fovDegrees = op.fovDegrees;
          }
          if (op.rangeMeters != null) {
            (
              partial as Partial<Extract<Device, { type: "camera" }>>
            ).rangeMeters = op.rangeMeters;
          }
        } else if (op.deviceType === "sensor" && op.rangeMeters != null) {
          (
            partial as Partial<Extract<Device, { type: "sensor" }>>
          ).rangeMeters = op.rangeMeters;
        }
        store.updateDevice(floorId, created.id, partial);
        counts.added++;
      } else if (op.kind === "move-device") {
        store.updateDevice(floorId, op.deviceId, {
          position: { x: op.newX, y: op.newY },
        });
        counts.moved++;
      } else if (op.kind === "rotate-device") {
        store.updateDevice(floorId, op.deviceId, {
          rotation: (op.newRotationDegrees * Math.PI) / 180,
        });
        counts.rotated++;
      } else if (op.kind === "remove-device") {
        store.removeDevice(floorId, op.deviceId);
        counts.removed++;
      } else if (op.kind === "update-device") {
        const partial: Partial<Device> = {} as Partial<Device>;
        if (op.label !== undefined) partial.label = op.label;
        if (op.mountHeightM !== undefined) partial.mountHeight = op.mountHeightM;
        if (op.notes !== undefined) partial.notes = op.notes;
        if (op.installStatus !== undefined)
          partial.installStatus = op.installStatus;
        // For range / FOV we need to know the device type. We just write
        // both fields — extra fields on the wrong type are harmless for the
        // store and TS spreads make it consistent.
        if (op.rangeMeters !== undefined) {
          (
            partial as Partial<Extract<Device, { type: "camera" }>>
          ).rangeMeters = op.rangeMeters;
        }
        if (op.fovDegrees !== undefined) {
          (
            partial as Partial<Extract<Device, { type: "camera" }>>
          ).fovDegrees = op.fovDegrees;
        }
        store.updateDevice(floorId, op.deviceId, partial);
        counts.updated++;
      } else if (op.kind === "add-wall") {
        store.addWall(floorId, {
          start: { x: op.startX, y: op.startY },
          end: { x: op.endX, y: op.endY },
          height: floor.ceilingHeight,
        });
        counts.walls++;
      }
    } catch {
      // Skip individual op failures — keep applying the rest.
    }
  }
  return counts;
}

/**
 * Render a one-liner describing what an operation does, for the chip UI
 * under each assistant message.
 */
export function describeOperation(op: ChatOperation): string {
  switch (op.kind) {
    case "add-device":
      return `+ ${op.subtype ?? op.deviceType} "${op.label}"`;
    case "move-device":
      return `→ move ${op.deviceId}`;
    case "rotate-device":
      return `↻ ${op.deviceId} to ${op.newRotationDegrees.toFixed(0)}°`;
    case "remove-device":
      return `× remove ${op.deviceId}`;
    case "update-device": {
      const bits: string[] = [];
      if (op.label) bits.push(`label "${op.label}"`);
      if (op.rangeMeters != null) bits.push(`range ${op.rangeMeters} m`);
      if (op.fovDegrees != null) bits.push(`FOV ${op.fovDegrees}°`);
      if (op.mountHeightM != null) bits.push(`mount ${op.mountHeightM} m`);
      if (op.installStatus) bits.push(op.installStatus);
      return `✎ ${op.deviceId}${bits.length ? " · " + bits.join(", ") : ""}`;
    }
    case "add-wall":
      return `+ wall`;
  }
}
