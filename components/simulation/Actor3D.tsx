"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Outlines, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useActiveFloor } from "@/lib/store";
import { useSimStore } from "@/lib/sim-store";
import { collideAgainstWalls, positionOnPath } from "@/lib/detection";
import {
  BOB_AMPLITUDE,
  LIMB_SWING,
  WALK_SPEED,
  dampYaw,
  phase,
} from "@/lib/walk";

/**
 * The simulation "subject" walking through the building — styled as an
 * intruder so the threat reads visually: dark hooded clothes, balaclava,
 * crowbar in the right hand. (Earlier iterations used a friendly orange-
 * capped pegman, which looked like a delivery driver rather than someone
 * a security system should be reacting to.)
 *
 * If you change palette/proportions, the Pegman thumbnail (for the
 * drop-onto-scene affordance) stays its old friendly look — only the
 * walking subject in sim mode is the intruder.
 */

const PLAYER_BODY_HUE = "#1a1a1f"; // mask base (charcoal/near-black)
const PLAYER_SHIRT_HUE = "#0f1115"; // hoodie (very dark)
const PLAYER_PANTS_HUE = "#0a0c10"; // pants (off-black)
const PLAYER_HAND_HUE = "#15171c"; // gloves (dark, slight contrast w/ shirt)
const PLAYER_SKIN_EYES = "#e2c9a6"; // tiny skin slit visible through balaclava
const OUTLINE_COLOR = "#000000";

function makePalette() {
  return {
    head: PLAYER_BODY_HUE, // balaclava body
    hand: PLAYER_HAND_HUE, // gloves
  };
}

