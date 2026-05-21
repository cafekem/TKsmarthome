import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";

/**
 * AI Quote Assistant endpoint.
 *
 * Given a design summary + a project location, Claude returns:
 *   1. Location-adjusted rate overrides (labor $/hr, cabling cost per device,
 *      tax %, commissioning fee) that we plug straight into QuoteSettings.
 *   2. Extra line items the standard formula misses (permits, scissor lift
 *      rental, certification, after-hours premium, etc.).
 *   3. A short benchmark string ("This proposal is ~8% below median for…").
 *   4. A polished, client-facing narrative paragraph.
 *
 * Why this matters: the existing pricing.ts uses national-average rates.
 * Coastal CA labor is $130-160/hr; rural Midwest is $65-85/hr. A flat $95/hr
 * over-quotes some jobs and under-quotes others. Claude has region knowledge
 * baked in and adjusts realistically.
 */

const MODEL = "claude-sonnet-4-5";

interface QuoteRequestBody {
  designName: string;
  /** ZIP code, city/state, or any location hint */
  location: string;
  /** "commercial office", "healthcare clinic", "retail", "warehouse", etc. */
  buildingType?: string;
  /** Optional special context: "after-hours install", "union shop", etc. */
  projectNotes?: string;
  /** Device summary so Claude can size the job */
  deviceCounts: {
    cameras: number;
    readers: number;
    sensors: number;
    networkDevices: number;
  };
  /** Rough size context */
  floorAreaSqMeters: number;
  wallCount: number;
}

interface ExtraLineItem {
  description: string;
  quantity: number;
  unitCost: number;
  category: "labor" | "materials" | "permits" | "logistics" | "other";
}

interface QuoteAIResponse {
  rates: {
    laborHourly: number;
    cablingPerCamera: number;
    cablingPerReader: number;
    commissioningFee: number;
    taxPercentage: number;
    /** Suggested margin/markup on top of cost. */
    suggestedMarkupPct: number;
  };
  extraLineItems: ExtraLineItem[];
  benchmark: string;
  narrative: string;
  regionalNotes: string;
  usage: { inputTokens: number; outputTokens: number };
}

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "set_rates",
    description:
      "Provide location-adjusted pricing rates that will replace the default flat rates in the quote calculator. All values in USD.",
    input_schema: {
      type: "object",
      properties: {
        laborHourly: {
          type: "number",
          description:
            "Hourly install labor rate for licensed low-voltage technicians in this region. Coastal metro: $120-160. Rural / midwest: $65-95. Suburban: $85-115.",
        },
        cablingPerCamera: {
          type: "number",
          description:
            "Average all-in cabling cost per camera run (cable, connectors, terminations, conduit). Typically $180-320 depending on building type.",
        },
        cablingPerReader: {
          type: "number",
          description:
            "Average all-in cabling cost per access reader. Lower than camera (less wire, lower voltage). Typically $100-200.",
        },
        commissioningFee: {
          type: "number",
          description:
            "Fixed system programming + testing fee. Scales with system size: 4-8 devices ~$700, 12-20 ~$1100, 25+ ~$1800.",
        },
        taxPercentage: {
          type: "number",
          description:
            "Combined state + local sales tax for this location. e.g. 8.875 for NYC, 0 for OR, 6.5 for IL.",
        },
        suggestedMarkupPct: {
          type: "number",
          description:
            "Recommended margin on top of cost. Industry typical: 18-32%. Higher in metros, lower in budget-driven markets.",
        },
      },
      required: [
        "laborHourly",
        "cablingPerCamera",
        "cablingPerReader",
        "commissioningFee",
        "taxPercentage",
        "suggestedMarkupPct",
      ],
    },
  },
  {
    name: "add_extra_line_item",
    description:
      "Add a line item the default quote formula doesn't cover. Examples: building permit ($150-400), scissor lift rental for high ceilings ($380/day), after-hours premium (1.5× labor), union prevailing wage adjustment, asbestos abatement compliance review, low-voltage license renewal pass-through.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string" },
        quantity: { type: "number" },
        unitCost: { type: "number" },
        category: {
          type: "string",
          enum: ["labor", "materials", "permits", "logistics", "other"],
        },
      },
      required: ["description", "quantity", "unitCost", "category"],
    },
  },
  {
    name: "set_regional_notes",
    description:
      "One short note explaining what's special about pricing in this region (e.g. 'CA Title 24 compliance adds 2-3% to commissioning' or 'NYC permit fees significant; lead times 4-6 weeks').",
    input_schema: {
      type: "object",
      properties: { notes: { type: "string" } },
      required: ["notes"],
    },
  },
  {
    name: "set_benchmark",
    description:
      "One sentence comparing this proposal to local market median: 'This proposal is ~8% below median for office buildings of this size in $LOCATION.'",
    input_schema: {
      type: "object",
      properties: { benchmark: { type: "string" } },
      required: ["benchmark"],
    },
  },
  {
    name: "set_narrative",
    description:
      "A polished 3-5 sentence client-facing paragraph explaining the value of this design. Mention scope, key brands/features, and what's included. Will be embedded directly in the printed quote PDF.",
    input_schema: {
      type: "object",
      properties: { narrative: { type: "string" } },
      required: ["narrative"],
    },
  },
];

