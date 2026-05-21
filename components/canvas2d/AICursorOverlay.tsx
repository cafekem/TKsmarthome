"use client";

import { useEffect, useState } from "react";
import {
  DoorOpen,
  MapPin,
  MousePointer2,
  PencilRuler,
  Receipt,
  Ruler,
  RotateCw,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useDesignStore, type ViewTransform } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  /** Stage transform — chat reports world-space pixels; we need screen-space. */
  viewTransform: ViewTransform;
}

/**
 * Floating overlay rendered above the Konva Stage. Reads `aiCursor` from
 * the store (set transiently by the chat panel as operations stream in)
 * and animates a labelled "Claude is working here" marker at the target
 * point in screen space.
 *
 * Each tone gets a distinct color + icon — emerald cursor for adds, sky
 * magnifying glass for searches, violet rotate icon for rotations,
 * amber pencil for edits, yellow sticky note for annotations, etc.
 *
 * Auto-clears 900ms after each ping (via the chat panel's timeout) so
 * successive ops each show their own marker.
 */
export function AICursorOverlay({ viewTransform }: Props) {
  const cursor = useDesignStore((s) => s.aiCursor);
  // Mount key so the CSS animation re-runs on every new nonce.
  const [renderedNonce, setRenderedNonce] = useState<number | null>(null);

  useEffect(() => {
    if (cursor) setRenderedNonce(cursor.nonce);
  }, [cursor]);

  if (!cursor) return null;

  const screenX = cursor.x * viewTransform.scale + viewTransform.offset.x;
  const screenY = cursor.y * viewTransform.scale + viewTransform.offset.y;

  const tone = TONES[cursor.tone];
  const Icon = tone.Icon;

  return (
    <div
      key={renderedNonce ?? "first"}
      className="pointer-events-none absolute inset-0 z-30"
      aria-hidden="true"
    >
      <div
        className="absolute"
        style={{
          left: `${screenX}px`,
          top: `${screenY}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Expanding pulse ring */}
        <span
          className={cn(
            "absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
            tone.ring,
          )}
          style={{ animation: "dv-ai-ping 900ms ease-out both" }}
        />
        {/* Solid dot at the exact point */}
        <span
          className={cn(
            "relative block size-2 rounded-full shadow-[0_0_0_3px_oklch(1_0_0/85%),0_0_8px_oklch(0_0_0/25%)]",
            tone.dot,
          )}
        />
        {/* Label pill, offset above-right so it doesn't overlap the dot */}
        <div
          className={cn(
            "absolute left-3 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[-0.005em] shadow-md whitespace-nowrap",
            tone.pill,
          )}
          style={{
            animation: "dv-ai-pop 900ms ease-out both",
          }}
        >
          <Sparkles className="size-2.5" strokeWidth={2.6} />
          <Icon className="size-2.5" strokeWidth={2.6} />
          {cursor.label}
        </div>
      </div>

      <style>{`
        @keyframes dv-ai-ping {
          0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.4); }
          25%  { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(2.4); }
        }
        @keyframes dv-ai-pop {
          0%   { opacity: 0; transform: translate(2px, -2px) scale(0.6); }
          20%  { opacity: 1; transform: translate(0, 0) scale(1); }
          85%  { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(0, 0) scale(1); }
        }
      `}</style>
    </div>
  );
}

type Tone = {
  ring: string;
  dot: string;
  pill: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

/**
 * One row per agent action tone. Each picks a unique color + Lucide icon
 * so the user can read what Claude is doing on the canvas at a glance.
 */
const TONES: Record<string, Tone> = {
  add: {
    ring: "ring-emerald-400/80 bg-emerald-400/15",
    dot: "bg-emerald-500",
    pill: "bg-emerald-500 text-white",
    Icon: MapPin,
  },
  move: {
    ring: "ring-indigo-400/80 bg-indigo-400/15",
    dot: "bg-indigo-500",
    pill: "bg-indigo-500 text-white",
    Icon: MousePointer2,
  },
  rotate: {
    ring: "ring-violet-400/80 bg-violet-400/15",
    dot: "bg-violet-500",
    pill: "bg-violet-500 text-white",
    Icon: RotateCw,
  },
  remove: {
    ring: "ring-rose-400/80 bg-rose-400/15",
    dot: "bg-rose-500",
    pill: "bg-rose-500 text-white",
    Icon: Trash2,
  },
  edit: {
    ring: "ring-amber-400/80 bg-amber-400/15",
    dot: "bg-amber-500",
    pill: "bg-amber-500 text-white",
    Icon: WandSparkles,
  },
  search: {
    ring: "ring-sky-400/80 bg-sky-400/15",
    dot: "bg-sky-500",
    pill: "bg-sky-500 text-white",
    Icon: Search,
  },
  annotate: {
    ring: "ring-yellow-400/80 bg-yellow-400/20",
    dot: "bg-yellow-500",
    pill: "bg-yellow-500 text-black",
    Icon: StickyNote,
  },
  wall: {
    ring: "ring-emerald-400/80 bg-emerald-400/15",
    dot: "bg-emerald-600",
    pill: "bg-emerald-600 text-white",
    Icon: PencilRuler,
  },
  door: {
    ring: "ring-cyan-400/80 bg-cyan-400/15",
    dot: "bg-cyan-500",
    pill: "bg-cyan-500 text-white",
    Icon: DoorOpen,
  },
  quote: {
    ring: "ring-teal-400/80 bg-teal-400/15",
    dot: "bg-teal-500",
    pill: "bg-teal-500 text-white",
    Icon: Receipt,
  },
  calibrate: {
    ring: "ring-fuchsia-400/80 bg-fuchsia-400/15",
    dot: "bg-fuchsia-500",
    pill: "bg-fuchsia-500 text-white",
    Icon: Ruler,
  },
};
