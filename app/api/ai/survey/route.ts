import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";

/**
 * AI Site Survey endpoint.
 *
 * Accepts a floor plan image (base64 data URL OR raw URL) plus optional
 * context (image dimensions, building type, project notes) and returns a
 * structured design proposal: a list of walls and a list of devices that
 * the editor can directly apply to the active floor.
 *
 * Architecture: we use Claude's tool-use feature with two server-defined
 * tools (`propose_wall`, `propose_device`). Claude analyses the image and
 * calls each tool repeatedly. We collect every tool call into a single
 * proposal object and return it to the client. This is more reliable than
 * asking for a giant JSON blob because Claude can stream tool calls and
 * any malformed call is isolated to one device rather than corrupting the
 * whole response.
 */

const MODEL = "claude-sonnet-4-5";

interface SurveyRequestBody {
  imageBase64: string;
  imageMediaType?: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  imageWidth: number;
  imageHeight: number;
  /** Optional context the user provided */
  buildingType?: string;
  projectNotes?: string;
}

interface ProposedWall {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rationale?: string;
}

interface ProposedDevice {
  type: "camera" | "reader" | "sensor" | "network";
  subtype?: string;
  x: number;
  y: number;
  rotationDegrees: number;
  label: string;
  rangeMeters?: number;
  fovDegrees?: number;
  rationale: string;
}

interface SurveyResponse {
  /** Estimated pixels-per-meter for the uploaded image */
  scalePxPerMeter: number;
  walls: ProposedWall[];
  devices: ProposedDevice[];
  /** Claude's overall summary of the design */
  summary: string;
  /** Total tokens used (for cost monitoring) */
  usage: { inputTokens: number; outputTokens: number };
}

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "set_scale",
    description:
      "Set the estimated real-world scale of the floor plan. Pixels-per-meter. Estimate from visible doors (~0.9 m wide), rooms with typical dimensions, or any dimension markers visible in the plan.",
    input_schema: {
      type: "object",
      properties: {
        pixelsPerMeter: {
          type: "number",
          description:
            "How many image pixels equal one real-world meter. Reasonable values: 10-200.",
        },
        reasoning: {
          type: "string",
          description: "How you estimated this scale (e.g. 'door width').",
        },
      },
      required: ["pixelsPerMeter", "reasoning"],
    },
  },
  {
    name: "propose_wall",
    description:
      "Add one wall segment to the design. Coordinates are in IMAGE PIXELS (same coordinate system as the uploaded image, with (0,0) at the top-left). Trace every visible interior and exterior wall. Doors and openings are short gaps — leave them as gaps between wall segments.",
    input_schema: {
      type: "object",
      properties: {
        startX: { type: "number" },
        startY: { type: "number" },
        endX: { type: "number" },
        endY: { type: "number" },
        rationale: {
          type: "string",
          description: "Brief note about this wall (e.g. 'east exterior wall')",
        },
      },
      required: ["startX", "startY", "endX", "endY"],
    },
  },
  {
    name: "propose_device",
    description:
      "Add one device to the design. Coordinates are in IMAGE PIXELS. Place devices realistically: cameras at corners and entry points, readers next to doors, motion sensors in hallways and main rooms, an access point centrally in each major room. Rotation is in degrees (0 = facing right/east, 90 = facing down/south).",
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
        label: {
          type: "string",
          description:
            "A short human label, e.g. 'Lobby cam', 'Front entry reader', 'Server room motion'.",
        },
        rangeMeters: {
          type: "number",
          description: "FOV range in meters (cameras: ~12m, sensors: ~8m).",
        },
        fovDegrees: {
          type: "number",
          description: "Field of view in degrees (cameras 90°, PTZ 60°).",
        },
        rationale: {
          type: "string",
          description: "One sentence why this device goes here.",
        },
      },
      required: ["type", "x", "y", "rotationDegrees", "label", "rationale"],
    },
  },
  {
    name: "finalize",
    description:
      "Call this last to provide a brief summary paragraph (2-3 sentences) describing the overall design and its coverage strategy.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
      },
      required: ["summary"],
    },
  },
];

