"use client";

import { useEffect, useState } from "react";
import { MapPin, Move, Plus, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { useDesignStore, type ViewTransform } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  /** Stage transform — the chat reports world-space pixels, we need screen-space. */
  viewTransform: ViewTransform;
}

/**
 * Floating overlay rendered above the Konva Stage. Reads `aiCursor` from
 * the store (set transiently by the chat panel as operations stream in)
 * and animates a labelled "Claude is working here" marker at the target
 * point in screen space.
 *
 * The marker has three parts:
 *   • An expanding pulse ring (the agent "lands")
 *   • A pinned dot
 *   • A pill label with an action verb and the action icon
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

  // World → screen conversion: same transform Konva applies to the Stage.
  const screenX = cursor.x * viewTransform.scale + viewTransform.offset.x;
  const screenY = cursor.y * viewTransform.scale + viewTransform.offset.y;

  const Icon =
    cursor.tone === "add"
      ? Plus
      : cursor.tone === "move"
        ? Move
        : cursor.tone === "remove"
          ? Trash2
          : cursor.tone === "edit"
            ? WandSparkles
            : MapPin;

  const ringColor =
    cursor.tone === "add"
      ? "ring-emerald-400/80 bg-emerald-400/15"
      : cursor.tone === "remove"
        ? "ring-rose-400/80 bg-rose-400/15"
        : cursor.tone === "move"
          ? "ring-sky-400/80 bg-sky-400/15"
          : cursor.tone === "edit"
            ? "ring-amber-400/80 bg-amber-400/15"
            : "ring-primary/80 bg-primary/15";

  const dotColor =
    cursor.tone === "add"
      ? "bg-emerald-500"
      : cursor.tone === "remove"
        ? "bg-rose-500"
        : cursor.tone === "move"
          ? "bg-sky-500"
          : cursor.tone === "edit"
            ? "bg-amber-500"
            : "bg-primary";

  const pillColor =
    cursor.tone === "add"
      ? "bg-emerald-500 text-white"
      : cursor.tone === "remove"
        ? "bg-rose-500 text-white"
        : cursor.tone === "move"
          ? "bg-sky-500 text-white"
          : cursor.tone === "edit"
            ? "bg-amber-500 text-white"
            : "bg-primary text-primary-foreground";

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
            ringColor,
          )}
          style={{ animation: "dv-ai-ping 900ms ease-out both" }}
        />
        {/* Solid dot at the exact point */}
        <span
          className={cn(
            "relative block size-2 rounded-full shadow-[0_0_0_3px_oklch(1_0_0/85%),0_0_8px_oklch(0_0_0/25%)]",
            dotColor,
          )}
        />
        {/* Label pill, offset above-right so it doesn't overlap the dot */}
        <div
          className={cn(
            "absolute left-3 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[-0.005em] shadow-md whitespace-nowrap",
            pillColor,
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

      {/* Local keyframes — scoped to this overlay. */}
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
