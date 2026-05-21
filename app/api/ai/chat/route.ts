import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";

/**
 * AI Chat endpoint — "Cursor for floor plans".
 *
 * The user talks to Claude in a side panel. Claude has tools to mutate the
 * active floor: add / move / rotate / remove / update devices, add walls,
 * and recommend changes without committing.
 *
 * Architecture mirrors the other AI routes:
 *   • Client sends the conversation history + current floor state.
 *   • Server injects the floor snapshot into the last user message so Claude
 *     always sees the latest design.
 *   • Claude calls tools; we collect each call into an `operations[]` queue.
 *   • The route returns Claude's final assistant text + the queued ops.
 *   • Client applies ops to the store and shows the text inline.
 *
 * The endpoint is intentionally stateless — the design lives in the client
 * store. We just translate "natural language" → "structured edit ops".
 */

const MODEL = "claude-sonnet-4-5";
// Max turns of tool-use in a single request. Each turn = one model call.
// 8 is plenty: bulk operations like "add 4 cameras at the corners" usually
// resolve in 1-2 turns.
const MAX_TURNS = 8;

interface FloorSnapshot {
  name: string;
  scalePxPerMeter: number;
  ceilingHeightM: number;
  imageWidth?: number;
  imageHeight?: number;
  walls: { id: string; startX: number; startY: number; endX: number; endY: number }[];
  devices: {
    id: string;
    type: "camera" | "reader" | "sensor" | "network";
    subtype?: string;
    label: string;
    x: number;
    y: number;
    rotationDegrees: number;
    fovDegrees?: number;
    rangeMeters?: number;
    mountHeightM: number;
    installStatus: "proposed" | "installed" | "decommissioned";
  }[];
  doors: { id: string; x: number; y: number; widthMeters: number; locked: boolean; label: string }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  designName: string;
  buildingType?: string;
  floor: FloorSnapshot;
  messages: ChatMessage[];
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

interface ChatResponse {
  /** Plain-text reply to show in the chat panel. */
  reply: string;
  /** Structured edits the client should apply to the floor. */
  operations: ChatOperation[];
  usage: { inputTokens: number; outputTokens: number };
}

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "add_device",
    description:
      "Add a new device to the floor. Coordinates are floor-plan pixels (top-left origin, X right, Y down). For cameras specify fovDegrees + rangeMeters, for sensors specify rangeMeters. Rotation is 0=east, 90=south, 180=west, 270=north.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["camera", "reader", "sensor", "network"],
        },
        subtype: {
          type: "string",
          description:
            "Camera: dome|bullet|ptz|fisheye|multi-sensor. Reader: card|biometric|keypad. Sensor: motion|glass-break|door-contact|smoke. Network: access-point|switch|nvr.",
        },
        x: { type: "number" },
        y: { type: "number" },
        rotationDegrees: { type: "number" },
        label: { type: "string" },
        rangeMeters: { type: "number" },
        fovDegrees: { type: "number" },
        mountHeightM: { type: "number" },
        notes: { type: "string" },
      },
      required: ["type", "x", "y", "rotationDegrees", "label"],
    },
  },
  {
    name: "move_device",
    description:
      "Move an existing device by its id to a new (x, y) position in floor-plan pixels.",
    input_schema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        newX: { type: "number" },
        newY: { type: "number" },
      },
      required: ["deviceId", "newX", "newY"],
    },
  },
  {
    name: "rotate_device",
    description:
      "Rotate an existing device by its id. Rotation is in degrees, 0=east, 90=south.",
    input_schema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        newRotationDegrees: { type: "number" },
      },
      required: ["deviceId", "newRotationDegrees"],
    },
  },
  {
    name: "remove_device",
    description: "Delete a device by id.",
    input_schema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "update_device",
    description:
      "Change properties of an existing device — label, range, FOV, mount height, notes, or install status.",
    input_schema: {
      type: "object",
      properties: {
        deviceId: { type: "string" },
        label: { type: "string" },
        rangeMeters: { type: "number" },
        fovDegrees: { type: "number" },
        mountHeightM: { type: "number" },
        notes: { type: "string" },
        installStatus: {
          type: "string",
          enum: ["proposed", "installed", "decommissioned"],
        },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "add_wall",
    description:
      "Add a wall segment to the floor. Use only when the user explicitly asks to draw or extend walls. Coordinates are floor-plan pixels.",
    input_schema: {
      type: "object",
      properties: {
        startX: { type: "number" },
        startY: { type: "number" },
        endX: { type: "number" },
        endY: { type: "number" },
      },
      required: ["startX", "startY", "endX", "endY"],
    },
  },
];

const SYSTEM_PROMPT = `You are the in-app AI editor for DeeperVision, a CAD tool for designing commercial security systems. You're embedded in a chat panel on the right side of the editor. The user is sitting in front of their floor plan and talking to you the way they'd talk to a co-worker reviewing the design.

Your job:
• Read the current floor state (walls + devices + doors) provided in each user message.
• When the user asks for a change, MAKE the change by calling the appropriate tool(s) — don't just describe what they should do.
• When the user asks a question or for advice, answer concisely. Only call tools when there's a real edit to perform.

Tools you can call:
  add_device          add a camera / reader / sensor / network device
  move_device         move a device (by id) to new coordinates
  rotate_device       change a device's rotation
  remove_device       delete a device
  update_device       change label / range / FOV / mount height / status / notes
  add_wall            add a wall segment (use sparingly — only on explicit request)

Coordinate system: floor-plan pixels, top-left origin, X right, Y down. The scale is given as pixels-per-meter; convert when the user talks in meters or feet.

Style:
• Be concise. 1-3 sentences typically.
• Don't restate what you're about to do — just do it. The UI shows applied operations as chips below your message.
• Prefer realistic placements: cameras at wall corners ~2.8 m mount height, readers near doors ~1.2 m, motion sensors ceiling-mounted in the middle of rooms.
• For "add cameras to cover X", aim for ~80% coverage, not over-instrumented. Most rooms need 1-2 cameras; long corridors need a camera per ~12 m.
• When asked "where would you put …?", you can either suggest with text OR go ahead and add it. If unsure, suggest first; if it's clearly a directive ("add a camera at the front door"), just do it.
• If the user asks something you can't do with the tools (e.g. "change the wall color"), say so briefly and offer the closest alternative.
• Use existing device ids (dev_xxx) when modifying — never invent ids.

Safety:
• Don't bulk-delete devices without an obvious user instruction.
• When in doubt, propose in text rather than acting.`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY env var." },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json(
      { error: "messages[] is required." },
      { status: 400 },
    );
  }
  if (!body.floor) {
    return Response.json({ error: "floor is required." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Inject the current floor snapshot into the LAST user message so Claude
  // always sees the freshest state — even on multi-turn conversations where
  // prior turns mutated the floor.
  const floorContext = formatFloorContext(body);
  const claudeMessages: Anthropic.Messages.MessageParam[] = body.messages.map(
    (m, i, arr) => {
      const isLastUser = m.role === "user" && i === arr.length - 1;
      const content = isLastUser
        ? `${floorContext}\n\nUser: ${m.content}`
        : m.content;
      return { role: m.role, content };
    },
  );

  const operations: ChatOperation[] = [];
  let reply = "";
  let totalInput = 0;
  let totalOutput = 0;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: claudeMessages,
      });

      totalInput += response.usage.input_tokens;
      totalOutput += response.usage.output_tokens;

      // Capture text content as the reply. Successive turns may produce
      // additional text — concatenate so the user sees the full thought.
      for (const block of response.content) {
        if (block.type === "text" && block.text.trim()) {
          reply += (reply ? "\n\n" : "") + block.text.trim();
        }
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
      );

      for (const tool of toolUses) {
        const op = toolUseToOperation(tool);
        if (op) operations.push(op);
      }

      if (response.stop_reason !== "tool_use") break;

      claudeMessages.push(
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: toolUses.map((t) => ({
            type: "tool_result" as const,
            tool_use_id: t.id,
            content: "ok",
          })),
        },
      );
    }
  } catch (err) {
    const { message, status } = extractAnthropicError(err);
    return Response.json({ error: message }, { status });
  }

  // If Claude only emitted tool calls and no text, fall back to a brief
  // confirmation so the chat doesn't look empty.
  if (!reply.trim()) {
    if (operations.length > 0) {
      reply = `Applied ${operations.length} change${operations.length === 1 ? "" : "s"}.`;
    } else {
      reply = "Done.";
    }
  }

  const result: ChatResponse = {
    reply,
    operations,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
  };
  return Response.json(result);
}

