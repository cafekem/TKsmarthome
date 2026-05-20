"use client";

import { Boxes, Sparkles } from "lucide-react";

export function Scene3DPlaceholder() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[oklch(0.115_0_0)]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 50%, oklch(0.74 0.18 152 / 18%), transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bg-grid-fine pointer-events-none opacity-30" />
      <div className="relative max-w-md text-center px-8">
        <div className="inline-flex items-center justify-center rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
          <Boxes className="size-7 text-primary" />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight">
          3D world coming in milestone 3
        </h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Right now we&apos;re in <span className="font-mono">M0</span>: the project is
          scaffolded, the UI shell is up, and your designs already save to local
          storage.
          <br />
          Next up: 2D Konva canvas with drag-and-drop, then we extrude the same
          data into a real-time 3D scene you can orbit and walk through.
        </p>
        <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3 text-primary" />
          Toggle back to <span className="font-mono">2D</span> to preview the
          editor.
        </div>
      </div>
    </div>
  );
}
