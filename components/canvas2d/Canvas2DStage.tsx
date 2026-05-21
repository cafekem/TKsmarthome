"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Image as KImage, Layer, Line, Stage, Text } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { toast } from "sonner";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import type { DeviceType, Vec2 } from "@/types/design";
import { getProduct } from "@/lib/catalog";
import { distance, screenToDesign, snapToNearestWall } from "@/lib/geometry";
import { useImage } from "./useImage";
import { DeviceShape } from "./DeviceShape";

interface Canvas2DStageProps {
  width: number;
  height: number;
  onRequestUpload: () => void;
}

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 5;
const WALL_HIT_RADIUS = 12;

export function Canvas2DStage({
  width,
  height,
  onRequestUpload,
}: Canvas2DStageProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const floor = useActiveFloor();
  const tool = useDesignStore((s) => s.tool);
  const setTool = useDesignStore((s) => s.setTool);
  const showCoverage = useDesignStore((s) => s.showCoverage);
  const selectedId = useDesignStore((s) => s.selectedDeviceId);
  const selectDevice = useDesignStore((s) => s.selectDevice);
  const addDevice = useDesignStore((s) => s.addDevice);
  const updateDevice = useDesignStore((s) => s.updateDevice);
  const removeDevice = useDesignStore((s) => s.removeDevice);
  const addWall = useDesignStore((s) => s.addWall);
  const updateFloor = useDesignStore((s) => s.updateFloor);
  const viewTransform = useDesignStore((s) => s.viewTransform);
  const setViewTransform = useDesignStore((s) => s.setViewTransform);

  const planImage = useImage(floor?.planImage ?? null);

  // Wall drawing transient state
  const [wallPoints, setWallPoints] = useState<Vec2[]>([]);
  const [pendingCursor, setPendingCursor] = useState<Vec2 | null>(null);

  // Calibration transient state
  const [calibrationPoints, setCalibrationPoints] = useState<Vec2[]>([]);
  const [pendingCalibration, setPendingCalibration] = useState<
    { a: Vec2; b: Vec2 } | null
  >(null);

  // AI survey dialog open/close lives in the design store so it's reachable
  // from anywhere (TopBar, empty state, etc.)
  const setAISurveyOpen = useDesignStore((s) => s.setAISurveyOpen);

  // Fit-on-load: when we load a floor or its image, center the content.
  useEffect(() => {
    if (!floor) return;
    if (viewTransform.scale === 1 && viewTransform.offset.x === 0 && viewTransform.offset.y === 0) {
      fitToContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor?.id, planImage]);

  function fitToContent() {
    if (!floor) return;
    let bounds = { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    if (planImage) {
      bounds = { minX: 0, minY: 0, maxX: planImage.naturalWidth, maxY: planImage.naturalHeight };
    } else if (floor.devices.length > 0 || floor.walls.length > 0) {
      const xs = [
        ...floor.devices.map((d) => d.position.x),
        ...floor.walls.flatMap((w) => [w.start.x, w.end.x]),
      ];
      const ys = [
        ...floor.devices.map((d) => d.position.y),
        ...floor.walls.flatMap((w) => [w.start.y, w.end.y]),
      ];
      if (xs.length) {
        bounds = {
          minX: Math.min(...xs) - 80,
          minY: Math.min(...ys) - 80,
          maxX: Math.max(...xs) + 80,
          maxY: Math.max(...ys) + 80,
        };
      }
    }
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    const scale = Math.min(
      width / Math.max(bw, 1),
      height / Math.max(bh, 1),
      1.5
    );
    setViewTransform({
      scale,
      offset: {
        x: width / 2 - (bounds.minX + bw / 2) * scale,
        y: height / 2 - (bounds.minY + bh / 2) * scale,
      },
    });
  }

  const getDesignPoint = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return screenToDesign({
        client: { x: clientX, y: clientY },
        containerRect: rect,
        transform: viewTransform,
      });
    },
    [viewTransform]
  );

  function onWheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const oldScale = viewTransform.scale;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - viewTransform.offset.x) / oldScale,
      y: (pointer.y - viewTransform.offset.y) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const factor = 1.1;
    const newScale = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, direction > 0 ? oldScale / factor : oldScale * factor)
    );
    setViewTransform({
      scale: newScale,
      offset: {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      },
    });
  }

  function onStageClick(e: KonvaEventObject<MouseEvent>) {
    if (e.target !== e.target.getStage()) return;
    const point = getDesignPoint(e.evt.clientX, e.evt.clientY);

    if (tool === "wall") {
      const next = [...wallPoints, point];
      setWallPoints(next);
      if (next.length >= 2 && floor) {
        const start = next[next.length - 2];
        const end = next[next.length - 1];
        addWall(floor.id, { start, end, height: 2.7 });
      }
      return;
    }

    if (tool === "calibrate") {
      const nextPoints = [...calibrationPoints, point];
      if (nextPoints.length === 2) {
        setCalibrationPoints([]);
        setPendingCalibration({ a: nextPoints[0], b: nextPoints[1] });
      } else {
        setCalibrationPoints(nextPoints);
      }
      return;
    }

    // Select tool: clicking background clears selection
    selectDevice(null);
  }

  function onStageMouseMove(e: KonvaEventObject<MouseEvent>) {
    if (tool === "wall" && wallPoints.length > 0) {
      const p = getDesignPoint(e.evt.clientX, e.evt.clientY);
      setPendingCursor(p);
    } else if (pendingCursor) {
      setPendingCursor(null);
    }
  }

  function onContainerDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!floor) return;
    const raw = e.dataTransfer.getData("application/x-dv-device");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { type: DeviceType; catalogId?: string };
      const point = getDesignPoint(e.clientX, e.clientY);
      const product = payload.catalogId ? getProduct(payload.catalogId) : undefined;

      // Wall-snap on drop: if the user dropped near a wall and the device
      // type is wall-mountable, place it on the wall and orient it perpendicular.
      const wallMountable =
        payload.type === "camera" ||
        payload.type === "reader" ||
        payload.type === "sensor";
      let finalPoint = point;
      let finalRotation: number | undefined = undefined;
      if (wallMountable && floor.walls.length > 0) {
        const snapThresholdPx = Math.max(28, floor.scale * 0.7);
        const snap = snapToNearestWall(
          point,
          floor.walls,
          snapThresholdPx,
          Math.max(8, floor.scale * 0.18),
        );
        if (snap) {
          finalPoint = snap.position;
          finalRotation = snap.rotation;
        }
      }

      const created = addDevice(floor.id, payload.type, finalPoint, product);
      if (finalRotation !== undefined && created?.id) {
        updateDevice(floor.id, created.id, { rotation: finalRotation });
      }
    } catch {
      // ignore
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;

      if (e.key === "Escape") {
        if (tool !== "select") setTool("select");
        setWallPoints([]);
        setCalibrationPoints([]);
        selectDevice(null);
      } else if (e.key === "Enter" && tool === "wall") {
        setWallPoints([]);
        setTool("select");
      } else if (e.key === "v" || e.key === "V") {
        setTool("select");
      } else if (e.key === "w" || e.key === "W") {
        setTool("wall");
      } else if (e.key === "c" || e.key === "C") {
        setTool("calibrate");
        toast.message("Calibration", {
          description: "Click two points whose real distance you know.",
        });
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        if (floor) removeDevice(floor.id, selectedId);
      } else if (e.key === "f" || e.key === "F") {
        fitToContent();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, selectedId, floor?.id]);

  const scalePxPerMeter = floor?.scale ?? 50;

  const cursorStyle = useMemo(() => {
    if (tool === "wall" || tool === "calibrate") return "crosshair";
    return "default";
  }, [tool]);

  if (!floor) return null;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-canvas bg-grid"
      style={{ cursor: cursorStyle }}
      onDrop={onContainerDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
    >
      {/* Atmospheric wash — subtle blue radial vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 35%, color-mix(in oklch, var(--primary) 5%, transparent) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />
      {/* Edge fade — slight darkening at the outer edges adds depth */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 95% 95% at 50% 50%, transparent 55%, rgba(0,0,0,0.04) 100%)",
        }}
        aria-hidden="true"
      />
      {!planImage && floor.devices.length === 0 && floor.walls.length === 0 && (
        <FloorPlanEmptyState
          onUpload={onRequestUpload}
          onGenerateAI={() => setAISurveyOpen(true)}
          onLoadDemo={() => {
            useDesignStore.getState().loadDemo();
            toast.success("Demo office loaded", {
              description:
                "Twelve walls, ten devices. Flip to 3D to see the building extrude.",
            });
          }}
        />
      )}

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={viewTransform.scale}
        scaleY={viewTransform.scale}
        x={viewTransform.offset.x}
        y={viewTransform.offset.y}
        draggable={tool === "select"}
        onWheel={onWheel}
        onClick={onStageClick}
        onMouseMove={onStageMouseMove}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setViewTransform({
              scale: viewTransform.scale,
              offset: { x: e.target.x(), y: e.target.y() },
            });
          }
        }}
      >
        <Layer>
          {planImage && (
            <KImage
              image={planImage}
              x={0}
              y={0}
              opacity={0.85}
              listening={false}
            />
          )}

          {/* Walls */}
          {floor.walls.map((wall) => (
            <Line
              key={wall.id}
              points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
              stroke="#94a3b8"
              strokeWidth={3}
              lineCap="round"
              opacity={0.85}
              listening={false}
            />
          ))}

          {/* Wall drawing preview */}
          {tool === "wall" && wallPoints.length > 0 && pendingCursor && (
            <Line
              points={[
                wallPoints[wallPoints.length - 1].x,
                wallPoints[wallPoints.length - 1].y,
                pendingCursor.x,
                pendingCursor.y,
              ]}
              stroke="#3b82f6"
              strokeWidth={3}
              lineCap="round"
              dash={[6, 6]}
              opacity={0.7}
              listening={false}
            />
          )}

          {/* Calibration preview */}
          {tool === "calibrate" && calibrationPoints.length === 1 && (
            <Circle
              x={calibrationPoints[0].x}
              y={calibrationPoints[0].y}
              radius={6}
              fill="#3b82f6"
              listening={false}
            />
          )}

          {/* Devices */}
          {floor.devices.map((device) => (
            <DeviceShape
              key={device.id}
              device={device}
              scalePxPerMeter={scalePxPerMeter}
              selected={device.id === selectedId}
              showCoverage={showCoverage}
              walls={floor.walls}
              onSelect={() => selectDevice(device.id)}
              onMove={(x, y) =>
                updateDevice(floor.id, device.id, { position: { x, y } })
              }
              onRotate={(r) =>
                updateDevice(floor.id, device.id, { rotation: r })
              }
            />
          ))}
        </Layer>
      </Stage>

      {pendingCalibration && (
        <CalibrationPrompt
          a={pendingCalibration.a}
          b={pendingCalibration.b}
          currentScale={floor.scale}
          onCancel={() => {
            setPendingCalibration(null);
            setTool("select");
          }}
          onApply={(meters) => {
            const px = distance(pendingCalibration.a, pendingCalibration.b);
            const newScale = px / meters;
            updateFloor(floor.id, { scale: newScale });
            setPendingCalibration(null);
            setTool("select");
            toast.success("Scale updated", {
              description: `${newScale.toFixed(1)} px / m`,
            });
          }}
        />
      )}
    </div>
  );
}

