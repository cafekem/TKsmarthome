"use client";

import { Outlines, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type {
  CameraDevice,
  Device,
  NetworkDeviceBase,
  ReaderDevice,
  SensorDevice,
} from "@/types/design";

/**
 * Detailed 3D meshes for each device kind. Goal: when you flip into 3D and
 * look at one of these from a typical orbit distance, the silhouette + the
 * obvious details (lens, IR ring, sunshade, port row, etc.) immediately
 * read as the real-world object.
 *
 * Geometry budgets are kept modest (a few dozen meshes per device with
 * 16–24-segment cylinders/spheres) so we can place a couple dozen on one
 * floor without the framerate tanking.
 */

/**
 * Realistic security-gear palette. Real cameras are mostly white/eggshell
 * plastic (Verkada, Axis, Hanwha) with brushed-aluminum or silver accents
 * and a dark lens. Old palette was all zinc-700-to-900 which read as
 * uniformly black on the floor plan.
 *
 *   HOUSING_LIGHT  off-white dome covers, ceiling-mount bodies
 *   HOUSING_MID    light gray bullet camera bodies
 *   HOUSING_DARK   neutral charcoal — used sparingly for hardware accents
 *   METAL          brushed aluminum mounts + bezels
 *   POLISHED       chrome / mirror caps on PTZ heads
 *   GLASS          near-black lens
 *   PORCELAIN      reader / smoke-detector body
 *   READER_PANEL   the dark glass face of card readers
 *   OUTLINE        edge-detect outline on shapes for legibility
 */
const HOUSING_DARK = "#3f3f46"; // zinc-700 — accents only
const HOUSING_MID = "#d4d4d8"; // zinc-300 — light gray bodies
const HOUSING_LIGHT = "#f4f4f5"; // zinc-100 — off-white domes
const METAL = "#a1a1aa"; // zinc-400 — brushed aluminum
const POLISHED = "#e4e4e7"; // zinc-200 — bright chrome highlight
const GLASS = "#18181b"; // dark glass lens
const PORCELAIN = "#fafaf9"; // stone-50 — reader / smoke face
const READER_PANEL = "#1f2937"; // slate-800 — reader display glass
const OUTLINE = "#71717a"; // zinc-500 — softer outline

interface DeviceMeshProps {
  device: Device;
  accent: string;
  emissiveIntensity: number;
}

export function DeviceMesh({
  device,
  accent,
  emissiveIntensity,
}: DeviceMeshProps) {
  if (device.type === "camera") {
    return (
      <CameraMesh
        device={device}
        accent={accent}
        emissiveIntensity={emissiveIntensity}
      />
    );
  }
  if (device.type === "reader") {
    return <ReaderMesh device={device} accent={accent} />;
  }
  if (device.type === "sensor") {
    return (
      <SensorMesh
        device={device}
        accent={accent}
        emissiveIntensity={emissiveIntensity}
      />
    );
  }
  return (
    <NetworkMesh
      device={device}
      accent={accent}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

// ───────────────────────── Cameras ─────────────────────────

function CameraMesh({
  device,
  accent,
  emissiveIntensity,
}: {
  device: CameraDevice;
  accent: string;
  emissiveIntensity: number;
}) {
  switch (device.cameraType) {
    case "dome":
    case "fisheye":
      return <DomeCamera accent={accent} emissiveIntensity={emissiveIntensity} />;
    case "ptz":
      return (
        <PTZCamera
          rotation={device.rotation}
          accent={accent}
          emissiveIntensity={emissiveIntensity}
        />
      );
    case "fixed":
    default:
      return (
        <BulletCamera
          rotation={device.rotation}
          accent={accent}
          emissiveIntensity={emissiveIntensity}
        />
      );
  }
}

/**
 * Hikvision-style cylindrical bullet camera:
 *   wall plate → swivel mount → housing barrel (with heatsink ribs) →
 *   sunshade visor → front cap → IR LED ring → glass lens face.
 * Rotated by `rotation` around Y so the lens faces the right way.
 */
function BulletCamera({
  rotation,
  accent,
  emissiveIntensity,
}: {
  rotation: number;
  accent: string;
  emissiveIntensity: number;
}) {
  // Cylinder body axis is along X (so we can lay it flat horizontally).
  // Local frame: +X is "lens direction"; -X is "wall-mount side".
  return (
    <group rotation={[0, -rotation, 0]}>
      {/* Wall plate */}
      <RoundedBox
        args={[0.04, 0.18, 0.18]}
        radius={0.014}
        smoothness={4}
        position={[-0.28, 0, 0]}
        castShadow
      >
        <meshStandardMaterial color={HOUSING_MID} roughness={0.55} metalness={0.3} />
        <Outlines thickness={0.012} color={OUTLINE} opacity={0.5} transparent />
      </RoundedBox>
      {/* Screws on the wall plate */}
      {[-0.06, 0.06].map((dy) => (
        <mesh
          key={dy}
          rotation={[0, 0, Math.PI / 2]}
          position={[-0.3, dy, 0.06]}
        >
          <cylinderGeometry args={[0.008, 0.008, 0.008, 8]} />
          <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.85} />
        </mesh>
      ))}

      {/* Mount arm — short cylinder coming out of the wall plate */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.21, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.13, 12]} />
        <meshStandardMaterial color={HOUSING_LIGHT} roughness={0.45} metalness={0.5} />
      </mesh>

      {/* Swivel joint (where the bracket meets the housing) */}
      <mesh position={[-0.13, 0, 0]} castShadow>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color={POLISHED} roughness={0.35} metalness={0.85} />
      </mesh>

      {/* Bracket arm (angles down to the underside of the housing) */}
      <RoundedBox
        args={[0.1, 0.05, 0.06]}
        radius={0.012}
        smoothness={3}
        position={[-0.07, -0.04, 0]}
        rotation={[0, 0, 0.5]}
        castShadow
      >
        <meshStandardMaterial color={HOUSING_LIGHT} roughness={0.5} metalness={0.4} />
      </RoundedBox>

      {/* Housing barrel — main cylinder lying along X */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.04, 0, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.34, 24]} />
        <meshStandardMaterial color={HOUSING_DARK} roughness={0.55} metalness={0.3} />
      </mesh>
      {/* Heatsink ribs (3 thin fins along the top of the barrel) */}
      {[-0.06, 0, 0.06].map((dx) => (
        <RoundedBox
          key={dx}
          args={[0.015, 0.013, 0.18]}
          radius={0.003}
          smoothness={2}
          position={[0.04 + dx, 0.085, 0]}
        >
          <meshStandardMaterial color={HOUSING_MID} roughness={0.45} metalness={0.4} />
        </RoundedBox>
      ))}

      {/* Brand strip on side */}
      <mesh position={[0.04, -0.02, 0.0855]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.16, 0.02]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={emissiveIntensity * 0.55}
          roughness={0.4}
        />
      </mesh>

      {/* Rear cap with cable conduit */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.14, 0, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.02, 24]} />
        <meshStandardMaterial color={HOUSING_MID} roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Cable port (small cylinder out the rear) */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.18, -0.04, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.05, 8]} />
        <meshStandardMaterial color={HOUSING_LIGHT} roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Front cap (slightly larger than the barrel — the IR ring lives on this face) */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.225, 0, 0]} castShadow>
        <cylinderGeometry args={[0.095, 0.095, 0.04, 24]} />
        <meshStandardMaterial color={HOUSING_DARK} roughness={0.5} metalness={0.35} />
      </mesh>

      {/* Sunshade visor — wedge on top extending past the front cap */}
      <mesh position={[0.18, 0.085, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.16, 0.02, 0.22]} />
        <meshStandardMaterial color={HOUSING_MID} roughness={0.6} />
      </mesh>

      {/* IR LED ring — 10 small emissive dots around the lens */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const r = 0.07;
        return (
          <mesh key={i} position={[0.246, Math.sin(a) * r, Math.cos(a) * r]}>
            <sphereGeometry args={[0.007, 10, 8]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fde68a"
              emissiveIntensity={0.55}
            />
          </mesh>
        );
      })}

      {/* Lens barrel — protrudes from the front cap */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.27, 0, 0]} castShadow>
        <cylinderGeometry args={[0.048, 0.052, 0.06, 24]} />
        <meshStandardMaterial color={HOUSING_DARK} roughness={0.4} metalness={0.55} />
      </mesh>
      {/* Focus ring (knurled torus) */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.298, 0, 0]}>
        <torusGeometry args={[0.052, 0.008, 12, 24]} />
        <meshStandardMaterial color={POLISHED} roughness={0.25} metalness={0.85} />
      </mesh>
      {/* Glass iris */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.31, 0, 0]}>
        <circleGeometry args={[0.04, 32]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={emissiveIntensity * 0.9}
          roughness={0.15}
          metalness={0.45}
        />
      </mesh>
      {/* Tiny glass inner reflection */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.311, 0.012, -0.012]}>
        <circleGeometry args={[0.012, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>

      {/* Top status LED */}
      <mesh position={[-0.04, 0.095, 0.04]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </group>
  );
}

/**
 * PTZ camera: pan yoke + tilt motor + spherical head with a protruding lens.
 */
function PTZCamera({
  rotation,
  accent,
  emissiveIntensity,
}: {
  rotation: number;
  accent: string;
  emissiveIntensity: number;
}) {
  return (
    <group rotation={[0, -rotation, 0]}>
      {/* Ceiling/wall mount plate */}
      <RoundedBox
        args={[0.28, 0.05, 0.28]}
        radius={0.018}
        smoothness={4}
        position={[0, 0.18, 0]}
        castShadow
      >
        <meshStandardMaterial color={HOUSING_MID} roughness={0.55} metalness={0.3} />
        <Outlines thickness={0.012} color={OUTLINE} opacity={0.45} transparent />
      </RoundedBox>
      {/* Screws on plate corners */}
      {[
        [-0.1, 0.21, -0.1],
        [0.1, 0.21, -0.1],
        [-0.1, 0.21, 0.1],
        [0.1, 0.21, 0.1],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <cylinderGeometry args={[0.008, 0.008, 0.005, 8]} />
          <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.85} />
        </mesh>
      ))}

      {/* Pan column (vertical cylinder hanging from plate) */}
      <mesh position={[0, 0.105, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.075, 0.1, 20]} />
        <meshStandardMaterial color={HOUSING_LIGHT} roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Pan ring (slightly polished) */}
      <mesh position={[0, 0.05, 0]}>
        <torusGeometry args={[0.075, 0.008, 12, 24]} />
        <meshStandardMaterial color={POLISHED} roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Yoke arms (two short verticals running from pan column down to head pivot) */}
      {[-0.085, 0.085].map((dx) => (
        <RoundedBox
          key={dx}
          args={[0.025, 0.13, 0.06]}
          radius={0.008}
          smoothness={3}
          position={[dx, -0.01, 0]}
          castShadow
        >
          <meshStandardMaterial color={HOUSING_MID} roughness={0.5} metalness={0.35} />
        </RoundedBox>
      ))}

      {/* Spherical head */}
      <mesh position={[0, -0.07, 0]} castShadow>
        <sphereGeometry args={[0.1, 32, 24]} />
        <meshStandardMaterial color={HOUSING_DARK} roughness={0.45} metalness={0.4} />
      </mesh>

      {/* Tilt motor pivot caps on the sides of the head */}
      {[-0.1, 0.1].map((dx) => (
        <mesh key={dx} position={[dx, -0.07, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.015, 16]} />
          <meshStandardMaterial color={POLISHED} roughness={0.3} metalness={0.85} />
        </mesh>
      ))}

      {/* Lens barrel protruding from front */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.1, -0.07, 0]} castShadow>
        <cylinderGeometry args={[0.052, 0.058, 0.08, 24]} />
        <meshStandardMaterial color={GLASS} roughness={0.4} metalness={0.55} />
      </mesh>
      {/* Lens focus ring */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.135, -0.07, 0]}>
        <torusGeometry args={[0.058, 0.008, 12, 24]} />
        <meshStandardMaterial color={POLISHED} roughness={0.25} metalness={0.9} />
      </mesh>
      {/* Iris */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.147, -0.07, 0]}>
        <circleGeometry args={[0.046, 32]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={emissiveIntensity * 0.9}
          roughness={0.15}
          metalness={0.45}
        />
      </mesh>
      {/* Glass highlight */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.148, -0.06, -0.012]}>
        <circleGeometry args={[0.014, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>

      {/* IR ring around lens (8 dots) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 0.075;
        return (
          <mesh
            key={i}
            position={[0.118, -0.07 + Math.sin(a) * r, Math.cos(a) * r]}
          >
            <sphereGeometry args={[0.006, 10, 8]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fde68a"
              emissiveIntensity={0.5}
            />
          </mesh>
        );
      })}

      {/* Status LED on top of head */}
      <mesh position={[0, 0.02, 0.05]}>
        <sphereGeometry args={[0.008, 10, 10]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </group>
  );
}

/**
 * Dome camera: visible IR ring + tinted glass dome with the lens body visible
 * inside through transmission. Sits flush against a ceiling/wall plate.
 */
function DomeCamera({
  accent,
  emissiveIntensity,
}: {
  accent: string;
  emissiveIntensity: number;
}) {
  return (
    <group>
      {/* Wall / ceiling plate */}
      <RoundedBox
        args={[0.42, 0.05, 0.42]}
        radius={0.02}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color={HOUSING_MID} roughness={0.55} metalness={0.3} />
        <Outlines thickness={0.014} color={OUTLINE} opacity={0.55} transparent />
      </RoundedBox>
      {/* Tamper screws */}
      {[
        [-0.16, 0.025, -0.16],
        [0.16, 0.025, -0.16],
        [-0.16, 0.025, 0.16],
        [0.16, 0.025, 0.16],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <cylinderGeometry args={[0.009, 0.009, 0.004, 8]} />
          <meshStandardMaterial color={METAL} roughness={0.25} metalness={0.85} />
        </mesh>
      ))}

      {/* Inner IR illuminator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.045, 0]}>
        <ringGeometry args={[0.135, 0.175, 48]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} />
      </mesh>
      {/* IR LED dots on the ring */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = 0.156;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, -0.043, Math.sin(a) * r]}
          >
            <sphereGeometry args={[0.008, 10, 8]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fde68a"
              emissiveIntensity={0.4}
            />
          </mesh>
        );
      })}

      {/* Tinted glass dome */}
      <mesh position={[0, -0.04, 0]} castShadow>
        <sphereGeometry
          args={[0.19, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshPhysicalMaterial
          color="#0a0a0a"
          transparent
          opacity={0.5}
          roughness={0.1}
          metalness={0.5}
          transmission={0.3}
          ior={1.45}
        />
      </mesh>

      {/* Inner gimbal mount */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.04, 16]} />
        <meshStandardMaterial color={HOUSING_LIGHT} roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Inner camera body (visible through tint) */}
      <mesh position={[0, -0.14, 0]}>
        <boxGeometry args={[0.09, 0.06, 0.07]} />
        <meshStandardMaterial color={HOUSING_DARK} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Inner lens */}
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.022, 0.024, 0.025, 16]} />
        <meshStandardMaterial color={GLASS} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Inner iris */}
      <mesh position={[0, -0.175, 0]}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* External status LED on the plate edge */}
      <mesh position={[0.17, 0.012, 0]}>
        <sphereGeometry args={[0.012, 10, 10]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </group>
  );
}

