"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Compass, LogOut, Move3d, Sparkles, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LayerToggles } from "@/components/editor/LayerToggles";

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
            Drag to orbit · Scroll to zoom · Drag <User className="inline size-3" /> onto the scene to walk
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
    </div>
  );
}

/**
 * Draggable "Pegman" — modeled after Google Maps' character icon. The user
 * grabs the button and drops it onto the 3D scene. Scene3DCanvas catches the
 * `application/x-dv-pegman` dataTransfer type, raycasts to find the floor
 * world point, sets `walkSpawnOverride` to that point, and switches into
 * walk mode. Replaces the old "walk button" approach which just dumped the
 * user at a fixed corner of the floor.
 */
function Pegman() {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/x-dv-pegman", "1");
    e.dataTransfer.effectAllowed = "copy";

    // Custom drag image — a tinted character glyph so the cursor "carries"
    // a person instead of the button's row.
    const ghost = document.createElement("div");
    ghost.style.position = "fixed";
    ghost.style.top = "-1000px";
    ghost.style.left = "-1000px";
    ghost.style.width = "44px";
    ghost.style.height = "44px";
    ghost.style.borderRadius = "50%";
    ghost.style.background =
      "radial-gradient(circle at 50% 35%, #fef3c7 0%, #f59e0b 60%, #b45309 100%)";
    ghost.style.boxShadow = "0 8px 20px -6px rgba(0,0,0,0.4)";
    ghost.style.display = "flex";
    ghost.style.alignItems = "center";
    ghost.style.justifyContent = "center";
    ghost.style.color = "#451a03";
    ghost.style.fontWeight = "700";
    ghost.style.fontSize = "20px";
    ghost.style.fontFamily = "system-ui, sans-serif";
    ghost.textContent = "🚶";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 22, 22);
    window.setTimeout(() => ghost.remove(), 0);
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
              "flex size-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors",
              "hover:text-foreground hover:bg-accent",
              "cursor-grab active:cursor-grabbing",
            )}
            aria-label="Drag onto the scene to walk through the building"
          >
            <User className="size-4" />
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