/**
 * Render the current floor as a compact text block Claude can quickly
 * skim. Keeps formatting parallel to the advisor route so Claude reasons
 * about both endpoints the same way.
 */
function formatFloorContext(body: ChatRequestBody): string {
  const { floor, designName, buildingType } = body;
  const lines: string[] = [];
  lines.push("=== CURRENT FLOOR STATE ===");
  lines.push(`Design: ${designName}`);
  lines.push(`Floor: ${floor.name}`);
  if (buildingType) lines.push(`Building type: ${buildingType}`);
  lines.push(
    `Scale: ${floor.scalePxPerMeter} pixels per meter (100 px = ${(100 / floor.scalePxPerMeter).toFixed(1)} m)`,
  );
  lines.push(`Ceiling height: ${floor.ceilingHeightM.toFixed(1)} m`);
  if (floor.imageWidth && floor.imageHeight) {
    lines.push(`Floor plan image: ${floor.imageWidth} × ${floor.imageHeight} px`);
  }

  lines.push("");
  lines.push(`Walls (${floor.walls.length}):`);
  if (floor.walls.length === 0) {
    lines.push("  (none yet)");
  } else {
    for (const w of floor.walls.slice(0, 60)) {
      lines.push(
        `  [${w.id}] (${w.startX.toFixed(0)},${w.startY.toFixed(0)}) → (${w.endX.toFixed(0)},${w.endY.toFixed(0)})`,
      );
    }
    if (floor.walls.length > 60) lines.push(`  …${floor.walls.length - 60} more wall(s) omitted`);
  }

  lines.push("");
  lines.push(`Doors (${floor.doors.length}):`);
  if (floor.doors.length === 0) {
    lines.push("  (none)");
  } else {
    for (const d of floor.doors) {
      lines.push(
        `  [${d.id}] "${d.label}" @ (${d.x.toFixed(0)},${d.y.toFixed(0)}) — ${d.widthMeters} m wide, ${d.locked ? "locked" : "unlocked"}`,
      );
    }
  }

  lines.push("");
  lines.push(`Devices (${floor.devices.length}):`);
  if (floor.devices.length === 0) {
    lines.push("  (none yet)");
  } else {
    for (const d of floor.devices) {
      const subtype = d.subtype ? ` ${d.subtype}` : "";
      const fov = d.fovDegrees != null ? ` · ${d.fovDegrees}° FOV` : "";
      const range = d.rangeMeters != null ? ` · ${d.rangeMeters} m range` : "";
      lines.push(
        `  [${d.id}] ${d.type}${subtype} "${d.label}" @ (${d.x.toFixed(0)},${d.y.toFixed(0)}) rot ${d.rotationDegrees.toFixed(0)}°${fov}${range} · mount ${d.mountHeightM} m · ${d.installStatus}`,
      );
    }
  }
  lines.push("===========================");
  return lines.join("\n");
}

