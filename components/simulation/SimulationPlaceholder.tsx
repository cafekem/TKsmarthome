"use client";

import { Play, Timer } from "lucide-react";

export function SimulationPlaceholder() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[oklch(0.115_0_0)]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 50%, oklch(0.65 0.22 25 / 12%), transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bg-grid-fine pointer-events-none opacity-30" />
      <div className="relative max-w-md text-center px-8">
        <div className="inline-flex items-center justify-center rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
          <Play className="size-7 text-rose-400" />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight">
          Threat simulation coming in milestone 5
        </h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Once cameras are placeable in 2D and renderable in 3D, you&apos;ll draw a
          threat path, hit play, and watch your coverage hold or break in real
          time. Cameras turn green when they see, red when they don&apos;t. After-
          action report at the end.
        </p>
        <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Timer className="size-3 text-primary" />
          Build progress lives in <span className="font-mono">PLAN.md</span>.
        </div>
      </div>
    </div>
  );
}
