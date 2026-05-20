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
 * Small auto-rotating 3D preview of a device, designed to replace flat
 * Lucide icons in the device-library sidebar. Uses the same DeviceMesh
 * components as the main 3D scene so the library preview is a true
 * representation of what gets placed in the building, not a separate
 * stylization that lies about the final look.
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
  camera: "#34d399",
  reader: "#38bdf8",
  sensor: "#fbbf24",
  network: "#a78bfa",
} as const;

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
  speed = 0.55,
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

  return (
    <Canvas
      dpr={[0.7, 1.2]}
      camera={{ position: [0.6, 0.45, 0.95], fov: 36 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      style={{ pointerEvents: "none", width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[2.5, 4, 3]}
        intensity={1.25}
        color="#fff7e8"
      />
      <directionalLight
        position={[-2, 1.5, -1.5]}
        intensity={0.45}
        color="#bcd5ff"
      />
      <hemisphereLight args={["#cbd5e1", "#1a1a1a", 0.4]} />
      <Bounds fit clip margin={1.55}>
        <Rotator>
          <DeviceMesh
            device={device}
            accent={accent}
            emissiveIntensity={0.65}
          />
        </Rotator>
      </Bounds>
    </Canvas>
  );
}
