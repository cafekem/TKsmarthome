"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CameraDevice } from "@/types/design";
import { useDesignStore } from "@/lib/store";

interface Props {
  /** The camera device whose POV is being rendered. */
  device: CameraDevice;
  /** Floor-plan pixels-per-meter. World units = px / scale. */
  scale: number;
}

/**
 * Places the active R3F camera at the security device's mount point,
 * facing the device's mounted heading + an optional user-controlled pan
 * offset. The user nudges that offset with the ◀ / ▶ arrows that appear
 * in the POV viewfinder for cameras that physically swivel (dome /
 * fisheye / multi-sensor / PTZ).
 *
 * Coordinate mapping mirrors the rest of the 3D scene:
 *   worldX = floor.x / scale
 *   worldZ = floor.y / scale
 *   worldY = device.mountHeight (meters)
 *
 * The view uses the device's spec'd horizontal FOV (capped at 110° so
 * even fisheye / multi-sensor doesn't render as a distorted wide-angle
 * smear). For cameras that span 180°+ in real life, the panOffset lets
 * the operator sweep across the full coverage instead of seeing it all
 * crammed into a single warped frame.
 */
export function CameraPovController({ device, scale }: Props) {
  const { camera } = useThree();
  const panOffset = useDesignStore((s) => s.cameraPovPanOffset);

  // Snapshot the orbit camera's frustum on mount and restore on unmount.
  // Without this, exiting POV leaves the camera with a 50m far plane
  // (and the POV's narrow FOV), which clips the surrounding tile-grid
  // floor into a triangular cut once the user pops back to orbit.
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const origFov = camera.fov;
    const origNear = camera.near;
    const origFar = camera.far;
    return () => {
      camera.fov = origFov;
      camera.near = origNear;
      camera.far = origFar;
      camera.updateProjectionMatrix();
    };
  }, [camera]);

  useFrame(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const worldX = device.position.x / scale;
    const worldZ = device.position.y / scale;
    const worldY = device.mountHeight;

    camera.position.set(worldX, worldY, worldZ);

    // Base heading from the device's rotation, plus the user's pan nudge.
    const heading = device.rotation + panOffset;

    const dx = Math.cos(heading);
    const dz = Math.sin(heading);

    // Slight downward pitch — most security cameras sit angled toward
    // the floor so they catch heads / faces rather than ceilings.
    const pitchRad = (15 * Math.PI) / 180;

    const lookX = worldX + dx;
    const lookZ = worldZ + dz;
    const lookY = worldY - Math.sin(pitchRad);

    camera.lookAt(new THREE.Vector3(lookX, lookY, lookZ));

    // Match the device's spec FOV, capped at 110° so even very wide
    // cameras don't render as a distorted fisheye smear in a flat
    // perspective view. Operators pan with the ◀/▶ arrows for those.
    const hFovDeg = Math.min(110, Math.max(20, device.fovDegrees));
    const aspect = camera.aspect || 16 / 9;
    const hFovRad = (hFovDeg * Math.PI) / 180;
    const vFovRad = 2 * Math.atan(Math.tan(hFovRad / 2) / aspect);
    camera.fov = (vFovRad * 180) / Math.PI;

    camera.near = 0.05;
    camera.far = Math.max(50, (device.rangeMeters ?? 12) * 4);
    camera.updateProjectionMatrix();
  });

  return null;
}
