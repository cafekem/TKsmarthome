"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Cable as CableIcon, ChevronLeft, ChevronRight, Compass, Eye, EyeOff, LogOut, Move3d, RotateCcw, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LayerToggles } from "@/components/editor/LayerToggles";
import { PegmanThumbnail } from "./PegmanThumbnail";

const Scene3DCanvas = dynamic(
  () => import("./Scene3DCanvas").then((m) => m.Scene3DCanvas),
  { ssr: false }
);

export function Scene3D({ showSim = false }: { showSim?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const floor = useActiveFloor();
  const threeDMode = useDesignStore((s) => s.threeDMode);
  const setThreeDMode = useDesignStore((s) => s.setThreeDMode);
  const tool = useDesignStore((s) => s.tool);
  const setTool = useDesignStore((s) => s.setTool);
  const showCoverage = useDesignStore((s) => s.showCoverage);
  const toggleCoverage = useDesignStore((s) => s.toggleCoverage);
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

      {/* Compact combined control panel — orbit + pegman + time-of-day all
          in one slim vertical strip so it doesn't dominate the top-left. */}
      <div className="pointer-events-none absolute left-3 top-3 z-20">
        <div className="pointer-events-auto rounded-lg border border-border bg-card/85 p-1 shadow-xl backdrop-blur">
          <div className="flex flex-col items-center gap-0.5">
            <ModeButton
              icon={Move3d}
              label="Orbit view"
              active={threeDMode === "orbit"}
              onClick={() => setThreeDMode("orbit")}
            />
            {/* Pegman — drag onto the 3D scene to drop in there as a
                first-person walker (Google-Maps-style) */}
            {!isEmpty && <Pegman />}
            {!isEmpty && threeDMode === "orbit" && (
              <>
                <div className="my-1 h-px w-6 bg-border/70" />
                {/* Coverage toggle — used to live in the top bar, moved
                    here so all scene-rendering toggles are in one place. */}
                <TimeButton
                  icon={showCoverage ? Eye : EyeOff}
                  label={
                    showCoverage
                      ? "Hide camera coverage"
                      : "Show camera coverage"
                  }
                  active={showCoverage}
                  onClick={() => toggleCoverage()}
                />
                {/* Wire tool — click source device, then target. Shift-
                    click the floor to drop a bend. Esc cancels. Day /
                    Sunset toggle moved to the gear menu in the top bar. */}
                <TimeButton
                  icon={CableIcon}
                  label="Wire (click source device, then target)"
                  active={tool === "wire"}
                  onClick={() => setTool(tool === "wire" ? "select" : "wire")}
                />
              </>
            )}
          </div>
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

          {/* Pan controls — only for cameras that physically swivel in
              real life. Lets the operator sweep across a dome / fisheye /
              multi-sensor's wide coverage one frame at a time instead of
              cramming it all into a distorted single view. */}
          {povTarget.type === "camera" && canCameraPan(povTarget.cameraType) && (
            <PovPanControls />
          )}

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

/** Which camera subtypes have a physical/PTZ pan we should expose as
 *  manual ◀/▶ arrows in POV. Fixed/bullet/lpr stay nailed to their
 *  mount heading. */
function canCameraPan(subtype: string | undefined): boolean {
  return (
    subtype === "dome" ||
    subtype === "fisheye" ||
    subtype === "multi-sensor" ||
    subtype === "ptz"
  );
}

/**
 * Twin pan arrows (◀ + ▶) at the left + right edges of the POV
 * viewfinder, plus a tiny "recenter" pill at the bottom. Each click
 * nudges the camera's heading by ±10°. Holding ⌘/Ctrl while clicking
 * makes the step ±30° for fast sweeping.
 *
 * Sits above the viewfinder chrome (z-30) so the arrows are clickable
 * even though the chrome itself is pointer-events:none.
 */
function PovPanControls() {
  const nudgeCameraPovPan = useDesignStore((s) => s.nudgeCameraPovPan);
  const panOffset = useDesignStore((s) => s.cameraPovPanOffset);
  const STEP = (10 * Math.PI) / 180;
  const FAST = (30 * Math.PI) / 180;
  const degrees = Math.round((panOffset * 180) / Math.PI);

  function pan(direction: -1 | 1, e: React.MouseEvent) {
    const step = e.metaKey || e.ctrlKey ? FAST : STEP;
    nudgeCameraPovPan(direction * step);
  }

  function recenter() {
    // Re-set absolute: nudge by `-current` so we land exactly at 0.
    nudgeCameraPovPan(-panOffset);
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => pan(-1, e)}
        title="Pan left (⌘/Ctrl for larger step)"
        aria-label="Pan camera left"
        className="pointer-events-auto absolute left-8 top-1/2 z-30 -translate-y-1/2 inline-flex size-12 items-center justify-center rounded-full border border-rose-500/40 bg-black/55 text-white shadow-[0_8px_28px_-6px_oklch(0_0_0/55%)] backdrop-blur transition-all hover:bg-black/75 hover:border-rose-400/70 hover:scale-105 active:scale-95"
      >
        <ChevronLeft className="size-6" strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={(e) => pan(1, e)}
        title="Pan right (⌘/Ctrl for larger step)"
        aria-label="Pan camera right"
        className="pointer-events-auto absolute right-8 top-1/2 z-30 -translate-y-1/2 inline-flex size-12 items-center justify-center rounded-full border border-rose-500/40 bg-black/55 text-white shadow-[0_8px_28px_-6px_oklch(0_0_0/55%)] backdrop-blur transition-all hover:bg-black/75 hover:border-rose-400/70 hover:scale-105 active:scale-95"
      >
        <ChevronRight className="size-6" strokeWidth={2.4} />
      </button>
      {/* Recenter pill — shows current pan angle, lets the user snap
          back to the device's mounted heading. Hidden when offset = 0. */}
      {Math.abs(panOffset) > 0.001 && (
        <button
          type="button"
          onClick={recenter}
          title="Recenter to spec heading"
          className="pointer-events-auto absolute left-1/2 bottom-7 z-30 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[0.72rem] font-mono text-white shadow-lg backdrop-blur transition-colors hover:bg-black/80"
        >
          <RotateCcw className="size-3" strokeWidth={2.2} />
          {degrees > 0 ? `+${degrees}°` : `${degrees}°`} · recenter
        </button>
      )}
    </>
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
 * simulator's walking subject uses).
 *
 * We use POINTER EVENTS instead of HTML5 drag-and-drop so the cursor
 * carries a LIVE 3D canvas (not a static PNG snapshot). The native drag
 * image API locks the preview at dragstart, so it can never animate.
 * With pointer events we render a fixed-position portal'd PegmanThumbnail
 * that follows the cursor in real time, and on pointerup we dispatch a
 * custom event so Scene3DCanvas can raycast the drop point.
 *
 * Drop the cursor anywhere on the 3D scene → Scene3DCanvas listens for
 * the custom 'dv-pegman-drop' event, raycasts to the floor, sets
 * walkSpawnOverride, and switches into walk mode.
 */
function Pegman() {
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  // Track pointer movement while dragging. Listening at the window level
  // means we keep tracking even when the cursor leaves the button.
  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      setPos({ x: e.clientX, y: e.clientY });
    }
    function onUp(e: PointerEvent) {
      // Find the topmost element under the cursor and check whether it
      // (or an ancestor) is the 3D scene's drop zone. We tag the scene's
      // container with data-dv-scene3d-drop so the lookup is robust to
      // future DOM changes.
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const sceneDrop = el?.closest("[data-dv-scene3d-drop]");
      if (sceneDrop) {
        window.dispatchEvent(
          new CustomEvent("dv-pegman-drop", {
            detail: { clientX: e.clientX, clientY: e.clientY },
          }),
        );
      }
      draggingRef.current = false;
      setDragging(false);
    }
    function onCancel() {
      draggingRef.current = false;
      setDragging(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [dragging]);

  function handlePointerDown(e: React.PointerEvent) {
    // Only respond to primary-button (left mouse / touch). Avoid
    // hijacking right-click or middle-click.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
    draggingRef.current = true;
    setDragging(true);
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onPointerDown={handlePointerDown}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border border-transparent transition-colors",
                "hover:bg-accent",
                "cursor-grab active:cursor-grabbing overflow-hidden",
                "select-none touch-none",
              )}
              style={{ touchAction: "none" }}
              aria-label="Drag onto the scene to walk through the building"
            >
              {/* The button itself stays mounted with its own 3D canvas so
                  it visibly stays "the avatar's home" even while the user
                  is dragging a portal'd copy around. */}
              <PegmanThumbnail />
            </button>
          }
        />
        <TooltipContent side="right">
          Drag onto the scene to walk
        </TooltipContent>
      </Tooltip>

      {/* Live 3D Pegman floating at the cursor while dragging. Portal'd to
          <body> so it can escape any sidebar overflow:hidden, and
          pointer-events:none so document.elementFromPoint can see the
          scene canvas underneath. */}
      {dragging &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-[9999]"
            style={{
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, -50%)",
              width: 64,
              height: 64,
              filter: "drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35))",
            }}
          >
            <PegmanThumbnail />
          </div>,
          document.body,
        )}
    </>
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
              "flex size-7 items-center justify-center rounded-md border transition-colors",
              active
                ? "border-primary bg-primary/20 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact icon-only toggle for the time-of-day picker. Same footprint as
 * ModeButton so the whole panel reads as one cohesive control strip.
 */
function TimeButton({
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
              "flex size-7 items-center justify-center rounded-md border transition-colors",
              active
                ? "border-amber-400/50 bg-amber-400/15 text-amber-500"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Empty state for the 3D scene — heading + two primary actions, nothing more.
 * Kept intentionally minimal so the canvas reads as a clean starting surface.
 */
function EmptyState() {
  const setAISurveyOpen = useDesignStore((s) => s.setAISurveyOpen);
  const loadDemo = useDesignStore((s) => s.loadDemo);
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-6 px-8 text-center">
        <h3 className="text-[1.45rem] font-semibold tracking-[-0.02em]">
          Your 3D scene is empty
        </h3>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAISurveyOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-[0.92rem] font-medium text-foreground btn-lift hover:bg-foreground/[0.04]"
          >
            <Upload className="size-4" strokeWidth={2} />
            Upload floor plan
          </button>
          </div>
      </div>
    </div>
  );
}
