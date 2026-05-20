"use client";

import { create } from "zustand";
import type { SimEvent } from "@/types/design";

interface SimState {
  running: boolean;
  speed: number; // playback multiplier
  /** sim time in seconds */
  t: number;
  /** ids of cameras currently detecting */
  detectingCameras: Set<string>;
  /** ids of sensors currently triggered */
  triggeredSensors: Set<string>;
  events: SimEvent[];

  play(): void;
  pause(): void;
  reset(): void;
  setSpeed(speed: number): void;
  tick(dt: number): void;
  setDetection(
    detectingCameras: Set<string>,
    triggeredSensors: Set<string>
  ): void;
  pushEvent(event: SimEvent): void;
}

export const useSimStore = create<SimState>((set) => ({
  running: false,
  speed: 1,
  t: 0,
  detectingCameras: new Set(),
  triggeredSensors: new Set(),
  events: [],

  play() {
    set({ running: true });
  },
  pause() {
    set({ running: false });
  },
  reset() {
    set({
      running: false,
      t: 0,
      detectingCameras: new Set(),
      triggeredSensors: new Set(),
      events: [],
    });
  },
  setSpeed(speed) {
    set({ speed });
  },
  tick(dt) {
    set((s) => ({ t: s.t + dt * s.speed }));
  },
  setDetection(detectingCameras, triggeredSensors) {
    set({ detectingCameras, triggeredSensors });
  },
  pushEvent(event) {
    set((s) => ({ events: [...s.events.slice(-49), event] }));
  },
}));