const SYSTEM_PROMPT = `You are a senior security-systems estimator for DeeperVision. Given a design summary and project location, produce a realistic, location-aware quote.

You have deep knowledge of:
- Regional labor markets (coastal CA, NYC metro, Texas, Midwest, rural rates)
- State sales tax structures
- Building-permit requirements in major US jurisdictions
- Industry-standard markups for low-voltage integrators (typically 18-32%)
- When extra line items are warranted (high ceilings → lift rental; healthcare → HIPAA documentation; after-hours → premium labor)

Be specific. Don't return generic national averages — use what you know about THIS location. If the location is vague, default to the regional category that best matches.

Call the tools in this order:
1. set_rates with location-adjusted rates
2. add_extra_line_item (one or more) for any regional/job-specific charges that apply
3. set_regional_notes with a short pricing-relevant note about this region
4. set_benchmark comparing this quote to local norms
5. set_narrative with a client-ready paragraph

Be precise with numbers. If the location is "Brooklyn, NY" you should know NYC has 8.875% combined tax and labor runs $130-160/hr. If it's "Des Moines, IA" labor is $75-95/hr and tax ~7%.`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY env var." },
      { status: 500 },
    );
  }

  let body: QuoteRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.location || !body.location.trim()) {
    return Response.json(
      { error: "Location is required (ZIP, city, or city/state)." },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userText = `Design: "${body.designName}"
Location: ${body.location.trim()}
${body.buildingType ? `Building type: ${body.buildingType}` : ""}
${body.projectNotes ? `Project notes: ${body.projectNotes}` : ""}

Device counts:
  • ${body.deviceCounts.cameras} cameras
  • ${body.deviceCounts.readers} access readers
  • ${body.deviceCounts.sensors} sensors
  • ${body.deviceCounts.networkDevices} network devices

Floor area: ~${Math.round(body.floorAreaSqMeters)} m² (${Math.round(body.floorAreaSqMeters * 10.764)} sq ft)
Wall segments: ${body.wallCount}

Produce a realistic location-aware quote for this job by calling the tools.`;

  let result: QuoteAIResponse = {
    rates: {
      laborHourly: 95,
      cablingPerCamera: 240,
      cablingPerReader: 150,
      commissioningFee: 850,
      taxPercentage: 8.5,
      suggestedMarkupPct: 22,
    },
    extraLineItems: [],
    benchmark: "",
    narrative: "",
    regionalNotes: "",
    usage: { inputTokens: 0, outputTokens: 0 },
  };

  let messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: userText },
  ];

  try {
  for (let turn = 0; turn < 6; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    result.usage.inputTokens += response.usage.input_tokens;
    result.usage.outputTokens += response.usage.output_tokens;

    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );

    for (const tool of toolUses) {
      const input = tool.input as Record<string, unknown>;
      if (tool.name === "set_rates") {
        result.rates = {
          laborHourly: clampNum(input.laborHourly, 30, 300, 95),
          cablingPerCamera: clampNum(input.cablingPerCamera, 80, 800, 240),
          cablingPerReader: clampNum(input.cablingPerReader, 50, 500, 150),
          commissioningFee: clampNum(input.commissioningFee, 200, 5000, 850),
          taxPercentage: clampNum(input.taxPercentage, 0, 15, 8.5),
          suggestedMarkupPct: clampNum(input.suggestedMarkupPct, 0, 60, 22),
        };
      } else if (tool.name === "add_extra_line_item") {
        const category = input.category as ExtraLineItem["category"];
        if (
          ["labor", "materials", "permits", "logistics", "other"].includes(
            category,
          )
        ) {
          result.extraLineItems.push({
            description:
              typeof input.description === "string"
                ? input.description
                : "Extra item",
            quantity: Number(input.quantity) || 1,
            unitCost: Number(input.unitCost) || 0,
            category,
          });
        }
      } else if (tool.name === "set_regional_notes") {
        if (typeof input.notes === "string") result.regionalNotes = input.notes;
      } else if (tool.name === "set_benchmark") {
        if (typeof input.benchmark === "string")
          result.benchmark = input.benchmark;
      } else if (tool.name === "set_narrative") {
        if (typeof input.narrative === "string")
          result.narrative = input.narrative;
      }
    }

    if (response.stop_reason !== "tool_use") break;

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
    const { message, status } = extractAnthropicError(err);
    return Response.json({ error: message }, { status });
  }

  return Response.json(result);
}

/** Pull out a human-readable upstream message + appropriate HTTP status. */
function extractAnthropicError(err: unknown): { message: string; status: number } {
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

function clampNum(
  v: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
