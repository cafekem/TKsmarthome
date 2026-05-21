"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Compass, Eye, LogOut, Move3d, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LayerToggles } from "@/components/editor/LayerToggles";
import {
  PegmanThumbnail,
  type PegmanThumbnailHandle,
} from "./PegmanThumbnail";

const Scene3DCanvas = dynamic(
  () => import("./Scene3DCanvas").then((m) => m.Scene3DCanvas),
  { ssr: false }
);

export function Scene3D({ showSim = false }: { showSim?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const floor = useActiveFloor();
  const showCoverage = useDesignStore((s) => s.showCoverage);
  const toggleCoverage = useDesignStore((s) => s.toggleCoverage);
  const threeDMode = useDesignStore((s) => s.threeDMode);
  const setThreeDMode = useDesignStore((s) => s.setThreeDMode);
  const cameraPovTargetId = useDesignStore((s) => s.cameraPovTargetId);
  const exitCameraPov = useDesignStore((s) => s.exitCameraPov);
  const povTarget = floor?.devices.find(
    (d) => d.id === cameraPovTargetId && d.type === "camera",
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const isEmpty =
    !floor || (floor.devices.length === 0 && floor.walls.length === 0);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-canvas"
    >
      {size.width > 0 && size.height > 0 && !isEmpty && (
        <Scene3DCanvas
          width={size.width}
          height={size.height}
          showSim={showSim}
        />
      )}

      {isEmpty && <EmptyState />}

      {!isEmpty && <LayerToggles />}

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-1.5">
        <div className="pointer-events-auto rounded-xl border border-border bg-card/85 p-1.5 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-1">
            <ModeButton
              icon={Move3d}
              label="Orbit view"
              active={threeDMode === "orbit"}
              onClick={() => setThreeDMode("orbit")}
            />
            {/* Pegman — drag onto the 3D scene to drop in there as a
                first-person walker (Google-Maps-style) */}
            {!isEmpty && <Pegman />}
          </div>
          <div className="my-1 h-px w-full bg-border/60" />
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={toggleCoverage}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border transition-colors",
                    showCoverage
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Sparkles className="size-4" />
                </button>
              }
            />
            <TooltipContent side="right">
              {showCoverage ? "Hide coverage" : "Show coverage"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {threeDMode === "orbit" && !isEmpty && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Compass className="size-3.5 text-primary" />
          <span>
            Drag to orbit · Scroll to zoom · Drag the character onto the scene to walk
          </span>
        </div>
      )}

      {threeDMode === "walk" && (
        <button
          type="button"
          onClick={() => setThreeDMode("orbit")}
          className="pointer-events-auto absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[0.78rem] font-medium text-background shadow-lg hover:bg-foreground/85"
        >
          <LogOut className="size-3.5" />
          Exit walk
        </button>
      )}

      {threeDMode === "pov" && povTarget && (
        <>
          {/* Faux camera-viewfinder frame so the POV reads as "through a
              lens" instead of a regular 3D view. */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute inset-4 border-2 border-rose-500/70 rounded-sm shadow-[inset_0_0_40px_oklch(0_0_0/35%)]" />
            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
            {/* Corner marks */}
            <CornerMark className="top-3 left-3" />
            <CornerMark className="top-3 right-3" rotate={90} />
            <CornerMark className="bottom-3 right-3" rotate={180} />
            <CornerMark className="bottom-3 left-3" rotate={270} />
            {/* Recording dot */}
            <div className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-rose-300">
              <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
              REC · POV
            </div>
            {/* Label */}
            <div className="absolute left-6 bottom-6 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[11px] font-mono text-white">
              <Eye className="size-3 text-rose-300" strokeWidth={2.2} />
              {povTarget.label} · {povTarget.type === "camera" ? `${povTarget.fovDegrees}° FOV` : ""}
            </div>
          </div>

          <button
            type="button"
            onClick={() => exitCameraPov()}
            className="pointer-events-auto absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[0.78rem] font-medium text-background shadow-lg hover:bg-foreground/85"
          >
            <LogOut className="size-3.5" />
            Exit POV
          </button>
        </>
      )}
    </div>
  );
}

/** Small corner bracket in the POV viewfinder frame. */
function CornerMark({ className, rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <div
      className={cn("absolute size-5", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span className="absolute left-0 top-0 h-px w-4 bg-rose-500/80" />
      <span className="absolute left-0 top-0 h-4 w-px bg-rose-500/80" />
    </div>
  );
}

/**
 * Draggable "Pegman" — modeled after Google Maps' character icon. The
 * button itself renders the actual 3D Pegman character (same model the
 * simulator's walking subject uses), and on drag start we snapshot that
 * canvas to a PNG data URL so the cursor carries the real 3D character
 * — not a flat icon or emoji.
 *
 * Drop the cursor anywhere on the 3D scene → Scene3DCanvas raycasts to
 * find the floor world point, sets walkSpawnOverride, and switches into
 * walk mode.
 */
function Pegman() {
  const thumbnailRef = useRef<PegmanThumbnailHandle>(null);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/x-dv-pegman", "1");
    e.dataTransfer.effectAllowed = "copy";

    // Snapshot the live 3D thumbnail to a PNG and use that as the drag
    // image. The cursor visually carries the real character (orange cap,
    // cyan shirt, navy pants — same as the simulation walker) instead of
    // a flat lucide icon.
    const dataUrl = thumbnailRef.current?.snapshot();
    if (dataUrl) {
      const img = new Image();
      img.src = dataUrl;
      // Slight enlargement so the drag cursor reads at a comfortable size
      // even though the button itself is 36×36.
      img.style.position = "fixed";
      img.style.top = "-1000px";
      img.style.left = "-1000px";
      img.style.width = "64px";
      img.style.height = "64px";
      img.style.filter = "drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35))";
      document.body.appendChild(img);
      e.dataTransfer.setDragImage(img, 32, 32);
      window.setTimeout(() => img.remove(), 0);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            draggable
            onDragStart={handleDragStart}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border border-transparent transition-colors",
              "hover:bg-accent",
              "cursor-grab active:cursor-grabbing overflow-hidden",
            )}
            aria-label="Drag onto the scene to walk through the building"
          >
            <PegmanThumbnail ref={thumbnailRef} />
          </button>
        }
      />
      <TooltipContent side="right">
        Drag onto the scene to walk
      </TooltipContent>
    </Tooltip>
  );
}

function ModeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border transition-colors",
              active
                ? "border-primary bg-primary/20 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="size-4" />
          </button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function EmptyState() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="max-w-md text-center px-8">
        <div className="inline-flex items-center justify-center rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
          <Box className="size-7 text-primary" />
        </div>
        <h3 className="mt-5 text-2xl font-medium tracking-[-0.01em]">
          Place something in 2D first
        </h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Switch back to <span className="font-mono">2D</span>, draw a wall or
          drag a camera onto the canvas, then come back here. Your design will
          extrude into the world in real time.
        </p>
      </div>
    </div>
  );
}
