"use client";

import { Circle, Group, Line, Rect, Text, Wedge } from "react-konva";
import type Konva from "konva";
import type { Device, Wall } from "@/types/design";
import type { KonvaEventObject } from "konva/lib/Node";
import { snapToNearestWall } from "@/lib/geometry";

/**
 * Devices that physically mount on a wall — when dragged near one,
 * the device snaps perpendicular to it. Ceiling-only devices (e.g.
 * domes hanging in mid-room) get no snap.
 */
const WALL_MOUNTABLE: Record<Device["type"], boolean> = {
  camera: true,
  reader: true,
  sensor: true,
  network: false, // APs ceiling-mounted, switches/NVRs rack-mounted
};

interface DeviceShapeProps {
  device: Device;
  scalePxPerMeter: number;
  selected: boolean;
  showCoverage: boolean;
  walls: Wall[];
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onRotate: (radians: number) => void;
}

const COLORS = {
  camera: "#3b82f6", // blue-500
  reader: "#0ea5e9", // sky-500
  sensor: "#f59e0b", // amber-500
  network: "#a78bfa", // violet-400
} as const;

/** Distinct colors for each lens in a multi-sensor camera */
const MULTI_SENSOR_COLORS = [
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#f97316", // orange
  "#e879f9", // pink
  "#facc15", // yellow
  "#10b981", // emerald
] as const;

export function DeviceShape({
  device,
  scalePxPerMeter,
  selected,
  showCoverage,
  walls,
  onSelect,
  onMove,
  onRotate,
}: DeviceShapeProps) {
  const color = COLORS[device.type];
  // Lifecycle stage drives a subtle opacity treatment so an installed
  // floor reads at full strength and proposed/retired devices look like
  // overlays. (Filtering happens upstream in Canvas2DStage via visibility.)
  const status = device.installStatus ?? "proposed";
  const groupOpacity =
    status === "decommissioned" ? 0.35 : status === "proposed" ? 0.78 : 1;
  const { x, y } = device.position;
  const rotation = device.rotation;
  const canSnap = WALL_MOUNTABLE[device.type] && walls.length > 0;
  // Snap threshold: ~0.7 m in design pixels. Walls within this distance
  // capture the cursor; anywhere else the device drags freely.
  const snapThresholdPx = Math.max(28, scalePxPerMeter * 0.7);
  const snapOffsetPx = Math.max(8, scalePxPerMeter * 0.18);

  function handleDragEnd(e: KonvaEventObject<DragEvent>) {
    const finalX = e.target.x();
    const finalY = e.target.y();
    if (canSnap) {
      const snap = snapToNearestWall(
        { x: finalX, y: finalY },
        walls,
        snapThresholdPx,
        snapOffsetPx,
      );
      if (snap) {
        // Position is already snapped via dragBoundFunc; just lock rotation.
        onMove(snap.position.x, snap.position.y);
        onRotate(snap.rotation);
        return;
      }
    }
    onMove(finalX, finalY);
  }

  return (
    <Group
      x={x}
      y={y}
      opacity={groupOpacity}
      draggable
      dragBoundFunc={
        canSnap
          ? (pos) => {
              const snap = snapToNearestWall(
                pos,
                walls,
                snapThresholdPx,
                snapOffsetPx,
              );
              return snap ? snap.position : pos;
            }
          : undefined
      }
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={handleDragEnd}
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "grab";
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "default";
      }}
    >
      {showCoverage && device.type === "camera" && device.lenses && device.lenses.length > 0
        ? device.lenses.map((lens, i) => {
            const lensRotation = rotation + lens.rotationOffset;
            return (
              <Wedge
                key={lens.id}
                x={0}
                y={0}
                radius={lens.rangeMeters * scalePxPerMeter}
                angle={lens.fovDegrees}
                rotation={(lensRotation * 180) / Math.PI - lens.fovDegrees / 2}
                fill={MULTI_SENSOR_COLORS[i % MULTI_SENSOR_COLORS.length]}
                opacity={selected ? 0.16 : 0.09}
                listening={false}
              />
            );
          })
        : showCoverage && device.type === "camera" && (
        <Wedge
          x={0}
          y={0}
          radius={device.rangeMeters * scalePxPerMeter}
          angle={device.fovDegrees}
          rotation={(rotation * 180) / Math.PI - device.fovDegrees / 2}
          fill={color}
          opacity={selected ? 0.16 : 0.09}
          listening={false}
        />
      )}

      {showCoverage && device.type === "sensor" && (
        <Circle
          x={0}
          y={0}
          radius={device.rangeMeters * scalePxPerMeter}
          stroke={color}
          strokeWidth={1.2}
          dash={[5, 4]}
          opacity={selected ? 0.45 : 0.25}
          listening={false}
        />
      )}

      {showCoverage &&
        device.type === "network" &&
        device.networkType === "access-point" && (
          <Circle
            x={0}
            y={0}
            radius={(device.coverageMeters ?? 15) * scalePxPerMeter}
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndRadius={
              (device.coverageMeters ?? 15) * scalePxPerMeter
            }
            fillRadialGradientColorStops={[0, `${color}55`, 1, `${color}00`]}
            listening={false}
          />
        )}

      {/* Soft outer halo on selection */}
      {selected && (
        <Circle
          x={0}
          y={0}
          radius={18}
          fill={color}
          opacity={0.12}
          listening={false}
        />
      )}
      {selected && (
        <Circle
          x={0}
          y={0}
          radius={16}
          stroke={color}
          strokeWidth={1.5}
          opacity={0.7}
          listening={false}
        />
      )}

      {/* Outer white ring — gives the marker a clean separation from any background */}
      <Circle x={0} y={0} radius={10} fill="#ffffff" opacity={0.95} listening={false} />
      {/* Body — colored circle */}
      <Circle x={0} y={0} radius={8.5} fill={color} listening={false} />

      {/* Direction indicator — refined notch */}
      <Line
        points={[
          Math.cos(rotation) * 8,
          Math.sin(rotation) * 8,
          Math.cos(rotation) * 14,
          Math.sin(rotation) * 14,
        ]}
        stroke={color}
        strokeWidth={2.5}
        lineCap="round"
        listening={false}
      />

      {/* Icon glyph - simple shape per type, now on colored body */}
      <DeviceGlyph type={device.type} />

      {/* Label — refined, smaller, more elegant */}
      <Group y={16}>
        {(() => {
          const padding = 7;
          const charWidth = 5.4;
          const textWidth = device.label.length * charWidth;
          const w = Math.max(40, textWidth + padding * 2);
          return (
            <>
              <Rect
                x={-w / 2}
                y={0}
                width={w}
                height={15}
                cornerRadius={4}
                fill="#1c1d20"
                opacity={0.92}
                listening={false}
              />
              <Text
                text={device.label}
                fontSize={9.5}
                fontStyle="500"
                fontFamily="Inter, system-ui, sans-serif"
                fill="#f4f4f5"
                align="center"
                width={w}
                x={-w / 2}
                y={3}
                letterSpacing={-0.1}
                listening={false}
              />
            </>
          );
        })()}
      </Group>

      {selected && (
        <RotationHandle
          rotation={rotation}
          onRotate={onRotate}
          color={color}
        />
      )}
    </Group>
  );
}

