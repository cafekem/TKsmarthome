"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { useActiveFloor } from "@/lib/store";
import { useSimStore } from "@/lib/sim-store";
import { positionOnPath, collideAgainstWalls } from "@/lib/detection";
import { WALK_SPEED } from "@/lib/walk";
import type { CameraDevice } from "@/types/design";

/**
 * In-scene visualization of what each camera is detecting in real time.
 *
 * Two layers:
 *   1. Detection beams — thin emerald lines from each detecting camera's
 *      lens to the subject's torso. Reads as "active surveillance link".
 *   2. Spotlight cones — translucent additive cones aligned along the
 *      same beam. Reads as the camera ACTIVELY illuminating / scanning
 *      the subject (not "firing at" them). Much more cinematic than
 *      shooting glowing beads down the beam.
 *   3. Per-camera "TRACKING" label — small floating badge next to each
 *      detecting camera so you can tell at a glance which device fired.
 *
 * Everything updates inside a single useFrame so we don't trigger React
 * re-renders on every animation frame — the meshes/lines are mutated in
 * place by refs.
 *
 * (Earlier iterations had a yellow target reticle over the subject's
 * head, a floor-burst ring, and "data beads" sliding down each beam.
 * Those read as either marking the subject like a video-game enemy or
 * the cameras shooting projectiles, which broke immersion. They've been
 * removed in favour of the subtler beam-plus-spotlight pair.)
 */
