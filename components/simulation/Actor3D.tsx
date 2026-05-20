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
 * The simulation "subject" walking through the building. Visual + animation
 * design is a direct port of the PlayerCharacter from mohosy/recruit-main
 * (https://github.com/mohosy/recruit-main/blob/main/components/room/player-character.tsx) —
 * same palette (cream / orange cap / cyan shirt / navy pants), same low-poly
 * RoundedBox construction with drei Outlines, same walk-cycle math.
 *
 * The character is reused rather than re-imagined because the aesthetic
 * already nails the "professional but approachable" feel we want for B2B
 * security demos — you're not watching a Roblox blockhead, but you're also
 * not pretending to render a photoreal human.
 */

const PLAYER_BODY_HUE = "#F5E9D0";
const PLAYER_CAP_HUE = "#F97316";
const PLAYER_SHIRT_HUE = "#0891B2";
const PLAYER_PANTS_HUE = "#1E3A5F";
const OUTLINE_COLOR = "#0E5E73";

function makePalette(hue: string) {
  const base = new THREE.Color(hue);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const head = new THREE.Color().setHSL(
    hsl.h,
    Math.min(0.4, hsl.s),
    Math.min(0.7, hsl.l + 0.22)
  );
  const hand = new THREE.Color().setHSL(hsl.h, 0.18, 0.86);
  return {
    head: head.getStyle(),
    hand: hand.getStyle(),
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

  const palette = useMemo(() => makePalette(PLAYER_BODY_HUE), []);

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
        bodyRef.current.position.y = 0.47 + phase(tt, 0) * BOB_AMPLITUDE;
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
      if (bodyRef.current) bodyRef.current.position.y = 0.47 + breathe;
    }
    if (headRef.current) {
      headRef.current.rotation.y = THREE.MathUtils.damp(
        headRef.current.rotation.y,
        0,
        6,
        dt
      );
    }
  });

  return (
    <group ref={group}>
      {/* Subtle cyan footprint so the subject reads from above without
         alarm-coding them */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.34, 0.46, 40]} />
        <meshBasicMaterial
          color={PLAYER_SHIRT_HUE}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>

      {/* Legs */}
      <group ref={legLRef} position={[-0.11, 0.22, 0]}>
        <RoundedBox
          args={[0.15, 0.22, 0.2]}
          radius={0.038}
          smoothness={4}
          position={[0, -0.11, 0]}
          castShadow
        >
          <meshStandardMaterial color={PLAYER_PANTS_HUE} roughness={0.82} />
        </RoundedBox>
      </group>
      <group ref={legRRef} position={[0.11, 0.22, 0]}>
        <RoundedBox
          args={[0.15, 0.22, 0.2]}
          radius={0.038}
          smoothness={4}
          position={[0, -0.11, 0]}
          castShadow
        >
          <meshStandardMaterial color={PLAYER_PANTS_HUE} roughness={0.82} />
        </RoundedBox>
      </group>

      {/* Body */}
      <group ref={bodyRef} position={[0, 0.47, 0]}>
        <RoundedBox args={[0.44, 0.52, 0.36]} radius={0.07} smoothness={5} castShadow>
          <meshStandardMaterial color={PLAYER_SHIRT_HUE} roughness={0.62} />
          <Outlines
            thickness={0.012}
            color={OUTLINE_COLOR}
            opacity={0.55}
            transparent
          />
        </RoundedBox>
        {/* Belt strip */}
        <mesh position={[0, 0.22, 0.184]}>
          <planeGeometry args={[0.32, 0.05]} />
          <meshBasicMaterial color={PLAYER_BODY_HUE} transparent opacity={0.95} />
        </mesh>

        {/* Left arm */}
        <group ref={armLRef} position={[-0.25, 0.2, 0]}>
          <RoundedBox
            args={[0.13, 0.18, 0.15]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.09, 0]}
            castShadow
          >
            <meshStandardMaterial color={PLAYER_SHIRT_HUE} roughness={0.65} />
          </RoundedBox>
          <RoundedBox
            args={[0.13, 0.22, 0.15]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.29, 0]}
            castShadow
          >
            <meshStandardMaterial color={palette.hand} roughness={0.7} />
          </RoundedBox>
          <RoundedBox
            args={[0.12, 0.12, 0.13]}
            radius={0.036}
            smoothness={4}
            position={[0, -0.46, 0]}
            castShadow
          >
            <meshStandardMaterial color={palette.hand} roughness={0.7} />
          </RoundedBox>
        </group>

        {/* Right arm */}
        <group ref={armRRef} position={[0.25, 0.2, 0]}>
          <RoundedBox
            args={[0.13, 0.18, 0.15]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.09, 0]}
            castShadow
          >
            <meshStandardMaterial color={PLAYER_SHIRT_HUE} roughness={0.65} />
          </RoundedBox>
          <RoundedBox
            args={[0.13, 0.22, 0.15]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.29, 0]}
            castShadow
          >
            <meshStandardMaterial color={palette.hand} roughness={0.7} />
          </RoundedBox>
          <RoundedBox
            args={[0.12, 0.12, 0.13]}
            radius={0.036}
            smoothness={4}
            position={[0, -0.46, 0]}
            castShadow
          >
            <meshStandardMaterial color={palette.hand} roughness={0.7} />
          </RoundedBox>
        </group>

        {/* Head */}
        <group ref={headRef} position={[0, 0.55, 0]}>
          <RoundedBox args={[0.62, 0.58, 0.5]} radius={0.13} smoothness={5} castShadow>
            <meshStandardMaterial color={palette.head} roughness={0.6} />
          </RoundedBox>
          {/* Cap crown */}
          <mesh position={[0, 0.34, 0.04]}>
            <cylinderGeometry args={[0.34, 0.36, 0.16, 24]} />
            <meshStandardMaterial color={PLAYER_CAP_HUE} roughness={0.55} />
          </mesh>
          {/* Cap visor */}
          <RoundedBox
            args={[0.54, 0.045, 0.3]}
            radius={0.035}
            smoothness={4}
            position={[0, 0.27, 0.38]}
            rotation={[0.03, 0, 0]}
            castShadow
          >
            <meshStandardMaterial color={PLAYER_CAP_HUE} roughness={0.55} />
          </RoundedBox>
          {/* Eyes */}
          <mesh position={[-0.13, 0.05, 0.27]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#101827" roughness={0.4} />
          </mesh>
          <mesh position={[0.13, 0.05, 0.27]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#101827" roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
