"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Outlines, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useActiveFloor } from "@/lib/store";
import { useSimStore } from "@/lib/sim-store";
import { positionOnPath } from "@/lib/detection";
import {
  BOB_AMPLITUDE,
  LIMB_SWING,
  WALK_SPEED,
  dampYaw,
  phase,
} from "@/lib/walk";

/**
 * Stylized threat-actor character, built from RoundedBox primitives with a
 * cel-style outline pass. Inspired by the recruit-main "PlayerCharacter"
 * approach but recoloured for a hooded intruder silhouette.
 *
 * - Two legs swing opposite, two arms swing opposite the legs
 * - Body bobs vertically on the same phase
 * - Idle: subtle breathing
 * - Direction-of-motion yaw is damped
 * - A pulsing red ground ring + point light sells "alarm"
 */

const HOOD_RED = "#e11d48"; // rose-600
const HOOD_DARK = "#7f1d1d"; // rose-900
const SHIRT_DARK = "#18181b"; // zinc-900
const PANTS = "#09090b"; // zinc-950
const SHOE = "#0a0a0a";
const SKIN = "#9c9590";
const OUTLINE = "#fb7185"; // rose-400

export function Actor3D() {
  const floor = useActiveFloor();
  const group = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const lastPos = useRef(new THREE.Vector3());
  const lastYaw = useRef(0);

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: HOOD_RED,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    []
  );

  useFrame(({ clock }, delta) => {
    if (!floor || !group.current) return;
    const path = floor.simPath ?? [];
    if (path.length < 2) {
      group.current.visible = false;
      return;
    }
    const dt = Math.min(delta, 0.06);
    const t = useSimStore.getState().t;
    const running = useSimStore.getState().running;

    const { position } = positionOnPath(path, t, WALK_SPEED, floor.scale);
    const worldX = position.x / floor.scale;
    const worldZ = position.y / floor.scale;

    // Movement detection
    const dx = worldX - lastPos.current.x;
    const dz = worldZ - lastPos.current.z;
    const moving = running && Math.hypot(dx, dz) > 0.001;
    if (moving) {
      lastYaw.current = Math.atan2(dx, dz);
    }
    group.current.position.set(worldX, 0, worldZ);
    group.current.rotation.y = dampYaw(
      group.current.rotation.y,
      lastYaw.current,
      dt
    );
    group.current.visible = true;
    lastPos.current.set(worldX, 0, worldZ);

    // Walk cycle on limbs
    const tt = clock.elapsedTime;
    if (moving) {
      const swing = phase(tt, 0) * LIMB_SWING;
      if (legLRef.current) legLRef.current.rotation.x = swing;
      if (legRRef.current) legRRef.current.rotation.x = -swing;
      if (armLRef.current) armLRef.current.rotation.x = -swing * 0.85;
      if (armRRef.current) armRRef.current.rotation.x = swing * 0.85;
      if (torsoRef.current)
        torsoRef.current.position.y = 0.62 + phase(tt, 0) * BOB_AMPLITUDE;
    } else {
      // Damp limbs back to neutral, gentle breathing on the torso
      const breathe = Math.sin(tt * 1.4) * 0.012;
      if (legLRef.current)
        legLRef.current.rotation.x = THREE.MathUtils.damp(
          legLRef.current.rotation.x,
          0,
          8,
          dt
        );
      if (legRRef.current)
        legRRef.current.rotation.x = THREE.MathUtils.damp(
          legRRef.current.rotation.x,
          0,
          8,
          dt
        );
      if (armLRef.current)
        armLRef.current.rotation.x = THREE.MathUtils.damp(
          armLRef.current.rotation.x,
          0,
          8,
          dt
        );
      if (armRRef.current)
        armRRef.current.rotation.x = THREE.MathUtils.damp(
          armRRef.current.rotation.x,
          0,
          8,
          dt
        );
      if (torsoRef.current)
        torsoRef.current.position.y = 0.62 + breathe;
    }

    if (headRef.current) {
      // Slight head bob delayed off the torso phase
      headRef.current.rotation.y = THREE.MathUtils.damp(
        headRef.current.rotation.y,
        0,
        6,
        dt
      );
    }

    // Pulsing alarm ring
    if (ringRef.current) {
      const pulse = 0.65 + 0.35 * Math.abs(Math.sin(tt * 4));
      ringMaterial.opacity = 0.55 + 0.35 * pulse;
      ringRef.current.scale.setScalar(1 + 0.12 * pulse);
    }
  });

  return (
    <group ref={group}>
      {/* Pulsing ground ring */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        material={ringMaterial}
      >
        <ringGeometry args={[0.35, 0.5, 48]} />
      </mesh>

      {/* Legs (groups so we can swing them from the hip) */}
      <group ref={legLRef} position={[-0.11, 0.34, 0]}>
        <RoundedBox
          args={[0.16, 0.34, 0.2]}
          radius={0.04}
          smoothness={4}
          position={[0, -0.17, 0]}
          castShadow
        >
          <meshStandardMaterial color={PANTS} roughness={0.85} />
          <Outlines thickness={0.014} color={OUTLINE} opacity={0.6} transparent />
        </RoundedBox>
        {/* Shoe */}
        <RoundedBox
          args={[0.18, 0.08, 0.26]}
          radius={0.03}
          smoothness={4}
          position={[0, -0.36, 0.03]}
          castShadow
        >
          <meshStandardMaterial color={SHOE} roughness={0.6} />
          <Outlines thickness={0.014} color={OUTLINE} opacity={0.5} transparent />
        </RoundedBox>
      </group>

      <group ref={legRRef} position={[0.11, 0.34, 0]}>
        <RoundedBox
          args={[0.16, 0.34, 0.2]}
          radius={0.04}
          smoothness={4}
          position={[0, -0.17, 0]}
          castShadow
        >
          <meshStandardMaterial color={PANTS} roughness={0.85} />
          <Outlines thickness={0.014} color={OUTLINE} opacity={0.6} transparent />
        </RoundedBox>
        <RoundedBox
          args={[0.18, 0.08, 0.26]}
          radius={0.03}
          smoothness={4}
          position={[0, -0.36, 0.03]}
          castShadow
        >
          <meshStandardMaterial color={SHOE} roughness={0.6} />
          <Outlines thickness={0.014} color={OUTLINE} opacity={0.5} transparent />
        </RoundedBox>
      </group>

      {/* Torso */}
      <group ref={torsoRef} position={[0, 0.62, 0]}>
        <RoundedBox
          args={[0.46, 0.55, 0.34]}
          radius={0.08}
          smoothness={5}
          castShadow
        >
          <meshStandardMaterial color={SHIRT_DARK} roughness={0.72} />
          <Outlines thickness={0.014} color={OUTLINE} opacity={0.7} transparent />
        </RoundedBox>
        {/* Chest "alarm" emblem */}
        <mesh position={[0, 0.05, 0.175]}>
          <circleGeometry args={[0.07, 24]} />
          <meshStandardMaterial
            color={HOOD_RED}
            emissive={HOOD_RED}
            emissiveIntensity={0.85}
            roughness={0.4}
          />
        </mesh>

        {/* Arms */}
        <group ref={armLRef} position={[-0.28, 0.18, 0]}>
          <RoundedBox
            args={[0.14, 0.24, 0.16]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.12, 0]}
            castShadow
          >
            <meshStandardMaterial color={SHIRT_DARK} roughness={0.72} />
            <Outlines thickness={0.014} color={OUTLINE} opacity={0.55} transparent />
          </RoundedBox>
          <RoundedBox
            args={[0.13, 0.2, 0.15]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.34, 0]}
            castShadow
          >
            <meshStandardMaterial color={SHIRT_DARK} roughness={0.72} />
            <Outlines thickness={0.012} color={OUTLINE} opacity={0.45} transparent />
          </RoundedBox>
          {/* Hand */}
          <RoundedBox
            args={[0.12, 0.12, 0.13]}
            radius={0.036}
            smoothness={4}
            position={[0, -0.51, 0]}
            castShadow
          >
            <meshStandardMaterial color={SKIN} roughness={0.7} />
            <Outlines thickness={0.014} color={OUTLINE} opacity={0.45} transparent />
          </RoundedBox>
        </group>
        <group ref={armRRef} position={[0.28, 0.18, 0]}>
          <RoundedBox
            args={[0.14, 0.24, 0.16]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.12, 0]}
            castShadow
          >
            <meshStandardMaterial color={SHIRT_DARK} roughness={0.72} />
            <Outlines thickness={0.014} color={OUTLINE} opacity={0.55} transparent />
          </RoundedBox>
          <RoundedBox
            args={[0.13, 0.2, 0.15]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.34, 0]}
            castShadow
          >
            <meshStandardMaterial color={SHIRT_DARK} roughness={0.72} />
            <Outlines thickness={0.012} color={OUTLINE} opacity={0.45} transparent />
          </RoundedBox>
          <RoundedBox
            args={[0.12, 0.12, 0.13]}
            radius={0.036}
            smoothness={4}
            position={[0, -0.51, 0]}
            castShadow
          >
            <meshStandardMaterial color={SKIN} roughness={0.7} />
            <Outlines thickness={0.014} color={OUTLINE} opacity={0.45} transparent />
          </RoundedBox>
        </group>

        {/* Head with hood */}
        <group ref={headRef} position={[0, 0.5, 0]}>
          {/* Head box */}
          <RoundedBox
            args={[0.42, 0.42, 0.38]}
            radius={0.1}
            smoothness={5}
            castShadow
          >
            <meshStandardMaterial color={SKIN} roughness={0.6} />
            <Outlines thickness={0.014} color={OUTLINE} opacity={0.55} transparent />
          </RoundedBox>
          {/* Hood (red) — sits on top of and behind the head */}
          <RoundedBox
            args={[0.5, 0.36, 0.46]}
            radius={0.13}
            smoothness={5}
            position={[0, 0.08, -0.05]}
            castShadow
          >
            <meshStandardMaterial color={HOOD_RED} roughness={0.7} />
            <Outlines thickness={0.014} color={OUTLINE} opacity={0.7} transparent />
          </RoundedBox>
          {/* Hood front fringe / brim */}
          <RoundedBox
            args={[0.44, 0.1, 0.06]}
            radius={0.03}
            smoothness={4}
            position={[0, 0.16, 0.2]}
            rotation={[-0.18, 0, 0]}
            castShadow
          >
            <meshStandardMaterial color={HOOD_DARK} roughness={0.7} />
          </RoundedBox>
          {/* Eyes (small dark squares for low-poly readability) */}
          <mesh position={[-0.09, 0.02, 0.21]}>
            <boxGeometry args={[0.035, 0.05, 0.001]} />
            <meshBasicMaterial color="#000" />
          </mesh>
          <mesh position={[0.09, 0.02, 0.21]}>
            <boxGeometry args={[0.035, 0.05, 0.001]} />
            <meshBasicMaterial color="#000" />
          </mesh>
        </group>
      </group>

      {/* Alarm point light */}
      <pointLight
        position={[0, 1.4, 0]}
        color={HOOD_RED}
        intensity={1.5}
        distance={4}
        decay={1.4}
      />
    </group>
  );
}
