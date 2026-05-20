"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Vec2 } from "@/types/design";
import { positionOnPath } from "@/lib/detection";
import { WALK_SPEED } from "@/lib/walk";
import { useSimStore } from "@/lib/sim-store";

/**
 * Renders the simulation path on the floor with the portion already walked
 * highlighted in bright cyan and the upcoming portion dimmed.
 * Updates as sim time advances (subscribes to useSimStore).
 */
export function SubjectTrail3D({
  path,
  scale,
}: {
  path: Vec2[];
  scale: number;
}) {
  const t = useSimStore((s) => s.t);

  // Full path geometry (dim) — built once
  const fullGeometry = useMemo(() => {
    const pts = path.map(
      (p) => new THREE.Vector3(p.x / scale, 0.05, p.y / scale)
    );
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, [path, scale]);

  // Walked portion geometry — rebuilt as t changes (cheap; only a handful of points)
  const walkedGeometry = useMemo(() => {
    if (path.length < 2) return null;
    const { position } = positionOnPath(path, t, WALK_SPEED, scale);
    // Find which leg the subject is currently on
    let acc = 0;
    let legIndex = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const legM =
        Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y) /
        scale;
      const legTime = legM / WALK_SPEED;
      if (t <= acc + legTime) {
        legIndex = i;
        break;
      }
      acc += legTime;
      legIndex = i + 1;
    }
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= legIndex; i++) {
      pts.push(new THREE.Vector3(path[i].x / scale, 0.06, path[i].y / scale));
    }
    // Add current subject position as the last point of the walked trail
    pts.push(new THREE.Vector3(position.x / scale, 0.06, position.y / scale));
    if (pts.length < 2) return null;
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [path, scale, t]);

  return (
    <>
      {/* Upcoming path — dim */}
      <line>
        <primitive object={fullGeometry} attach="geometry" />
        <lineBasicMaterial
          color="#0891B2"
          transparent
          opacity={0.35}
        />
      </line>
      {/* Path waypoints */}
      {path.map((p, i) => (
        <mesh
          key={i}
          position={[p.x / scale, 0.05, p.y / scale]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.16, 16]} />
          <meshBasicMaterial color="#0891B2" transparent opacity={0.4} />
        </mesh>
      ))}
      {/* Walked portion — bright */}
      {walkedGeometry && (
        <line>
          <primitive object={walkedGeometry} attach="geometry" />
          <lineBasicMaterial color="#22d3ee" linewidth={3} />
        </line>
      )}
    </>
  );
}
