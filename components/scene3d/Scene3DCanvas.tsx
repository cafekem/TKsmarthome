"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import { useSimStore } from "@/lib/sim-store";
import type { Device, Floor, Wall } from "@/types/design";
import { WalkController } from "./WalkController";
import { SimController } from "@/components/simulation/SimController";
import { Actor3D } from "@/components/simulation/Actor3D";
import { SimPath3D } from "@/components/simulation/SimPath3D";

interface Scene3DCanvasProps {
  width: number;
  height: number;
}

const DEVICE_COLORS = {
  camera: "#34d399",
  reader: "#38bdf8",
  sensor: "#fbbf24",
  network: "#a78bfa",
} as const;

export function Scene3DCanvas({
  width,
  height,
  showSim = false,
}: Scene3DCanvasProps & { showSim?: boolean }) {
  const floor = useActiveFloor();
  const showCoverage = useDesignStore((s) => s.showCoverage);
  const threeDMode = useDesignStore((s) => s.threeDMode);
  const setThreeDMode = useDesignStore((s) => s.setThreeDMode);

  const frame = useMemo(() => floor && computeFrame(floor), [floor]);

  if (!floor || !frame) {
    return null;
  }

  const { center, span, cameraPos } = frame;
  const maxDim = Math.max(span.x, span.z, 6);

  // Find a good walk spawn point: floor center at human eye height, with the
  // camera initially facing toward the building center (so the user is at the
  // edge looking in).
  const walkSpawn: [number, number, number] = [
    center.x - span.x * 0.3,
    1.65,
    center.z + span.z * 0.3,
  ];
  const walkLookAt: [number, number, number] = [center.x, 1.5, center.z];

  return (
    <div className="absolute inset-0" style={{ width, height }}>
      <Canvas
        shadows
        camera={{
          position: cameraPos,
          fov: 45,
          near: 0.1,
          far: maxDim * 12,
        }}
        onCreated={({ camera }) => {
          const eye = new THREE.Vector3(
            cameraPos[0],
            cameraPos[1],
            cameraPos[2]
          );
          const lookAt = new THREE.Vector3(center.x, 1, center.z);
          const up = new THREE.Vector3(0, 1, 0);
          const m = new THREE.Matrix4().lookAt(eye, lookAt, up);
          camera.position.copy(eye);
          camera.quaternion.setFromRotationMatrix(m);
          camera.updateMatrixWorld(true);
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#0c0c0d"]} />
        <fog
          attach="fog"
          args={["#0c0c0d", maxDim * 1.8, maxDim * 4]}
        />

        <ambientLight intensity={0.6} />
        <directionalLight
          castShadow
          position={[
            center.x + maxDim * 0.7,
            maxDim * 1.4,
            center.z + maxDim * 0.4,
          ]}
          intensity={1.1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-maxDim}
          shadow-camera-right={maxDim}
          shadow-camera-top={maxDim}
          shadow-camera-bottom={-maxDim}
          shadow-camera-near={1}
          shadow-camera-far={maxDim * 4}
          shadow-bias={-0.0005}
        />

        <hemisphereLight args={["#bcd5ff", "#1a1a1a", 0.5]} />

        <Grid
          position={[center.x, 0.01, center.z]}
          args={[maxDim * 3, maxDim * 3]}
          cellColor="#1f2937"
          sectionColor="#374151"
          cellSize={1}
          sectionSize={5}
          fadeDistance={maxDim * 2.5}
          fadeStrength={1.2}
          infiniteGrid
        />

        {/* Floor */}
        <mesh
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[center.x, 0, center.z]}
        >
          <planeGeometry args={[span.x * 1.1, span.z * 1.1]} />
          <meshStandardMaterial color="#1a1a1d" roughness={0.85} metalness={0} />
        </mesh>

        {/* Walls */}
        {floor.walls.map((wall) => (
          <Wall3D
            key={wall.id}
            wall={wall}
            scale={floor.scale}
            ceilingHeight={floor.ceilingHeight}
          />
        ))}

        {/* Devices */}
        {floor.devices.map((device) => (
          <Device3D
            key={device.id}
            device={device}
            scale={floor.scale}
            showCoverage={showCoverage}
          />
        ))}

        {/* Simulation overlay: actor + path */}
        {showSim && floor.simPath && floor.simPath.length >= 2 && (
          <>
            <SimPath3D path={floor.simPath} scale={floor.scale} />
            <Actor3D />
            <SimController />
          </>
        )}

        {threeDMode === "orbit" ? (
          <>
            <OrbitControls
              makeDefault
              enableDamping={false}
              minDistance={1}
              maxDistance={maxDim * 4}
              maxPolarAngle={Math.PI / 2.05}
              target={[center.x, 1, center.z]}
            />
            <FramingInit
              cameraPos={cameraPos}
              target={[center.x, 1, center.z]}
            />
          </>
        ) : (
          <WalkController
            walls={floor.walls}
            scale={floor.scale}
            spawn={walkSpawn}
            spawnLookAt={walkLookAt}
            onExit={() => setThreeDMode("orbit")}
          />
        )}
      </Canvas>
    </div>
  );
}

/**
 * Forces the camera to its initial framing on mount, AFTER OrbitControls is
 * registered. Passing `camera` + `target` as props alone is not enough —
 * OrbitControls' damping can lock the rotation in before the camera has had
 * a chance to look at the scene center, producing a black first frame.
 */
function FramingInit({
  cameraPos,
  target,
}: {
  cameraPos: [number, number, number];
  target: [number, number, number];
}) {
  const { camera, controls } = useThree();
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
    const c = controls as unknown as {
      target?: THREE.Vector3;
      update?: () => void;
    } | null;
    if (c && c.target) {
      c.target.set(target[0], target[1], target[2]);
      c.update?.();
    }
  }, [camera, controls, cameraPos, target]);
  return null;
}

