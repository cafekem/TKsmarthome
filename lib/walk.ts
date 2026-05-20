import * as THREE from "three";

/**
 * Walk-cycle constants and helpers, ported from the recruit-main project's
 * `lib/room/walk.ts`. The numbers are tuned for a stylized low-poly character
 * — bigger bob/swing than realistic but still readable as walking.
 */
export const WALK_SPEED = 1.4; // meters/second (matches our sim default)
export const WALK_FREQ = 6.5; // cycle frequency
export const BOB_AMPLITUDE = 0.06; // vertical bob in meters
export const LIMB_SWING = 0.42; // radians, max swing of limbs
export const YAW_DAMP = 7;

export function phase(t: number, offset = 0): number {
  return Math.sin(t * WALK_FREQ + offset);
}

export function dampYaw(current: number, target: number, delta: number): number {
  return THREE.MathUtils.damp(current, target, YAW_DAMP, delta);
}

/**
 * Build a coherent skin/cloth palette from a single hue, similar to the
 * recruit-main makePalette helper. Returns CSS-color strings.
 */
export function makeOutfitPalette(hue: string) {
  const base = new THREE.Color(hue);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const body = new THREE.Color().setHSL(
    hsl.h,
    Math.min(0.5, hsl.s),
    Math.min(0.6, hsl.l + 0.08)
  );
  const dark = new THREE.Color().setHSL(
    hsl.h,
    hsl.s,
    Math.max(0.12, hsl.l - 0.18)
  );
  const accent = new THREE.Color().setHSL(
    hsl.h,
    Math.min(0.85, hsl.s + 0.15),
    Math.min(0.62, hsl.l + 0.15)
  );
  return {
    body: body.getStyle(),
    dark: dark.getStyle(),
    accent: accent.getStyle(),
  };
}
