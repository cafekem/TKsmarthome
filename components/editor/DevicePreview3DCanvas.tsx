"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import * as THREE from "three";
import { DeviceMesh } from "@/components/scene3d/DeviceMesh";
import type {
  CameraDevice,
  Device,
  NetworkDeviceBase,
  ReaderDevice,
  SensorDevice,
} from "@/types/design";

/**
 * Small auto-rotating 3D preview of a device, used in the device-library
 * sidebar. Uses the exact same DeviceMesh that gets placed in the building
 * so the library preview never lies about what you're dropping.
 *
 * Each device subtype gets its own:
 *   - tinted background (so each card has a clear color identity)
 *   - camera angle (so the most-recognizable face of the device — dome
 *     bottom, bullet lens, reader pad, NVR front — faces the viewer)
 *   - rim light tinted to the device's accent
 */

export type PreviewKind =
  | { type: "camera"; subtype: "dome" | "ptz" | "fixed" | "fisheye" }
  | { type: "reader"; subtype: "card" | "biometric" | "keypad" }
  | {
      type: "sensor";
      subtype: "motion" | "glass-break" | "door-contact" | "smoke";
    }
  | { type: "network"; subtype: "switch" | "access-point" | "nvr" };

const ACCENT_COLORS = {
  camera: "#10b981", // emerald 500
  reader: "#0ea5e9", // sky 500
  sensor: "#f59e0b", // amber 500
  network: "#8b5cf6", // violet 500
} as const;

// Soft pastel tints used as the canvas background per device type — works
// well in both light and dark UI themes because the device meshes are dark.
const BACKGROUND_TINTS = {
  camera: "#dcf3e7",
  reader: "#d8eefd",
  sensor: "#fdeec7",
  network: "#e7dffb",
} as const;

// Per-type fallback camera position
const CAMERA_POS_BY_TYPE: Record<PreviewKind["type"], [number, number, number]> = {
  camera: [0.5, 0.25, 0.65],
  reader: [0.6, 0.05, 0.55],
  sensor: [0.45, 0.2, 0.55],
  network: [0.4, 0.45, 0.55],
};

// Per-subtype override for the cases where the type-level position misses
const CAMERA_POS_BY_SUBTYPE: Record<string, [number, number, number]> = {
  dome: [0.35, -0.12, 0.55],
  fisheye: [0.35, -0.12, 0.55],
  ptz: [0.55, 0.3, 0.7],
  fixed: [0.55, 0.22, 0.65],
  card: [0.65, 0.05, 0.4],
  biometric: [0.6, 0.05, 0.45],
  keypad: [0.6, 0.05, 0.45],
  motion: [0.35, 0.25, 0.55],
  "glass-break": [0.6, 0.05, 0.4],
  "door-contact": [0.55, 0.1, 0.45],
  "access-point": [0.35, 0.55, 0.45],
  switch: [0.4, 0.4, 0.6],
  nvr: [0.4, 0.4, 0.6],
};

function buildPreviewDevice(kind: PreviewKind): Device {
  const base = {
    id: `preview-${kind.type}-${kind.subtype}`,
    position: { x: 0, y: 0 },
    rotation: 0,
    mountHeight: 0,
    label: "",
    notes: "",
  };
  if (kind.type === "camera") {
    return {
      ...base,
      type: "camera",
      cameraType: kind.subtype,
      model: "Preview",
      fovDegrees: 90,
      rangeMeters: 12,
    } as CameraDevice;
  }
  if (kind.type === "reader") {
    return {
      ...base,
      type: "reader",
      readerType: kind.subtype,
    } as ReaderDevice;
  }
  if (kind.type === "sensor") {
    return {
      ...base,
      type: "sensor",
      sensorType: kind.subtype,
      rangeMeters: 8,
    } as SensorDevice;
  }
  return {
    ...base,
    type: "network",
    networkType: kind.subtype,
  } as NetworkDeviceBase;
}

function Rotator({
  children,
  speed = 0.45,
}: {
  children: React.ReactNode;
  speed?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * speed;
    }
  });
  return <group ref={ref}>{children}</group>;
}

export function DevicePreview3DCanvas({ kind }: { kind: PreviewKind }) {
  const device = buildPreviewDevice(kind);
  const accent = ACCENT_COLORS[device.type];
  const bg = BACKGROUND_TINTS[device.type];
  const cameraPos =
    CAMERA_POS_BY_SUBTYPE[kind.subtype] ?? CAMERA_POS_BY_TYPE[device.type];

  return (
    <Canvas
      dpr={[0.9, 1.6]}
      camera={{ position: cameraPos, fov: 34 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      style={{ pointerEvents: "none", width: "100%", height: "100%" }}
    >
      <color attach="background" args={[bg]} />

      {/* Studio lighting: bright ambient + warm key + cool fill + accent rim
         behind the device so its silhouette reads even at 56px wide. */}
      <ambientLight intensity={0.95} />
      <directionalLight
        position={[2, 3, 2.5]}
        intensity={1.6}
        color="#fff5d8"
      />
      <directionalLight
        position={[-2, 1.2, -1]}
        intensity={0.65}
        color="#cfe2ff"
      />
      <pointLight
        position={[0, 0.4, -1.2]}
        intensity={0.55}
        distance={3.5}
        color={accent}
      />
      <hemisphereLight args={["#ffffff", "#d4d4d8", 0.35]} />

      <Bounds fit clip margin={1.45}>
        <Rotator>
          <DeviceMesh
            device={device}
            accent={accent}
            emissiveIntensity={1.05}
          />
        </Rotator>
      </Bounds>
    </Canvas>
  );
}