function toolUseToOperation(
  tool: Anthropic.Messages.ToolUseBlock,
): ChatOperation | null {
  const input = tool.input as Record<string, unknown>;
  switch (tool.name) {
    case "add_device": {
      const dtype = input.type as "camera" | "reader" | "sensor" | "network";
      if (!["camera", "reader", "sensor", "network"].includes(dtype)) return null;
      return {
        kind: "add-device",
        deviceType: dtype,
        subtype: typeof input.subtype === "string" ? input.subtype : undefined,
        x: Number(input.x) || 0,
        y: Number(input.y) || 0,
        rotationDegrees: Number(input.rotationDegrees) || 0,
        label:
          typeof input.label === "string" && input.label.trim()
            ? input.label.trim()
            : "Device",
        rangeMeters:
          typeof input.rangeMeters === "number" ? input.rangeMeters : undefined,
        fovDegrees:
          typeof input.fovDegrees === "number" ? input.fovDegrees : undefined,
        mountHeightM:
          typeof input.mountHeightM === "number"
            ? input.mountHeightM
            : undefined,
        notes: typeof input.notes === "string" ? input.notes : undefined,
      };
    }
    case "move_device": {
      const deviceId = typeof input.deviceId === "string" ? input.deviceId : "";
      if (!deviceId) return null;
      return {
        kind: "move-device",
        deviceId,
        newX: Number(input.newX) || 0,
        newY: Number(input.newY) || 0,
      };
    }
    case "rotate_device": {
      const deviceId = typeof input.deviceId === "string" ? input.deviceId : "";
      if (!deviceId) return null;
      return {
        kind: "rotate-device",
        deviceId,
        newRotationDegrees: Number(input.newRotationDegrees) || 0,
      };
    }
    case "remove_device": {
      const deviceId = typeof input.deviceId === "string" ? input.deviceId : "";
      if (!deviceId) return null;
      return { kind: "remove-device", deviceId };
    }
    case "update_device": {
      const deviceId = typeof input.deviceId === "string" ? input.deviceId : "";
      if (!deviceId) return null;
      const op: ChatOperation = { kind: "update-device", deviceId };
      if (typeof input.label === "string") op.label = input.label;
      if (typeof input.rangeMeters === "number") op.rangeMeters = input.rangeMeters;
      if (typeof input.fovDegrees === "number") op.fovDegrees = input.fovDegrees;
      if (typeof input.mountHeightM === "number") op.mountHeightM = input.mountHeightM;
      if (typeof input.notes === "string") op.notes = input.notes;
      if (
        typeof input.installStatus === "string" &&
        ["proposed", "installed", "decommissioned"].includes(input.installStatus)
      ) {
        op.installStatus = input.installStatus as
          | "proposed"
          | "installed"
          | "decommissioned";
      }
      return op;
    }
    case "add_wall": {
      return {
        kind: "add-wall",
        startX: Number(input.startX) || 0,
        startY: Number(input.startY) || 0,
        endX: Number(input.endX) || 0,
        endY: Number(input.endY) || 0,
      };
    }
    default:
      return null;
  }
}

function extractAnthropicError(err: unknown): {
  message: string;
  status: number;
} {
  if (err instanceof Anthropic.APIError) {
    const upstream = err.error as
      | { error?: { message?: string } }
      | undefined;
    const msg =
      upstream?.error?.message ??
      err.message ??
      "Unknown Anthropic API error.";
    const status = err.status >= 400 && err.status < 500 ? err.status : 502;
    return { message: msg, status };
  }
  return {
    message: err instanceof Error ? err.message : "Unknown error.",
    status: 502,
  };
}
