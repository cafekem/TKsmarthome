"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Minimal subset of drei's OrbitControls instance API that we touch.
// Avoids pulling in the `three-stdlib` type package just for one symbol.
interface OrbitLike {
  target: THREE.Vector3;
  update(): void;
}
import { useActiveFloor } from "@/lib/store";
import { useSimStore } from "@/lib/sim-store";
import { collideAgainstWalls, positionOnPath } from "@/lib/detection";
import { WALK_SPEED } from "@/lib/walk";

/**
 * Chase-camera controller for sim mode. The camera ORBITS around the
 * walking subject from a comfortable distance, so the user can watch
 * cameras detect / lock onto the subject as they move through the
 * building. Auto-engages on sim mount (no button click required); the
 * Exit Follow chip in the top-right lets users break out into free orbit.
 */
export function ActorFollowController() {
  return <FollowCamera />;
}

/* -------------------------------------------------------------------------- */

/** Sphere of the actor's head + the recomputed walk direction, derived from
 *  the same positionOnPath that Actor3D uses. We sample now AND a hair into
 *  the future to compute the heading. */
function sampleActor(floor: ReturnType<typeof useActiveFloor>): {
  pos: THREE.Vector3;
  forward: THREE.Vector3;
} | null {
  if (!floor) return null;
  const path = floor.simPath ?? [];
  if (path.length < 2) return null;
  const t = useSimStore.getState().t;
  const radiusPx = 0.28 * floor.scale;
  const { position } = positionOnPath(path, t, WALK_SPEED, floor.scale);
  const a = collideAgainstWalls(position, floor.walls, radiusPx);
  // 0.12s lookahead so the heading vector isn't jittery on tight corners.
  const { position: ahead } = positionOnPath(path, t + 0.12, WALK_SPEED, floor.scale);
  const b = collideAgainstWalls(ahead, floor.walls, radiusPx);
  const pos = new THREE.Vector3(a.x / floor.scale, 0, a.y / floor.scale);
  const forwardX = (b.x - a.x) / floor.scale;
  const forwardZ = (b.y - a.y) / floor.scale;
  const len = Math.hypot(forwardX, forwardZ);
  const forward =
    len > 0.001
      ? new THREE.Vector3(forwardX / len, 0, forwardZ / len)
      : new THREE.Vector3(0, 0, 1);
  return { pos, forward };
}

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

/**
 * Chase-cam controller. While following=true, the camera ORBITS around
 * the actor: every frame we move the OrbitControls' target to the actor's
 * chest, so the user can still click-and-drag to spin the camera around
 * them as they walk. When follow first turns on we set up a sensible
 * chase-cam pose (behind + above the actor); after that the user is in
 * the driver's seat for camera angle.
 *
 * On follow exit, we restore the camera to where it was before follow
 * began so the user lands back in the same orbit angle they left.
 */