// ───────────────────────── Readers ─────────────────────────

function ReaderMesh({
  device,
  accent,
}: {
  device: ReaderDevice;
  accent: string;
}) {
  const isBio = device.readerType === "biometric";
  const isKeypad = device.readerType === "keypad";
  return (
    <group rotation={[0, -device.rotation, 0]}>
      {/* Wall plate (raised back) */}
      <RoundedBox
        args={[0.04, 0.26, 0.18]}
        radius={0.012}
        smoothness={4}
        position={[-0.025, 0, 0]}
        castShadow
      >
        <meshStandardMaterial color={READER_PANEL} roughness={0.55} metalness={0.25} />
        <Outlines thickness={0.012} color={OUTLINE} opacity={0.55} transparent />
      </RoundedBox>
      {/* Beveled face */}
      <RoundedBox
        args={[0.03, 0.22, 0.14]}
        radius={0.01}
        smoothness={4}
        position={[0.005, 0, 0]}
      >
        <meshStandardMaterial color="#0b1220" roughness={0.5} metalness={0.4} />
      </RoundedBox>

      {/* Indicator strip (vertical) */}
      <mesh position={[0.022, 0.06, 0]}>
        <planeGeometry args={[0.08, 0.012]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.85}
          roughness={0.4}
        />
      </mesh>

      {isBio && (
        <>
          {/* Fingerprint pad (oval glass) */}
          <mesh position={[0.024, 0, 0]}>
            <sphereGeometry
              args={[0.045, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshPhysicalMaterial
              color="#1e293b"
              roughness={0.15}
              metalness={0.3}
              transmission={0.15}
            />
          </mesh>
          {/* Pad active glow */}
          <mesh position={[0.024, 0, 0]}>
            <circleGeometry args={[0.022, 24]} />
            <meshBasicMaterial color={accent} transparent opacity={0.35} />
          </mesh>
        </>
      )}

      {isKeypad && (
        <group>
          {[0, 1, 2, 3].map((row) =>
            [-0.025, 0, 0.025].map((dz) => (
              <RoundedBox
                key={`${row}-${dz}`}
                args={[0.01, 0.022, 0.022]}
                radius={0.005}
                smoothness={3}
                position={[0.022, 0.045 - row * 0.035, dz]}
              >
                <meshStandardMaterial color="#1f2937" roughness={0.5} />
              </RoundedBox>
            ))
          )}
        </group>
      )}

      {!isBio && !isKeypad && (
        <>
          {/* Card swipe area / proximity zone */}
          <RoundedBox
            args={[0.01, 0.09, 0.1]}
            radius={0.006}
            smoothness={3}
            position={[0.022, -0.045, 0]}
          >
            <meshStandardMaterial color="#0a0f1c" roughness={0.4} />
          </RoundedBox>
          {/* Inner glow when active */}
          <mesh position={[0.027, -0.045, 0]}>
            <planeGeometry args={[0.06, 0.06]} />
            <meshBasicMaterial color={accent} transparent opacity={0.2} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ───────────────────────── Sensors ─────────────────────────

function SensorMesh({
  device,
  accent,
  emissiveIntensity,
}: {
  device: SensorDevice;
  accent: string;
  emissiveIntensity: number;
}) {
  if (device.sensorType === "motion") {
    return (
      <group>
        {/* Mounting plate */}
        <RoundedBox
          args={[0.22, 0.04, 0.22]}
          radius={0.012}
          smoothness={4}
          position={[0, -0.015, 0]}
          castShadow
        >
          <meshStandardMaterial color={PORCELAIN} roughness={0.7} />
          <Outlines thickness={0.012} color="#a8a29e" opacity={0.4} transparent />
        </RoundedBox>
        {/* PIR dome with subtle horizontal facets */}
        <mesh castShadow position={[0, 0.005, 0]}>
          <sphereGeometry args={[0.11, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f5f5f4" roughness={0.55} />
        </mesh>
        {/* Three subtle horizontal "ribs" on the dome (typical PIR lens segmentation) */}
        {[0.7, 1.0, 1.3].map((y) => (
          <mesh key={y} position={[0, 0.005 + Math.sin(y) * 0.02, 0]}>
            <torusGeometry args={[0.105 * Math.cos(y * 0.7), 0.002, 8, 32]} />
            <meshStandardMaterial color="#d6d3d1" roughness={0.7} />
          </mesh>
        ))}
        {/* Indicator LED */}
        <mesh position={[0, -0.005, 0.107]}>
          <sphereGeometry args={[0.01, 10, 10]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      </group>
    );
  }
  if (device.sensorType === "glass-break") {
    return (
      <group>
        {/* Square plate */}
        <RoundedBox
          args={[0.04, 0.18, 0.18]}
          radius={0.012}
          smoothness={4}
          castShadow
        >
          <meshStandardMaterial color={PORCELAIN} roughness={0.65} />
          <Outlines thickness={0.012} color="#a8a29e" opacity={0.45} transparent />
        </RoundedBox>
        {/* Microphone hole */}
        <mesh position={[0.022, 0.04, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.002, 16]} />
          <meshStandardMaterial color="#1f2937" roughness={0.7} />
        </mesh>
        {/* Speaker grid (8 small holes) */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const r = 0.04;
          return (
            <mesh
              key={i}
              position={[0.022, -0.02 + Math.sin(a) * r, Math.cos(a) * r]}
            >
              <cylinderGeometry args={[0.006, 0.006, 0.002, 8]} />
              <meshStandardMaterial color="#374151" roughness={0.7} />
            </mesh>
          );
        })}
        {/* LED */}
        <mesh position={[0.023, -0.07, 0]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      </group>
    );
  }
  // door-contact / smoke (small)
  return (
    <group>
      <RoundedBox args={[0.06, 0.08, 0.18]} radius={0.012} smoothness={3} castShadow>
        <meshStandardMaterial color={PORCELAIN} roughness={0.7} />
        <Outlines thickness={0.01} color="#a8a29e" opacity={0.4} transparent />
      </RoundedBox>
      <mesh position={[0.035, 0, 0]}>
        <sphereGeometry args={[0.006, 8, 8]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </group>
  );
}

// ───────────────────────── Network ─────────────────────────

function NetworkMesh({
  device,
  accent,
  emissiveIntensity,
}: {
  device: NetworkDeviceBase;
  accent: string;
  emissiveIntensity: number;
}) {
  if (device.networkType === "access-point") {
    return (
      <group>
        {/* Flat hexagonal puck */}
        <mesh castShadow position={[0, -0.005, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.05, 24]} />
          <meshStandardMaterial color="#f5f5f4" roughness={0.55} />
          <Outlines thickness={0.012} color="#a8a29e" opacity={0.35} transparent />
        </mesh>
        {/* Branded logo dot */}
        <mesh position={[0, -0.032, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.005, 24]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={emissiveIntensity * 0.6}
          />
        </mesh>
        {/* Ring detail */}
        <mesh position={[0, -0.028, 0]}>
          <torusGeometry args={[0.06, 0.003, 8, 32]} />
          <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.7} />
        </mesh>
      </group>
    );
  }
  if (device.networkType === "nvr") {
    return (
      <group>
        {/* 2U chassis */}
        <RoundedBox
          args={[0.5, 0.18, 0.32]}
          radius={0.018}
          smoothness={4}
          castShadow
        >
          <meshStandardMaterial color={HOUSING_MID} roughness={0.45} metalness={0.35} />
          <Outlines thickness={0.012} color={OUTLINE} opacity={0.55} transparent />
        </RoundedBox>
        {/* Front bezel plate */}
        <RoundedBox
          args={[0.46, 0.14, 0.01]}
          radius={0.01}
          smoothness={3}
          position={[0, 0, 0.165]}
        >
          <meshStandardMaterial color={HOUSING_DARK} roughness={0.5} />
        </RoundedBox>
        {/* Power LCD strip */}
        <mesh position={[0, 0.03, 0.171]}>
          <planeGeometry args={[0.22, 0.04]} />
          <meshStandardMaterial
            color="#0891B2"
            emissive="#0891B2"
            emissiveIntensity={0.6}
          />
        </mesh>
        {/* Drive bay indicators (4) */}
        {[-0.16, -0.05, 0.05, 0.16].map((x) => (
          <mesh key={x} position={[x, -0.04, 0.171]}>
            <planeGeometry args={[0.06, 0.04]} />
            <meshStandardMaterial color="#0a0f1c" />
          </mesh>
        ))}
        {[-0.16, -0.05, 0.05, 0.16].map((x) => (
          <mesh key={`led-${x}`} position={[x + 0.024, -0.04, 0.172]}>
            <sphereGeometry args={[0.005, 8, 8]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={emissiveIntensity * 0.8}
            />
          </mesh>
        ))}
      </group>
    );
  }
  // switch
  return (
    <group>
      <RoundedBox
        args={[0.5, 0.1, 0.24]}
        radius={0.014}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color={HOUSING_MID} roughness={0.45} metalness={0.35} />
        <Outlines thickness={0.012} color={OUTLINE} opacity={0.55} transparent />
      </RoundedBox>
      {/* Port row */}
      <mesh position={[0, 0.005, 0.125]}>
        <planeGeometry args={[0.4, 0.05]} />
        <meshStandardMaterial color={GLASS} />
      </mesh>
      {/* Individual port slots (12) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = -0.18 + i * 0.033;
        return (
          <RoundedBox
            key={i}
            args={[0.025, 0.03, 0.005]}
            radius={0.003}
            smoothness={2}
            position={[x, 0.005, 0.128]}
          >
            <meshStandardMaterial color="#1f2937" />
          </RoundedBox>
        );
      })}
      {/* Status LEDs */}
      {[-0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18].map((x) => (
        <mesh key={x} position={[x, 0.04, 0.126]}>
          <sphereGeometry args={[0.005, 8, 8]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={emissiveIntensity * 0.7}
          />
        </mesh>
      ))}
      {/* Brand label */}
      <mesh position={[-0.2, 0.005, 0.128]}>
        <planeGeometry args={[0.06, 0.04]} />
        <meshBasicMaterial color={POLISHED} />
      </mesh>
    </group>
  );
}