function FloorPlanEmptyState({
  onUpload,
  onLoadDemo,
  onGenerateAI,
}: {
  onUpload: () => void;
  onLoadDemo: () => void;
  onGenerateAI: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      {/* Decorative blueprint outline — establishes context without a "card" */}
      <svg
        viewBox="0 0 600 360"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-auto h-[68%] max-h-[460px] w-auto opacity-[0.18] dark:opacity-[0.22]"
      >
        <defs>
          <linearGradient id="bp-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {/* outer walls */}
        <path
          d="M40 60 L40 320 L560 320 L560 60 Z"
          stroke="url(#bp-stroke)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* interior walls */}
        <path
          d="M240 60 L240 200 M40 200 L240 200 M340 200 L560 200 M340 200 L340 320 M440 60 L440 200"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />
        {/* a door swing */}
        <path
          d="M240 180 A20 20 0 0 1 260 200"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.55"
          fill="none"
        />
        {/* devices as small circles */}
        <circle cx="140" cy="130" r="3.5" fill="currentColor" opacity="0.7" />
        <circle cx="380" cy="120" r="3.5" fill="currentColor" opacity="0.7" />
        <circle cx="500" cy="260" r="3.5" fill="currentColor" opacity="0.7" />
        <circle cx="150" cy="270" r="3.5" fill="currentColor" opacity="0.7" />
        {/* faint FOV cone */}
        <path
          d="M140 130 L80 80 A78 78 0 0 1 200 80 Z"
          fill="currentColor"
          opacity="0.08"
        />
      </svg>

      {/* Content — no card border, just confident typography + actions */}
      <div className="pointer-events-auto relative flex max-w-md flex-col items-center gap-7 px-8 text-center">
        <div className="space-y-3">
          <div className="text-[1.35rem] font-semibold tracking-[-0.02em] text-foreground">
            Your canvas is ready
          </div>
          <div className="mx-auto max-w-[22rem] text-[0.92rem] leading-[1.55] text-muted-foreground">
            Let AI design from a floor plan, draw walls yourself, or open the
            demo office to see a finished design.
          </div>
        </div>
        <div className="flex flex-col items-center gap-2.5">
          {/* Primary CTA — the killer feature */}
          <button
            type="button"
            onClick={onGenerateAI}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[0.92rem] font-medium text-primary-foreground btn-lift shadow-[0_10px_28px_-10px_oklch(0.55_0.17_245/55%)] hover:bg-primary/90"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-4"
              aria-hidden="true"
            >
              <path d="M12 2l2.39 5.69L20 8.59l-4 4.13.96 5.78L12 15.77 7.04 18.5 8 12.72l-4-4.13 5.61-.9L12 2z" />
            </svg>
            Generate with AI
          </button>
          {/* Secondary actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onUpload}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5"
              >
                <path d="M12 5v14M5 12l7-7 7 7" />
              </svg>
              Upload plan
            </button>
            <span className="text-muted-foreground/40" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              Try the demo
            </button>
          </div>
        </div>
        <div className="mt-1 text-[0.72rem] text-muted-foreground/70">
          You can also drag a device from the library to start with.
        </div>
      </div>
    </div>
  );
}

function CalibrationPrompt({
  a,
  b,
  currentScale,
  onApply,
  onCancel,
}: {
  a: Vec2;
  b: Vec2;
  currentScale: number;
  onApply: (meters: number) => void;
  onCancel: () => void;
}) {
  const px = distance(a, b);
  const inferredMeters = px / currentScale;
  const [meters, setMeters] = useStateLocal(inferredMeters.toFixed(2));

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="w-[360px] rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="text-sm font-semibold tracking-tight">
          Set the scale
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          You picked two points {px.toFixed(1)} px apart. How far apart are they
          in real-world meters?
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={meters}
            onChange={(e) => setMeters(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <span className="font-mono text-sm text-muted-foreground">m</span>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const v = parseFloat(meters);
              if (!isNaN(v) && v > 0) onApply(v);
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply scale
          </button>
        </div>
      </div>
    </div>
  );
}

function useStateLocal(initial: string) {
  const [v, setV] = useState(initial);
  return [v, setV] as const;
}
