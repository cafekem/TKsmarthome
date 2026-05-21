import type { Floor } from "@/types/design";
import type { ExtraLineItem } from "@/lib/pricing";

export interface AIQuoteRates {
  laborHourly: number;
  cablingPerCamera: number;
  cablingPerReader: number;
  commissioningFee: number;
  taxPercentage: number;
  suggestedMarkupPct: number;
}

export interface AIQuoteResponse {
  rates: AIQuoteRates;
  extraLineItems: ExtraLineItem[];
  benchmark: string;
  narrative: string;
  regionalNotes: string;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Summarise the floor in the smallest possible payload — Claude doesn't need
 * exact coordinates to price a job, just the counts + rough area.
 */
export function summarizeFloorForQuote(floor: Floor): {
  deviceCounts: {
    cameras: number;
    readers: number;
    sensors: number;
    networkDevices: number;
  };
  floorAreaSqMeters: number;
  wallCount: number;
} {
  const cameras = floor.devices.filter((d) => d.type === "camera").length;
  const readers = floor.devices.filter((d) => d.type === "reader").length;
  const sensors = floor.devices.filter((d) => d.type === "sensor").length;
  const networkDevices = floor.devices.filter((d) => d.type === "network").length;

  // Bounding-box area in m² from wall extents
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const w of floor.walls) {
    minX = Math.min(minX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  }
  const floorAreaSqMeters =
    Number.isFinite(minX) && Number.isFinite(minY)
      ? ((maxX - minX) / floor.scale) * ((maxY - minY) / floor.scale)
      : 0;

  return {
    deviceCounts: { cameras, readers, sensors, networkDevices },
    floorAreaSqMeters,
    wallCount: floor.walls.length,
  };
}

export async function runAIQuote(args: {
  designName: string;
  location: string;
  buildingType?: string;
  projectNotes?: string;
  deviceCounts: {
    cameras: number;
    readers: number;
    sensors: number;
    networkDevices: number;
  };
  floorAreaSqMeters: number;
  wallCount: number;
}): Promise<AIQuoteResponse> {
  const res = await fetch("/api/ai/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string })?.error ??
        `Quote request failed (${res.status})`,
    );
  }
  return (await res.json()) as AIQuoteResponse;
}