/**
 * Compute scene bounds in meters from the floor's data, and a sensible camera
 * position framed on that center. Returns center (world point to look at),
 * span (extents in X and Z), and cameraPos (initial camera position).
 */
function computeFrame(floor: Floor) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const d of floor.devices) {
    xs.push(d.position.x);
    ys.push(d.position.y);
  }
  for (const w of floor.walls) {
    xs.push(w.start.x, w.end.x);
    ys.push(w.start.y, w.end.y);
  }
  // Default to a small room if there's nothing to bound on yet
  let minX = 0;
  let maxX = 400;
  let minY = 0;
  let maxY = 300;
  if (xs.length > 0) {
    minX = Math.min(...xs);
    maxX = Math.max(...xs);
    minY = Math.min(...ys);
    maxY = Math.max(...ys);
  }
  const center = {
    x: ((minX + maxX) / 2) / floor.scale,
    z: ((minY + maxY) / 2) / floor.scale,
  };
  const span = {
    x: Math.max((maxX - minX) / floor.scale, 6),
    z: Math.max((maxY - minY) / floor.scale, 6),
  };
  const maxDim = Math.max(span.x, span.z);
  // Stand high and offset along the SE diagonal so the whole building reads
  // top-down-ish from outside; the user can orbit from there. Walls are
  // 2.7m tall, so we lift the camera well above that.
  const cameraPos: [number, number, number] = [
    center.x + maxDim * 0.6,
    Math.max(maxDim * 1.1, 12),
    center.z + maxDim * 1.05,
  ];
  return { center, span, cameraPos };
}

function Wall3D({
  wall,
  scale,
  ceilingHeight,
}: {
  wall: Wall;
  scale: number;
  ceilingHeight: number;
}) {
  // Convert from floor-plan pixels to world meters. The plan's +Y in pixel
  // space maps to world +Z so the design's top-down view still reads
  // top-down in 3D from a default camera looking down -Z.
  const start = { x: wall.start.x / scale, z: wall.start.y / scale };
  const end = { x: wall.end.x / scale, z: wall.end.y / scale };
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const cx = (start.x + end.x) / 2;
  const cz = (start.z + end.z) / 2;
  const wallThickness = 0.15;

  return (
    <mesh
      castShadow
      receiveShadow
      position={[cx, ceilingHeight / 2, cz]}
      rotation={[0, -angle, 0]}
    >
      <boxGeometry args={[length, ceilingHeight, wallThickness]} />
      <meshStandardMaterial color="#27272a" roughness={0.7} />
    </mesh>
  );
}

function Device3D({
  device,
  scale,
  showCoverage,
}: {
  device: Device;
  scale: number;
  showCoverage: boolean;
}) {
  const px = device.position.x / scale;
  const pz = device.position.y / scale;
  const py = device.mountHeight;
  const baseColor = DEVICE_COLORS[device.type];
  const rotation = device.rotation;
  const detecting = useSimStore((s) =>
    device.type === "camera"
      ? s.detectingCameras.has(device.id)
      : device.type === "sensor"
        ? s.triggeredSensors.has(device.id)
        : false
  );
  // Cameras/sensors glow brighter when detecting; others use their normal color
  const color = detecting ? "#34d399" : baseColor;
  const emissiveIntensity = detecting ? 1.1 : 0.35;

  return (
    <group position={[px, py, pz]}>
      {/* Pole from floor to device */}
      <mesh position={[0, -py / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, py, 8]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.6} />
      </mesh>

      {/* Body */}
      <mesh castShadow>
        <sphereGeometry args={[detecting ? 0.16 : 0.12, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.2}
          roughness={0.5}
        />
      </mesh>
      {detecting && (
        <pointLight
          position={[0, 0, 0]}
          color={color}
          intensity={1.2}
          distance={3.5}
        />
      )}

      {/* Direction marker */}
      {(device.type === "camera" || device.type === "reader") && (
        <mesh
          rotation={[0, -rotation, 0]}
          position={[Math.cos(rotation) * 0.18, 0, Math.sin(rotation) * 0.18]}
        >
          <coneGeometry args={[0.05, 0.12, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* TODO: Camera FOV wedge in 3D (currently breaks the renderer when
         combined with the existing scene — see [Issue: 3D FOV wedge]).
         For now coverage cones are shown in 2D only. */}

      {/* Sensor detection radius (semi-transparent ring on ground) */}
      {showCoverage && device.type === "sensor" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -py + 0.005, 0]}>
          <ringGeometry args={[device.rangeMeters - 0.06, device.rangeMeters, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* AP coverage disc */}
      {showCoverage &&
        device.type === "network" &&
        device.networkType === "access-point" && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -py + 0.005, 0]}>
            <circleGeometry args={[device.coverageMeters ?? 15, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.08} />
          </mesh>
        )}
    </group>
  );
}