export function Actor3D() {
  const floor = useActiveFloor();
  const group = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const lastPos = useRef(new THREE.Vector3());
  const lastYaw = useRef(0);

  const palette = useMemo(() => makePalette(), []);

  // Detection state for the outline color — subscribed so React re-renders
  // and the Outlines components get fresh props when lock state changes.
  // (Outline color is a render-time prop, not a runtime-mutable one.)
  const detectCount = useSimStore((s) => s.detectingCameras.size);
  const outline = useMemo(() => {
    if (detectCount === 0)
      return { color: OUTLINE_COLOR, thickness: 0.012, opacity: 0.55 };
    if (detectCount === 1)
      return { color: "#10b981", thickness: 0.022, opacity: 0.95 }; // emerald
    return { color: "#ef4444", thickness: 0.028, opacity: 1 }; // alarm red
  }, [detectCount]);

  // Refs into the materials we recolor every frame based on detection state.
  const footprintRef = useRef<THREE.MeshBasicMaterial>(null);
  const auraRef = useRef<THREE.MeshBasicMaterial>(null);
  const auraMeshRef = useRef<THREE.Mesh>(null);


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
    // Apply wall collision in pixel space using the shared helper, then
    // convert to world meters for rendering.
    const ACTOR_RADIUS_PX = 0.28 * floor.scale;
    const collided = collideAgainstWalls(
      position,
      floor.walls,
      ACTOR_RADIUS_PX
    );
    const worldX = collided.x / floor.scale;
    const worldZ = collided.y / floor.scale;

    const dx = worldX - lastPos.current.x;
    const dz = worldZ - lastPos.current.z;
    const moving = running && Math.hypot(dx, dz) > 0.001;
    if (moving) lastYaw.current = Math.atan2(dx, dz);

    group.current.position.set(worldX, 0, worldZ);
    group.current.rotation.y = dampYaw(
      group.current.rotation.y,
      lastYaw.current,
      dt
    );
    group.current.visible = true;
    lastPos.current.set(worldX, 0, worldZ);

    const tt = clock.elapsedTime;
    if (moving) {
      const swing = phase(tt, 0) * LIMB_SWING;
      if (legLRef.current) legLRef.current.rotation.x = swing;
      if (legRRef.current) legRRef.current.rotation.x = -swing;
      if (armLRef.current) armLRef.current.rotation.x = -swing * 0.8;
      if (armRRef.current) armRRef.current.rotation.x = swing * 0.8;
      if (bodyRef.current)
        bodyRef.current.position.y = 1.125 + phase(tt, 0) * BOB_AMPLITUDE;
    } else {
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
      if (bodyRef.current) bodyRef.current.position.y = 1.125 + breathe;
    }
    if (headRef.current) {
      headRef.current.rotation.y = THREE.MathUtils.damp(
        headRef.current.rotation.y,
        0,
        6,
        dt
      );
    }

    // Detection-state coloring on the footprint ring + outer aura.
    //   0 cams   → cyan (blind)         — neutral subject indicator
    //   1 cam    → emerald (tracked)    — single camera lock
    //   ≥2 cams  → red, pulsing (alarm) — multiple coverage, full lock
    const detectCount = useSimStore.getState().detectingCameras.size;
    const footprintMat = footprintRef.current;
    const auraMat = auraRef.current;
    const auraMesh = auraMeshRef.current;
    if (footprintMat && auraMat && auraMesh) {
      if (!running || detectCount === 0) {
        // Idle subject — no footprint highlight, no aura. Lets the
        // intruder visually blend in until a camera actually fires.
        footprintMat.color.set("#1f2937");
        footprintMat.opacity = 0;
        auraMat.color.set("#1f2937");
        auraMat.opacity = 0;
        auraMesh.scale.setScalar(1);
      } else if (detectCount === 1) {
        footprintMat.color.set("#10b981"); // emerald-500
        footprintMat.opacity = 0.7;
        auraMat.color.set("#10b981");
        auraMat.opacity = 0.18;
        auraMesh.scale.setScalar(1 + Math.sin(tt * 4) * 0.05);
      } else {
        // 2+ cameras → alarm red, breathing
        const pulse = 0.5 + 0.5 * Math.sin(tt * 7);
        footprintMat.color.set("#ef4444");
        footprintMat.opacity = 0.55 + pulse * 0.4;
        auraMat.color.set("#ef4444");
        auraMat.opacity = 0.18 + pulse * 0.18;
        auraMesh.scale.setScalar(1.1 + pulse * 0.18);
      }
    }

  });

  return (
    <group ref={group}>
      {/* Outer aura — only visible while a camera is on the subject. Bigger
          and brighter as more cameras lock on. Two-tier color: emerald for
          single lock, alarm red for multi-cam. */}
      <mesh
        ref={auraMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      >
        <ringGeometry args={[0.30, 0.60, 48]} />
        <meshBasicMaterial
          ref={auraRef}
          color="#0891B2"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {/* Inner footprint — the always-on subject locator. Smaller now that
          the threat is properly human-scaled (door is 2.05m, threat is
          ~1.70m). Color recolored every frame by useFrame below. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.22, 0.32, 40]} />
        <meshBasicMaterial
          ref={footprintRef}
          color={PLAYER_SHIRT_HUE}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>

      {/* Legs — hip at y=0.85, feet just above the floor. 80cm long so
          the leg-to-torso ratio reads as adult-human, not stubby. */}
      <group ref={legLRef} position={[-0.09, 0.85, 0]}>
        <RoundedBox
          args={[0.13, 0.80, 0.18]}
          radius={0.035}
          smoothness={4}
          position={[0, -0.40, 0]}
          castShadow
        >
          <meshStandardMaterial color={PLAYER_PANTS_HUE} roughness={0.82} />
          <Outlines
            thickness={outline.thickness}
            color={outline.color}
            opacity={outline.opacity}
            transparent
          />
        </RoundedBox>
      </group>
      <group ref={legRRef} position={[0.09, 0.85, 0]}>
        <RoundedBox
          args={[0.13, 0.80, 0.18]}
          radius={0.035}
          smoothness={4}
          position={[0, -0.40, 0]}
          castShadow
        >
          <meshStandardMaterial color={PLAYER_PANTS_HUE} roughness={0.82} />
          <Outlines
            thickness={outline.thickness}
            color={outline.color}
            opacity={outline.opacity}
            transparent
          />
        </RoundedBox>
      </group>

      {/* Body / torso — bottom at hip (y=0.85), top at shoulder (y=1.40).
          Much slimmer in depth than before (was 0.36m deep, now 0.22m)
          so the threat doesn't read like a refrigerator with arms. */}
      <group ref={bodyRef} position={[0, 1.125, 0]}>
        <RoundedBox args={[0.36, 0.55, 0.22]} radius={0.05} smoothness={5} castShadow>
          <meshStandardMaterial color={PLAYER_SHIRT_HUE} roughness={0.62} />
          <Outlines
            thickness={outline.thickness}
            color={outline.color}
            opacity={outline.opacity}
            transparent
          />
        </RoundedBox>
        {/* Belt strip — sits at the waist, on the torso's front face. */}
        <mesh position={[0, -0.18, 0.112]}>
          <planeGeometry args={[0.30, 0.045]} />
          <meshBasicMaterial color={PLAYER_BODY_HUE} transparent opacity={0.95} />
        </mesh>

        {/* Left arm — shoulder at top-edge of torso. 70cm total length
            (30 upper + 28 forearm + 12 hand). */}
        <group ref={armLRef} position={[-0.21, 0.245, 0]}>
          <RoundedBox
            args={[0.10, 0.30, 0.12]}
            radius={0.035}
            smoothness={4}
            position={[0, -0.15, 0]}
            castShadow
          >
            <meshStandardMaterial color={PLAYER_SHIRT_HUE} roughness={0.65} />
          </RoundedBox>
          <RoundedBox
            args={[0.10, 0.28, 0.12]}
            radius={0.035}
            smoothness={4}
            position={[0, -0.44, 0]}
            castShadow
          >
            <meshStandardMaterial color={palette.hand} roughness={0.7} />
          </RoundedBox>
          <RoundedBox
            args={[0.10, 0.12, 0.10]}
            radius={0.032}
            smoothness={4}
            position={[0, -0.64, 0]}
            castShadow
          >
            <meshStandardMaterial color={palette.hand} roughness={0.7} />
          </RoundedBox>
        </group>

        {/* Right arm — gripping the crowbar. Forearm tilted forward by
            the crowbar group's rotation below so the bar hangs at a
            believable carrying angle instead of sticking straight down. */}
        <group ref={armRRef} position={[0.21, 0.245, 0]}>
          {/* Upper arm */}
          <RoundedBox
            args={[0.10, 0.30, 0.12]}
            radius={0.035}
            smoothness={4}
            position={[0, -0.15, 0]}
            castShadow
          >
            <meshStandardMaterial color={PLAYER_SHIRT_HUE} roughness={0.65} />
          </RoundedBox>
          {/* Forearm */}
          <RoundedBox
            args={[0.10, 0.28, 0.12]}
            radius={0.035}
            smoothness={4}
            position={[0, -0.44, 0]}
            castShadow
          >
            <meshStandardMaterial color={palette.hand} roughness={0.7} />
          </RoundedBox>
          {/* Hand (glove) */}
          <RoundedBox
            args={[0.10, 0.12, 0.10]}
            radius={0.032}
            smoothness={4}
            position={[0, -0.64, 0]}
            castShadow
          >
            <meshStandardMaterial color={palette.hand} roughness={0.7} />
          </RoundedBox>
        </group>

        {/* Head — balaclava sized for a real adult skull (~20cm wide,
            ~24cm tall). Was previously a 62cm cube that looked like a
            cartoon character; the slim version reads as actually-human
            and stays a believable fraction of the door height (2.05m). */}
        <group ref={headRef} position={[0, 0.41, 0]}>
          {/* Hood / balaclava base */}
          <RoundedBox args={[0.20, 0.24, 0.20]} radius={0.06} smoothness={5} castShadow>
            <meshStandardMaterial color={palette.head} roughness={0.78} />
            <Outlines
              thickness={outline.thickness}
              color={outline.color}
              opacity={outline.opacity}
              transparent
            />
          </RoundedBox>
          {/* Mask eye-slit — thin horizontal strip of skin visible across
              the eyes. Sits just proud of the hood face to avoid z-fighting. */}
          <mesh position={[0, 0.015, 0.103]}>
            <planeGeometry args={[0.14, 0.04]} />
            <meshStandardMaterial color={PLAYER_SKIN_EYES} roughness={0.55} />
          </mesh>
          {/* Eyes inside the slit */}
          <mesh position={[-0.035, 0.015, 0.105]}>
            <sphereGeometry args={[0.013, 12, 12]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.3} />
          </mesh>
          <mesh position={[0.035, 0.015, 0.105]}>
            <sphereGeometry args={[0.013, 12, 12]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.3} />
          </mesh>
          {/* Hood seam down the top of the head — small ridge for
              definition so the head doesn't read as a flat block. */}
          <mesh position={[0, 0.115, 0.01]}>
            <boxGeometry args={[0.02, 0.02, 0.18]} />
            <meshStandardMaterial color="#0a0a0c" roughness={0.85} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
