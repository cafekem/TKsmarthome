"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Vec2 } from "@/types/design";

/**
 * Renders the sim path as a glowing line on the floor.
 */
export function SimPath3D({
  path,
  scale,
}: {
  path: Vec2[];
  scale: number;
}) {
  const geometry = useMemo(() => {
    if (path.length < 2) return null;
    const pts = path.map(
      (p) => new THREE.Vector3(p.x / scale, 0.03, p.y / scale)
    );
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, [path, scale]);

  if (!geometry) return null;

  return (
    <>
      <line>
        <primitive object={geometry} attach="geometry" />
        <lineBasicMaterial color="#fb7185" linewidth={2} transparent opacity={0.9} />
      </line>
      {path.map((p, i) => (
        <mesh
          key={i}
          position={[p.x / scale, 0.03, p.y / scale]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.18, 16]} />
          <meshBasicMaterial color="#fb7185" transparent opacity={0.55} />
        </mesh>
      ))}
    </>
  );
}
