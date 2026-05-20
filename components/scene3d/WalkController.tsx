"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import type { Wall } from "@/types/design";

interface WalkControllerProps {
  walls: Wall[];
  scale: number;
  spawn: [number, number, number];
  spawnLookAt: [number, number, number];
  onExit: () => void;
}

const PLAYER_RADIUS = 0.3;
const EYE_HEIGHT = 1.65;
const WALK_SPEED = 3.2;
const RUN_SPEED = 6.4;

interface WallSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

function distancePointToSegment(
  px: number,
  pz: number,
  s: WallSegment
): { dist: number; nx: number; nz: number } {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const len2 = dx * dx + dz * dz;
  let t = 0;
  if (len2 > 0) {
    t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / len2));
  }
  const cx = s.ax + t * dx;
  const cz = s.az + t * dz;
  const ox = px - cx;
  const oz = pz - cz;
  const d = Math.hypot(ox, oz);
  return {
    dist: d,
    nx: d > 0 ? ox / d : 1,
    nz: d > 0 ? oz / d : 0,
  };
}

export function WalkController({
  walls,
  scale,
  spawn,
  spawnLookAt,
  onExit,
}: WalkControllerProps) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const [locked, setLocked] = useState(false);
  const [tipsDismissed, setTipsDismissed] = useState(false);

  // Pre-compute wall segments in world (meter) space
  const wallSegments = useRef<WallSegment[]>([]);
  useEffect(() => {
    wallSegments.current = walls.map((w) => ({
      ax: w.start.x / scale,
      az: w.start.y / scale,
      bx: w.end.x / scale,
      bz: w.end.y / scale,
    }));
  }, [walls, scale]);

  // Initial position the camera and orientation
  useEffect(() => {
    camera.position.set(spawn[0], spawn[1], spawn[2]);
    const m = new THREE.Matrix4().lookAt(
      new THREE.Vector3(...spawn),
      new THREE.Vector3(...spawnLookAt),
      new THREE.Vector3(0, 1, 0)
    );
    camera.quaternion.setFromRotationMatrix(m);
    camera.updateMatrixWorld(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Escape") {
        onExit();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onExit]);

  useFrame((_, delta) => {
    if (!locked) return;
    const dt = Math.min(delta, 0.05); // clamp big frame steps

    // Forward / right vectors in horizontal plane
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, new THREE.Vector3(0, 1, 0));

    const speed =
      keys.current["ShiftLeft"] || keys.current["ShiftRight"]
        ? RUN_SPEED
        : WALK_SPEED;

    velocity.current.set(0, 0, 0);
    if (keys.current["KeyW"] || keys.current["ArrowUp"]) {
      velocity.current.addScaledVector(forward.current, speed);
    }
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) {
      velocity.current.addScaledVector(forward.current, -speed);
    }
    if (keys.current["KeyA"] || keys.current["ArrowLeft"]) {
      velocity.current.addScaledVector(right.current, -speed);
    }
    if (keys.current["KeyD"] || keys.current["ArrowRight"]) {
      velocity.current.addScaledVector(right.current, speed);
    }

    if (velocity.current.lengthSq() === 0) return;

    let nextX = camera.position.x + velocity.current.x * dt;
    let nextZ = camera.position.z + velocity.current.z * dt;

    // Wall collision — push out of any wall within PLAYER_RADIUS.
    for (let i = 0; i < wallSegments.current.length; i++) {
      const s = wallSegments.current[i];
      const r = distancePointToSegment(nextX, nextZ, s);
      if (r.dist < PLAYER_RADIUS) {
        const push = PLAYER_RADIUS - r.dist + 0.001;
        nextX += r.nx * push;
        nextZ += r.nz * push;
      }
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;
    camera.position.y = EYE_HEIGHT;
  });

  return (
    <>
      <PointerLockControls
        onLock={() => setLocked(true)}
        onUnlock={() => {
          setLocked(false);
        }}
        domElement={gl.domElement}
      />
      {!tipsDismissed && (
        <WalkHUD
          locked={locked}
          onDismiss={() => setTipsDismissed(true)}
        />
      )}
    </>
  );
}

function WalkHUD({
  locked,
  onDismiss,
}: {
  locked: boolean;
  onDismiss: () => void;
}) {
  // We render plain DOM via portal-like helper: the parent Scene3D renders
  // the HUD div alongside the canvas. To avoid the complexity of a portal we
  // emit a sibling div via the document body and clean up on unmount.
  useEffect(() => {
    const el = document.createElement("div");
    el.id = "walk-hud";
    el.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 60;
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-sans), system-ui, sans-serif;
    `;
    el.innerHTML = `
      <div style="
        pointer-events: auto;
        display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
        padding: 1.25rem 1.5rem;
        background: oklch(0.205 0.01 240 / 0.92);
        border: 1px solid oklch(1 0 0 / 0.07);
        border-radius: 0.85rem;
        backdrop-filter: blur(12px);
        box-shadow: 0 24px 60px -20px oklch(0 0 0 / 0.6);
        color: oklch(0.97 0.005 240);
        max-width: 380px; text-align: center;
      ">
        <div style="font-size: 0.95rem; font-weight: 500; letter-spacing: -0.005em;">
          ${
            locked
              ? "Walking — click outside or press Esc to exit"
              : "Click to enter walkthrough mode"
          }
        </div>
        <div style="font-size: 0.82rem; color: oklch(0.72 0.012 240); line-height: 1.55;">
          ${
            locked
              ? "<span style='font-family: var(--font-mono); background: oklch(1 0 0 / 0.08); padding: 1px 6px; border-radius: 4px;'>WASD</span> move &middot; mouse to look &middot; <span style='font-family: var(--font-mono); background: oklch(1 0 0 / 0.08); padding: 1px 6px; border-radius: 4px;'>Shift</span> run"
              : "WASD to move, mouse to look, Shift to run. Walls block you. Press Esc anytime to return."
          }
        </div>
        <button id="walk-hud-dismiss" style="
          margin-top: 0.25rem;
          background: oklch(0.78 0.135 158);
          color: oklch(0.145 0 0);
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.55rem;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
        ">
          ${locked ? "Got it" : "Click here to lock the cursor"}
        </button>
      </div>
    `;
    document.body.appendChild(el);
    const btn = el.querySelector("#walk-hud-dismiss") as HTMLButtonElement;
    if (btn) {
      btn.onclick = () => {
        if (locked) {
          onDismiss();
        } else {
          // Trigger pointer lock by clicking the WebGL canvas
          const canvas = document.querySelector(
            "canvas"
          ) as HTMLCanvasElement | null;
          canvas?.requestPointerLock?.();
        }
      };
    }
    return () => {
      el.remove();
    };
  }, [locked, onDismiss]);
  return null;
}
