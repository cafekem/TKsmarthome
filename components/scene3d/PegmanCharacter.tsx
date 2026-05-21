"use client";

import { useMemo } from "react";
import { Outlines, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/**
 * The character mesh used everywhere a small 3D avatar is needed:
 *  - In the simulator (wrapped by Actor3D with walk-cycle animation)
 *  - In the Pegman drag-to-walk button on the 3D mode panel
 *  - As the drag-preview image when the user grabs Pegman
 *
 * Pure geometry/materials — no animation, no store reads, no useFrame —
 * so it can be safely dropped into any Canvas (live editor scene, tiny
 * 36×36 thumbnail, offscreen snapshot canvas) without side effects.
 *
 * Palette + proportions match the original Actor3D so the icon and the
 * walking subject read as the same character.
 */

export const PEGMAN_PALETTE = {
  body: "#F5E9D0",
  cap: "#F97316",
  shirt: "#0891B2",
  pants: "#1E3A5F",
  outline: "#0E5E73",
} as const;

function makePalette(hue: string) {
  const base = new THREE.Color(hue);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const head = new THREE.Color().setHSL(
    hsl.h,
    Math.min(0.4, hsl.s),
    Math.min(0.7, hsl.l + 0.22),
  );
  const hand = new THREE.Color().setHSL(hsl.h, 0.18, 0.86);
  return {
    head: head.getStyle(),
    hand: hand.getStyle(),
  };
}

interface Props {
  /** Show the cyan "footprint" ring on the floor below the character.
      On by default in the simulator; usually off for the standalone
      drag thumbnail. */
  showFootprint?: boolean;
  /** Hide the drei `Outlines` toon stroke. Useful for very small
      thumbnails where the stroke overpowers the shape. */
  withOutlines?: boolean;
}

export function PegmanCharacter({
  showFootprint = false,
  withOutlines = true,
}: Props = {}) {
  const palette = useMemo(() => makePalette(PEGMAN_PALETTE.body), []);
  return (
    <group>
      {showFootprint && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.34, 0.46, 40]} />
          <meshBasicMaterial
            color={PEGMAN_PALETTE.shirt}
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Legs */}
      <group position={[-0.11, 0.22, 0]}>
        <RoundedBox
          args={[0.15, 0.22, 0.2]}
          radius={0.038}
          smoothness={4}
          position={[0, -0.11, 0]}
          castShadow
        >
          <meshStandardMaterial color={PEGMAN_PALETTE.pants} roughness={0.82} />
        </RoundedBox>
      </group>
      <group position={[0.11, 0.22, 0]}>
        <RoundedBox
          args={[0.15, 0.22, 0.2]}
          radius={0.038}
          smoothness={4}
          position={[0, -0.11, 0]}
          castShadow
        >
          <meshStandardMaterial color={PEGMAN_PALETTE.pants} roughness={0.82} />
        </RoundedBox>
      </group>

      {/* Body */}
      <group position={[0, 0.47, 0]}>
        <RoundedBox args={[0.44, 0.52, 0.36]} radius={0.07} smoothness={5} castShadow>
          <meshStandardMaterial color={PEGMAN_PALETTE.shirt} roughness={0.62} />
          {withOutlines && (
            <Outlines
              thickness={0.012}
              color={PEGMAN_PALETTE.outline}
              opacity={0.55}
              transparent
            />
          )}
        </RoundedBox>
        {/* Belt strip */}
        <mesh position={[0, 0.22, 0.184]}>
          <planeGeometry args={[0.32, 0.05]} />
          <meshBasicMaterial color={PEGMAN_PALETTE.body} transparent opacity={0.95} />
        </mesh>

        {/* Left arm */}
        <group position={[-0.25, 0.2, 0]}>
          <RoundedBox
            args={[0.13, 0.18, 0.15]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.09, 0]}
            castShadow
          >
            <meshStandardMaterial color={PEGMAN_PALETTE.shirt} roughness={0.65} />
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
        <group position={[0.25, 0.2, 0]}>
          <RoundedBox
            args={[0.13, 0.18, 0.15]}
            radius={0.04}
            smoothness={4}
            position={[0, -0.09, 0]}
            castShadow
          >
            <meshStandardMaterial color={PEGMAN_PALETTE.shirt} roughness={0.65} />
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
        <group position={[0, 0.55, 0]}>
          <RoundedBox args={[0.62, 0.58, 0.5]} radius={0.13} smoothness={5} castShadow>
            <meshStandardMaterial color={palette.head} roughness={0.6} />
          </RoundedBox>
          {/* Cap crown */}
          <mesh position={[0, 0.34, 0.04]}>
            <cylinderGeometry args={[0.34, 0.36, 0.16, 24]} />
            <meshStandardMaterial color={PEGMAN_PALETTE.cap} roughness={0.55} />
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
            <meshStandardMaterial color={PEGMAN_PALETTE.cap} roughness={0.55} />
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