function FollowCamera() {
  const { camera, controls } = useThree();
  const floor = useActiveFloor();
  const following = useSimStore((s) => s.following);

  // Cast `controls` from the R3F default-controls slot to drei's
  // OrbitControls so we can read/write its `target` property.
  const orbit = controls as unknown as OrbitLike | null;

  // Where the camera + target were before follow started. We restore on
  // exit so the user pops back to the same orbit pose they left.
  const savedPos = useRef(new THREE.Vector3());
  const savedTarget = useRef(new THREE.Vector3());
  const savedValid = useRef(false);

  useEffect(() => {
    if (following) {
      // Snapshot the current orbit state for restore-on-exit.
      savedPos.current.copy(camera.position);
      if (orbit) {
        savedTarget.current.copy(orbit.target);
      } else {
        // No orbit yet — best-effort: target = a point 6m in front.
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        savedTarget.current.set(
          camera.position.x + dir.x * 6,
          0,
          camera.position.z + dir.z * 6,
        );
      }
      savedValid.current = true;

      // Set up a chase-cam pose: place the camera well behind and above
      // the actor so the user can see both the subject AND the
      // surrounding cameras / sensors reacting to them. The previous
      // (3.6m back / 2.6m up) chase was too close — you couldn't see
      // the nearby cameras lighting up.
      const s = sampleActor(floor);
      if (s && orbit) {
        const BEHIND = 9.0;
        const HEIGHT = 5.5;
        const ACTOR_LOOK_Y = 1.1;
        camera.position.set(
          s.pos.x - s.forward.x * BEHIND,
          HEIGHT,
          s.pos.z - s.forward.z * BEHIND,
        );
        orbit.target.set(s.pos.x, ACTOR_LOOK_Y, s.pos.z);
        orbit.update();
      }
    } else if (savedValid.current && orbit) {
      // Restore orbit pose on exit.
      camera.position.copy(savedPos.current);
      orbit.target.copy(savedTarget.current);
      orbit.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following]);

  // Cinematic chase. Two phases:
  //
  //   1. INTRO — the very first sampleable frame we see, snapshot the
  //      camera's current pose as start, compute the chase pose as end,
  //      then over INTRO_SEC ease the camera through a cubic-out from
  //      start → end. Reads like the opening shot of a movie.
  //
  //   2. FOLLOW — once intro completes, we hold a frame-rate-aware
  //      exponential damping lerp toward (target = subject) for the
  //      orbit target, and slide the camera position by the same delta.
  //      Replaces the previous naive `delta * 0.85` which felt rigid.
  //
  // Both phases keep the relative camera→target offset that the user
  // sets via drag-to-orbit, so they can re-frame mid-sim.
  const introStartPos = useRef<THREE.Vector3 | null>(null);
  const introStartTarget = useRef<THREE.Vector3 | null>(null);
  const introEndPos = useRef<THREE.Vector3 | null>(null);
  const introEndTarget = useRef<THREE.Vector3 | null>(null);
  const introStartedAt = useRef<number | null>(null);
  const snapped = useRef(false);
  const dampedTarget = useRef<THREE.Vector3 | null>(null);
  const INTRO_SEC = 1.2;
  const BEHIND = 9.0;
  const HEIGHT = 5.5;
  const ACTOR_LOOK_Y = 1.1;

  // Ease-out cubic — fast at the start, settles into the chase pose.
  function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
  }

  // Cutaway state — read inside useFrame for fresh values per frame.
  // (Subscribing to the store would re-render this whole component every
  // tick which we want to avoid in a per-frame controller.)
  const CUTAWAY_DURATION_SEC = 1.4;

  useFrame((_, delta) => {
    if (!following || !orbit) return;
    const s = sampleActor(floor);
    if (!s) return;
    const desiredTarget = new THREE.Vector3(s.pos.x, ACTOR_LOOK_Y, s.pos.z);

    // ── Cinematic cutaway ─────────────────────────────────────────────
    // While a cutaway is active, hijack the camera to render through the
    // cutaway camera's POV. When the cut expires, snap the chase camera
    // back into its chase pose at the actor's current position so the
    // return-to-chase reads as a clean cut, not a wild swing.
    const cutawayCamId = useSimStore.getState().cutawayCamId;
    const cutawayStartedAt = useSimStore.getState().cutawayStartedAt;
    if (cutawayCamId && cutawayStartedAt !== null && floor) {
      const elapsed = (performance.now() - cutawayStartedAt) / 1000;
      if (elapsed < CUTAWAY_DURATION_SEC) {
        const cam = floor.devices.find(
          (d) => d.id === cutawayCamId && d.type === "camera",
        );
        if (cam) {
          // Position virtual camera at the security camera's lens.
          const cx = cam.position.x / floor.scale;
          const cz = cam.position.y / floor.scale;
          const cy = cam.mountHeight;
          camera.position.set(cx, cy, cz);
          // Aim at the subject's chest — surveillance feed style.
          orbit.target.set(s.pos.x, ACTOR_LOOK_Y, s.pos.z);
          orbit.update();
          return; // skip normal chase this frame
        }
      } else {
        // Cut is up — clear the state and re-snap chase to current actor
        // pose. Reset dampedTarget so the follow lerp restarts cleanly.
        useSimStore.getState().endCutaway();
        camera.position.set(
          s.pos.x - s.forward.x * BEHIND,
          HEIGHT,
          s.pos.z - s.forward.z * BEHIND,
        );
        orbit.target.set(s.pos.x, ACTOR_LOOK_Y, s.pos.z);
        orbit.update();
        dampedTarget.current = desiredTarget.clone();
        return;
      }
    }

    // First sampleable frame — set up the intro.
    if (!snapped.current) {
      introStartPos.current = camera.position.clone();
      introStartTarget.current = orbit.target.clone();
      introEndPos.current = new THREE.Vector3(
        s.pos.x - s.forward.x * BEHIND,
        HEIGHT,
        s.pos.z - s.forward.z * BEHIND,
      );
      introEndTarget.current = desiredTarget.clone();
      introStartedAt.current = performance.now();
      snapped.current = true;
      return;
    }

    // INTRO phase — ease camera + target from start → end pose.
    if (introStartedAt.current !== null) {
      const elapsed = (performance.now() - introStartedAt.current) / 1000;
      const k = Math.min(1, elapsed / INTRO_SEC);
      const e = easeOutCubic(k);
      // End-of-intro pose adjusts continuously to the moving subject so the
      // landing pose still feels chase-correct even at intro end.
      const liveEndPos = new THREE.Vector3(
        s.pos.x - s.forward.x * BEHIND,
        HEIGHT,
        s.pos.z - s.forward.z * BEHIND,
      );
      camera.position.lerpVectors(introStartPos.current!, liveEndPos, e);
      orbit.target.lerpVectors(introStartTarget.current!, desiredTarget, e);
      orbit.update();
      if (k >= 1) {
        introStartedAt.current = null;
        dampedTarget.current = desiredTarget.clone();
      }
      return;
    }

    // FOLLOW phase — exponential damping lerp (frame-rate aware). The
    // higher the damping coefficient, the snappier; lower = more drift.
    if (!dampedTarget.current) {
      dampedTarget.current = desiredTarget.clone();
    }
    const damping = 4.5; // ~halflife ≈ 150ms
    const alpha = 1 - Math.exp(-damping * delta);
    const newTarget = dampedTarget.current
      .clone()
      .lerp(desiredTarget, alpha);
    const moveDelta = newTarget.clone().sub(dampedTarget.current);
    camera.position.add(moveDelta);
    orbit.target.add(moveDelta);
    orbit.update();
    dampedTarget.current.copy(newTarget);
  });

  // Forget all cached chase state when follow toggles off so the next
  // session starts with a fresh cinematic intro.
  useEffect(() => {
    if (!following) {
      snapped.current = false;
      introStartedAt.current = null;
      dampedTarget.current = null;
    }
  }, [following]);

  return null;
}
