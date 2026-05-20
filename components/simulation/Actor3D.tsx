"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useActiveFloor } from "@/lib/store";
import { useSimStore } from "@/lib/sim-store";
import { positionOnPath } from "@/lib/detection";

/**
 * Renders the threat actor as a stylized capsule + head sphere, with a glowing
 * footprint disc so they're easy to spot from above. Reads the current sim
 * time and recomputes the actor's position each frame (the SimController is
 * the source of truth for sim time; this is just the visual).
 */
export function Actor3D() {
  const floor = useActiveFloor();
  const group = useRef<THREE.Group>(null);
  const lastPos = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!floor || !group.current) return;
    const path = floor.simPath ?? [];
    if (path.length < 2) {
      group.current.visible = false;
      return;
    }
    const t = useSimStore.getState().t;
    const { position } = positionOnPath(path, t, 1.4, floor.scale);
    const worldX = position.x / floor.scale;
    const worldZ = position.y / floor.scale;

    // Face the direction of motion
    const dx = worldX - lastPos.current.x;
    const dz = worldZ - lastPos.current.z;
    if (Math.hypot(dx, dz) > 0.002) {
      const yaw = Math.atan2(dx, dz);
      group.current.rotation.y = yaw;
    }
    group.current.position.set(worldX, 0, worldZ);
    group.current.visible = true;
    lastPos.current.set(worldX, 0, worldZ);
  });

  return (
    <group ref={group}>
      {/* Glowing ground footprint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.3, 0.45, 32]} />
        <meshBasicMaterial
          color="#fb7185"
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
      {/* Body */}
      <mesh castShadow position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.22, 0.95, 8, 16]} />
        <meshStandardMaterial color="#0c0a09" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#1f1d1c" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Subtle "active" indicator */}
      <pointLight
        position={[0, 1.6, 0]}
        color="#fb7185"
        intensity={0.6}
        distance={2.5}
      />
    </group>
  );
}
