"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CameraDevice } from "@/types/design";

interface Props {
  /** The camera device whose POV is being rendered. */
  device: CameraDevice;
  /** Floor-plan pixels-per-meter. World units = px / scale. */
  scale: number;
}

/**
 * Places the active R3F camera at the security device's mount point,
 * facing its rotation, with FOV matching the device's `fovDegrees`. This
 * gives the user a literal "what does this camera see?" view.
 *
 * Coordinate mapping mirrors the rest of the 3D scene:
 *   worldX = floor.x / scale
 *   worldZ = floor.y / scale
 *   worldY = device.mountHeight (meters)
 *
 * The device rotation is in floor-plan radians where 0 = +X (east). We
 * convert to a look-at point one meter "ahead" of the camera in the same
 * direction, slightly angled down to mimic a typical ceiling-mount tilt.
 */
export function CameraPovController({ device, scale }: Props) {
  const { camera } = useThree();

  // useEffect rather than useFrame — POV is static (the camera doesn't
  // animate unless the device moves). We re-run when the device changes.
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const worldX = device.position.x / scale;
    const worldZ = device.position.y / scale;
    const worldY = device.mountHeight;

    // Place the camera at the device's mount point.
    camera.position.set(worldX, worldY, worldZ);

    // Compute look-at one meter ahead in the device's facing direction.
    // Floor-plan rotation: 0 = +X (east), Math.PI/2 = +Y in plan (south = +Z world).
    const dx = Math.cos(device.rotation);
    const dz = Math.sin(device.rotation);

    // Tilt slightly downward — most security cameras aren't dead-level.
    // A 15° pitch tracks a hallway floor nicely without losing context.
    const pitch = (15 * Math.PI) / 180;
    const lookX = worldX + dx;
    const lookZ = worldZ + dz;
    const lookY = worldY - Math.sin(pitch);

    camera.lookAt(new THREE.Vector3(lookX, lookY, lookZ));

    // Match the device's FOV. Three.js uses VERTICAL FOV; cameras spec
    // HORIZONTAL FOV. Convert via the current aspect.
    const aspect = camera.aspect || 16 / 9;
    const hFovRad = (device.fovDegrees * Math.PI) / 180;
    const vFovRad = 2 * Math.atan(Math.tan(hFovRad / 2) / aspect);
    camera.fov = (vFovRad * 180) / Math.PI;

    camera.near = 0.05;
    camera.far = Math.max(50, (device.rangeMeters ?? 12) * 4);
    camera.updateProjectionMatrix();
  }, [
    camera,
    device.position.x,
    device.position.y,
    device.rotation,
    device.mountHeight,
    device.fovDegrees,
    device.rangeMeters,
    scale,
  ]);

  return null;
}