function DeviceGlyph({ type }: { type: Device["type"] }) {
  const fg = "#ffffff";
  if (type === "camera") {
    // Tiny lens dot at center
    return (
      <Group listening={false}>
        <Circle x={0} y={0} radius={2.4} fill={fg} opacity={0.95} />
        <Circle x={0} y={0} radius={1.1} fill="#1c1d20" />
      </Group>
    );
  }
  if (type === "reader") {
    // Card-shape inside
    return (
      <Group listening={false}>
        <Rect x={-2} y={-3} width={4} height={6} cornerRadius={0.8} fill={fg} opacity={0.95} />
      </Group>
    );
  }
  if (type === "sensor") {
    // Concentric pulse rings
    return (
      <Group listening={false}>
        <Circle x={0} y={0} radius={3.6} stroke={fg} strokeWidth={1} opacity={0.85} />
        <Circle x={0} y={0} radius={1.5} fill={fg} />
      </Group>
    );
  }
  // network — wifi dot
  return (
    <Group listening={false}>
      <Circle x={0} y={0} radius={1.6} fill={fg} />
      <Circle x={0} y={0} radius={3.6} stroke={fg} strokeWidth={1} opacity={0.7} />
    </Group>
  );
}

function RotationHandle({
  rotation,
  onRotate,
  color,
}: {
  rotation: number;
  onRotate: (radians: number) => void;
  color: string;
}) {
  const handleRadius = 32;
  const hx = Math.cos(rotation) * handleRadius;
  const hy = Math.sin(rotation) * handleRadius;

  return (
    <Group
      x={hx}
      y={hy}
      draggable
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "ew-resize";
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "default";
      }}
      onDragMove={(e) => {
        const node = e.target as Konva.Group;
        const px = node.x();
        const py = node.y();
        const newRotation = Math.atan2(py, px);
        node.position({
          x: Math.cos(newRotation) * handleRadius,
          y: Math.sin(newRotation) * handleRadius,
        });
        onRotate(newRotation);
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
      }}
      onClick={(e) => {
        e.cancelBubble = true;
      }}
    >
      <Line
        points={[-hx, -hy, 0, 0]}
        stroke={color}
        strokeWidth={1}
        opacity={0.5}
        dash={[3, 3]}
        listening={false}
      />
      <Circle radius={6} fill="#0f0f10" stroke={color} strokeWidth={1.5} />
      <Circle radius={2} fill={color} />
    </Group>
  );
}