const SYSTEM_PROMPT = `You are a senior security-systems designer creating a first-pass site survey for DeeperVision, a CAD tool for commercial security installs.

You are given a floor plan image. Your job:

1. Call set_scale FIRST to estimate pixels-per-meter from visible clues.
2. Call propose_wall for every wall segment you see (exterior + interior). Be thorough — the user will use this to draw the 3D model.
3. Call propose_device for the devices needed:
   - Cameras at every entry/exit, at corners of large rooms, watching corridors
   - Readers next to every controlled door
   - Motion sensors in hallways and high-traffic rooms
   - Glass-break sensors near windows in sensitive areas
   - Door-contact sensors on perimeter doors
   - One access-point centrally in each major room or every ~12 m
   - An NVR in any visible server/IT room
4. Call finalize with a brief summary.

Be opinionated. Aim for ~80% coverage with reasonable overlap, not 100%. Don't over-instrument: a small office needs 4-8 cameras, not 30. Place devices at REALISTIC locations a human installer would choose — wall corners, near doors, mounted ~2.5-2.8m up the wall.

═══════════════════════════════════════════════════════════════════════
COORDINATE RULES — CRITICAL, READ CAREFULLY
═══════════════════════════════════════════════════════════════════════

The image origin (0, 0) is at the TOP-LEFT. X increases right, Y increases DOWN.

All coordinates you return MUST be expressed in the image's ACTUAL pixel
dimensions, which are stated in the user message.

Your wall coordinates MUST span the visible floor plan inside the image.
If the floor plan fills most of the image, your wall coords MUST range
from near (0, 0) to near (imageWidth, imageHeight) — NOT compressed
into a smaller logical range.

❌ WRONG  — image is 1500×1100 px but you return walls in the range
            (100, 80) → (700, 600). This squashes the design into the
            top-left 1/4 of the image and the user sees walls floating
            in a corner while the floor plan extends to the right.

✓ RIGHT  — image is 1500×1100 px and the floor plan covers most of it.
           You return walls spanning roughly (130, 200) → (1380, 950),
           matching where the lines actually appear in the image.

Before calling set_scale + propose_wall, mentally check: "Do my
proposed coordinates actually align with where the walls appear in the
image's pixel space?" If your max wall X is significantly less than
imageWidth (or max Y less than imageHeight) when the floor plan visibly
extends further, your coords are compressed and the design will be
mis-placed. Rescale before emitting.`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY env var." },
      { status: 500 },
    );
  }

  let body: SurveyRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.imageBase64 || !body.imageWidth || !body.imageHeight) {
    return Response.json(
      { error: "imageBase64, imageWidth, imageHeight are required." },
      { status: 400 },
    );
  }

  // Strip the data URL prefix if present so we send raw base64
  const rawBase64 = body.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
  const mediaType = body.imageMediaType ?? "image/png";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userText = `Floor plan image attached.
Image dimensions: ${body.imageWidth} × ${body.imageHeight} pixels.
${body.buildingType ? `Building type: ${body.buildingType}.` : ""}
${body.projectNotes ? `Project notes: ${body.projectNotes}` : ""}

Analyze it and propose a complete first-pass security design by calling the tools.`;

  const walls: ProposedWall[] = [];
  const devices: ProposedDevice[] = [];
  let scalePxPerMeter = 50;
  let summary = "";

  let messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: rawBase64 },
        },
        { type: "text", text: userText },
      ],
    },
  ];

  let totalInput = 0;
  let totalOutput = 0;

  // Run the tool-use loop. Claude calls tools, we collect them, send back
  // empty tool_results, and let it keep going until it stops.
  try {
  for (let turn = 0; turn < 10; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;

    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );

    for (const tool of toolUses) {
      const input = tool.input as Record<string, unknown>;
      if (tool.name === "set_scale") {
        scalePxPerMeter = clamp(Number(input.pixelsPerMeter) || 50, 10, 400);
      } else if (tool.name === "propose_wall") {
        walls.push({
          startX: Number(input.startX) || 0,
          startY: Number(input.startY) || 0,
          endX: Number(input.endX) || 0,
          endY: Number(input.endY) || 0,
          rationale:
            typeof input.rationale === "string" ? input.rationale : undefined,
        });
      } else if (tool.name === "propose_device") {
        devices.push({
          type: input.type as ProposedDevice["type"],
          subtype: typeof input.subtype === "string" ? input.subtype : undefined,
          x: Number(input.x) || 0,
          y: Number(input.y) || 0,
          rotationDegrees: Number(input.rotationDegrees) || 0,
          label:
            typeof input.label === "string" && input.label.trim()
              ? input.label.trim()
              : "Device",
          rangeMeters:
            typeof input.rangeMeters === "number"
              ? input.rangeMeters
              : undefined,
          fovDegrees:
            typeof input.fovDegrees === "number" ? input.fovDegrees : undefined,
          rationale:
            typeof input.rationale === "string" ? input.rationale : "",
        });
      } else if (tool.name === "finalize") {
        if (typeof input.summary === "string") summary = input.summary;
      }
    }

    // If Claude stopped, we're done
    if (response.stop_reason !== "tool_use") break;

    // Otherwise, reply with empty tool_results and let Claude continue
    messages = [
      ...messages,
      { role: "assistant", content: response.content },
      {
        role: "user",
        content: toolUses.map((t) => ({
          type: "tool_result" as const,
          tool_use_id: t.id,
          content: "ok",
        })),
      },
    ];
  }
  } catch (err) {
    // Surface the real upstream error (credit/quota/rate-limit etc.) so the UI
    // can show something actionable rather than a generic 500.
    const { message, status } = extractAnthropicError(err);
    return Response.json({ error: message }, { status });
  }

  const result: SurveyResponse = {
    scalePxPerMeter,
    walls,
    devices,
    summary,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
  };

  return Response.json(result);
}

/**
 * Pull the human-readable message + an appropriate HTTP status out of an SDK
 * thrown error. Anthropic returns structured errors like:
 *   { type: "error", error: { type: "invalid_request_error", message: "..." } }
 */
function extractAnthropicError(err: unknown): { message: string; status: number } {
  if (err instanceof Anthropic.APIError) {
    const upstream = err.error as
      | { error?: { message?: string } }
      | undefined;
    const msg =
      upstream?.error?.message ??
      err.message ??
      "Unknown Anthropic API error.";
    // Pass-through the upstream status when it's a 4xx; otherwise 502.
    const status = err.status >= 400 && err.status < 500 ? err.status : 502;
    return { message: msg, status };
  }
  return {
    message: err instanceof Error ? err.message : "Unknown error.",
    status: 502,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
