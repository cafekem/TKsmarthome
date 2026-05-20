"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useActiveFloor } from "@/lib/store";
import { useSimStore } from "@/lib/sim-store";
import { collideAgainstWalls, computeDetection, positionOnPath } from "@/lib/detection";
import type { CameraDevice, SensorDevice, Vec2 } from "@/types/design";

interface SimControllerProps {
  onActorMove?: (positionPx: Vec2) => void;
}

export function SimController({ onActorMove }: SimControllerProps) {
  const floor = useActiveFloor();
  const running = useSimStore((s) => s.running);
  const speed = useSimStore((s) => s.speed);
  const t = useSimStore((s) => s.t);
  const tick = useSimStore((s) => s.tick);
  const setDetection = useSimStore((s) => s.setDetection);
  const pushEvent = useSimStore((s) => s.pushEvent);
  const reset = useSimStore((s) => s.reset);
  const recordFrameCoverage = useSimStore((s) => s.recordFrameCoverage);
  const markFinished = useSimStore((s) => s.markFinished);

  const lastDetected = useRef<Set<string>>(new Set());
  const lastTriggered = useRef<Set<string>>(new Set());

  // Reset whenever the floor changes
  useEffect(() => {
    reset();
    lastDetected.current = new Set();
    lastTriggered.current = new Set();
  }, [floor?.id, reset]);

  useFrame((_, delta) => {
    if (!floor) return;
    const dt = Math.min(delta, 0.1);
    if (running) {
      tick(dt);
    }

    const path = floor.simPath ?? [];
    if (path.length < 2) return;

    const { position: rawActorPos, doneAt } = positionOnPath(
      path,
      t,
      1.4,
      floor.scale
    );
    // Apply the same collision push-out the visual actor uses so detection
    // events line up with what's actually rendered.
    const ACTOR_RADIUS_PX = 0.28 * floor.scale;
    const actorPos = collideAgainstWalls(
      rawActorPos,
      floor.walls,
      ACTOR_RADIUS_PX
    );

    if (running && t > doneAt) {
      markFinished();
    }

    onActorMove?.(actorPos);

    const cameras = floor.devices.filter(
      (d): d is CameraDevice => d.type === "camera"
    );
    const sensors = floor.devices.filter(
      (d): d is SensorDevice => d.type === "sensor"
    );

    const result = computeDetection({
      cameras,
      sensors,
      walls: floor.walls,
      actorPosition: actorPos,
      scalePxPerMeter: floor.scale,
    });

    // Emit events on edges (newly detected/lost/triggered)
    for (const id of result.detectingCameras) {
      if (!lastDetected.current.has(id)) {
        pushEvent({
          timestamp: t,
          type: "detected",
          deviceId: id,
          actorPosition: actorPos,
        });
      }
    }
    for (const id of lastDetected.current) {
      if (!result.detectingCameras.has(id)) {
        pushEvent({
          timestamp: t,
          type: "lost",
          deviceId: id,
          actorPosition: actorPos,
        });
      }
    }
    for (const id of result.triggeredSensors) {
      if (!lastTriggered.current.has(id)) {
        pushEvent({
          timestamp: t,
          type: "triggered",
          deviceId: id,
          actorPosition: actorPos,
        });
      }
    }

    lastDetected.current = result.detectingCameras;
    lastTriggered.current = result.triggeredSensors;

    setDetection(result.detectingCameras, result.triggeredSensors);
    // Accumulate coverage / blind time using the same dt we ticked with
    if (running) {
      recordFrameCoverage(dt);
    }
  });

  return null;
}