export function DetectionVisualizer3D() {
  const floor = useActiveFloor();
  const detectingCameras = useSimStore((s) => s.detectingCameras);
  const simRunning = useSimStore((s) => s.running);

  // Stable refs for per-camera live-updated meshes.
  const beamRefs = useRef<Map<string, THREE.BufferGeometry>>(new Map());
  const coneRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  // Cameras that are CURRENTLY detecting, snapshotted to a typed array so we
  // can iterate cleanly. The Set itself is part of the store and changes
  // identity each tick, which is how React knows to re-render us.
  const activeCameras = useMemo(() => {
    if (!floor) return [];
    const out: CameraDevice[] = [];
    for (const id of detectingCameras) {
      const dev = floor.devices.find((d) => d.id === id);
      if (dev?.type === "camera") out.push(dev as CameraDevice);
    }
    return out;
  }, [floor, detectingCameras]);

  // Watch for NEW camera locks → trigger a cinematic cutaway. Diff the
  // set against the previous frame: any IDs that just appeared are
  // candidates. We trigger on the first new one (the store's cooldown
  // dedupes if multiple fire in the same tick).
  const prevDetectingIds = useRef<Set<string>>(new Set());
  const triggerCutaway = useSimStore((s) => s.triggerCutaway);
  const following = useSimStore((s) => s.following);
  useEffect(() => {
    const prev = prevDetectingIds.current;
    const newlyLocked: string[] = [];
    for (const id of detectingCameras) {
      if (!prev.has(id)) newlyLocked.push(id);
    }
    if (newlyLocked.length > 0 && following && simRunning) {
      // 1.4s through the new camera's POV, 5s cooldown after.
      triggerCutaway(newlyLocked[0], 1.4, 5);
    }
    prevDetectingIds.current = new Set(detectingCameras);
  }, [detectingCameras, following, simRunning, triggerCutaway]);

  useFrame(() => {
    if (!floor || !simRunning) return;

    // Recompute the subject's live world position by running positionOnPath
    // ourselves. Cheap and avoids coupling to Actor3D's internal ref. Wall
    // collision matches Actor3D so beams hit the visible avatar.
    const path = floor.simPath ?? [];
    if (path.length < 2) return;
    const t = useSimStore.getState().t;
    const { position } = positionOnPath(path, t, WALK_SPEED, floor.scale);
    const ACTOR_RADIUS_PX = 0.28 * floor.scale;
    const collided = collideAgainstWalls(position, floor.walls, ACTOR_RADIUS_PX);
    const subjectX = collided.x / floor.scale;
    const subjectZ = collided.y / floor.scale;
    // Aim each beam at the subject's chest, not the floor — looks like the
    // camera is locked onto the person, not a puddle.
    const subjectY = 1.0;
    const subject = new THREE.Vector3(subjectX, subjectY, subjectZ);

    // Update each beam's BufferGeometry to point from camera → subject,
    // and align the matching spotlight cone along the same vector.
    const pulse = 0.85 + Math.sin(t * 3.2) * 0.15; // 0.7→1.0 brightness
    for (const cam of activeCameras) {
      const camPos = new THREE.Vector3(
        cam.position.x / floor.scale,
        cam.mountHeight,
        cam.position.y / floor.scale,
      );
      const geo = beamRefs.current.get(cam.id);
      if (geo) {
        const positions = geo.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, camPos.x, camPos.y, camPos.z);
        positions.setXYZ(1, subjectX, subjectY, subjectZ);
        positions.needsUpdate = true;
      }
      const cone = coneRefs.current.get(cam.id);
      if (cone) {
        // Spotlight cone — base at camera lens, tip at subject. Three's
        // ConeGeometry has its axis along +Y and origin at center, so we:
        //  1. position the cone at the midpoint between camera and subject
        //  2. set its scale.y to the distance between them
        //  3. orient so its +Y axis points from camera toward subject
        const dir = subject.clone().sub(camPos);
        const dist = dir.length();
        if (dist > 0.01) {
          dir.normalize();
          // Midpoint placement
          cone.position.copy(camPos).addScaledVector(dir, dist / 2);
          // Stretch to span the distance
          cone.scale.set(1, dist, 1);
          // Orient: rotate +Y to align with `dir`
          const q = new THREE.Quaternion();
          q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          cone.quaternion.copy(q);
          // Subtle pulse so the cone reads as "live"
          const mat = cone.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.22 * pulse;
        }
      }
    }
  });

  if (!simRunning) return null;

  return (
    <group>
      {/* Detection beams + spotlight cones */}
      {activeCameras.map((cam) => (
        <DetectionBeam
          key={cam.id}
          camera={cam}
          onGeometryReady={(geo) => beamRefs.current.set(cam.id, geo)}
          onConeReady={(mesh) => coneRefs.current.set(cam.id, mesh)}
        />
      ))}

      {/* "TRACKING" labels next to each active camera */}
      {floor &&
        activeCameras.map((cam) => (
          <CameraTrackingLabel
            key={`label-${cam.id}`}
            camera={cam}
            floor={floor}
          />
        ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */

interface DetectionBeamProps {
  camera: CameraDevice;
  /** Called once with the geometry so the parent can mutate vertices per-frame. */
  onGeometryReady: (geo: THREE.BufferGeometry) => void;
  /** Called once with the cone mesh so the parent can stretch/orient it. */
  onConeReady: (mesh: THREE.Mesh) => void;
}

/**
 * Detection link: one thin emerald line from the camera lens to the
 * subject, plus a translucent additive-blended cone aligned with that
 * vector so the camera reads as actively illuminating the subject.
 * Parent owns animation; we just hand back the refs.
 */
function DetectionBeam({
  camera: _camera,
  onGeometryReady,
  onConeReady,
}: DetectionBeamProps) {
  // Build the line imperatively so we get a real THREE.Line with a mutable
  // geometry. JSX `<line>` collides with the SVGLineElement type, so we
  // construct the Three node ourselves and attach it via a `<primitive>`.
  const obj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 0]), 3),
    );
    const mat = new THREE.LineBasicMaterial({
      color: "#34d399",
      transparent: true,
      opacity: 0.85,
    });
    const line = new THREE.Line(geo, mat);
    onGeometryReady(geo);
    return line;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <primitive object={obj} />
      {/* Spotlight / scanning cone — additive blending so it pops in
          either bright or dusk lighting without washing out. Base radius
          0.5m at the subject, tapers to a point at the camera lens. The
          parent stretches scale.y per frame to span the beam's length. */}
      <mesh
        ref={(m) => {
          if (m) onConeReady(m);
        }}
      >
        <coneGeometry args={[0.45, 1, 24, 1, true]} />
        <meshBasicMaterial
          color="#86efac"
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

/** Tiny "TRACKING" badge billboarded next to an active camera. */
function CameraTrackingLabel({
  camera,
  floor,
}: {
  camera: CameraDevice;
  floor: { scale: number };
}) {
  const x = camera.position.x / floor.scale;
  const z = camera.position.y / floor.scale;
  return (
    <Billboard position={[x, camera.mountHeight + 0.45, z]}>
      <group>
        {/* Background pill */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[0.85, 0.22]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.85} />
        </mesh>
        {/* Red recording dot */}
        <mesh position={[-0.32, 0, 0]}>
          <circleGeometry args={[0.04, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <Text
          position={[0.04, 0, 0]}
          fontSize={0.1}
          color="#fef2f2"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.95}
        >
          TRACKING
        </Text>
      </group>
    </Billboard>
  );
}
