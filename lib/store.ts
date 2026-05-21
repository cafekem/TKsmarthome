"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { temporal } from "zundo";
import type {
  DesignDocument,
  Device,
  DevicePhoto,
  DeviceType,
  Door,
  Floor,
  InstallStatus,
  ThreeDMode,
  Vec2,
  ViewMode,
  Wall,
} from "@/types/design";
import {
  CAMERA_DEFAULTS,
  NETWORK_DEFAULTS,
  READER_DEFAULTS,
  SENSOR_DEFAULTS,
} from "@/types/design";
import { buildDemoFloor } from "./demo-design";
import { DEFAULT_QUOTE_SETTINGS, type QuoteSettings } from "./pricing";
import { type CatalogProduct } from "./catalog";

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function createDefaultFloor(): Floor {
  return {
    id: uid("floor"),
    name: "Ground floor",
    index: 0,
    planImage: null,
    scale: 50,
    ceilingHeight: 2.7,
    walls: [],
    devices: [],
    doors: [],
  };
}

export function createDefaultDesign(id?: string): DesignDocument {
  const floor = createDefaultFloor();
  return {
    id: id ?? uid("design"),
    name: "Untitled design",
    createdAt: nowISO(),
    updatedAt: nowISO(),
    floors: [floor],
    activeFloorId: floor.id,
  };
}

export type Tool = "select" | "wall" | "calibrate" | "door";

export interface ViewTransform {
  scale: number;
  offset: Vec2;
}

/** Which device categories are currently visible on the canvas. */
export interface VisibilityFilter {
  byType: Record<DeviceType, boolean>;
  byStatus: Record<InstallStatus, boolean>;
}

export const DEFAULT_VISIBILITY: VisibilityFilter = {
  byType: { camera: true, reader: true, sensor: true, network: true },
  byStatus: { proposed: true, installed: true, decommissioned: false },
};

interface DesignState {
  designs: Record<string, DesignDocument>;
  currentDesignId: string | null;
  viewMode: ViewMode;
  threeDMode: ThreeDMode;
  selectedDeviceId: string | null;
  tool: Tool;
  showCoverage: boolean;
  viewTransform: ViewTransform;
  quoteSettings: QuoteSettings;
  aiSurveyOpen: boolean;
  aiAdvisorOpen: boolean;
  aiChatOpen: boolean;
  visibility: VisibilityFilter;
  /** When the user drops the "Pegman" character on the 3D scene, we
      store the world-space drop point here. The 3D scene reads it as
      the walk-mode spawn, replacing the auto-computed default. */
  walkSpawnOverride: [number, number, number] | null;

  ensureDesign(id: string): DesignDocument;
  setCurrentDesign(id: string): void;
  updateDesignName(id: string, name: string): void;
  updateQuoteSettings(partial: Partial<QuoteSettings>): void;
  importDesign(design: DesignDocument): void;

  setViewMode(mode: ViewMode): void;
  setThreeDMode(mode: ThreeDMode): void;
  selectDevice(deviceId: string | null): void;
  setTool(tool: Tool): void;
  toggleCoverage(): void;
  setViewTransform(t: ViewTransform): void;
  setAISurveyOpen(open: boolean): void;
  setAIAdvisorOpen(open: boolean): void;
  setAIChatOpen(open: boolean): void;
  setWalkSpawnOverride(spawn: [number, number, number] | null): void;
  toggleDeviceTypeVisible(type: DeviceType): void;
  toggleInstallStatusVisible(status: InstallStatus): void;
  /** Bulk-reset to all-on (proposed+installed by default; decommissioned off). */
  resetVisibility(): void;
  /** Photos: add/remove on a specific device. */
  addDevicePhoto(floorId: string, deviceId: string, photo: DevicePhoto): void;
  removeDevicePhoto(floorId: string, deviceId: string, photoId: string): void;

  addFloor(): void;
  setActiveFloor(floorId: string): void;
  updateFloor(floorId: string, partial: Partial<Omit<Floor, "id">>): void;

  addDevice(floorId: string, type: DeviceType, position: Vec2, catalogProduct?: CatalogProduct): Device;
  updateDevice(floorId: string, deviceId: string, partial: Partial<Device>): void;
  removeDevice(floorId: string, deviceId: string): void;

  addWall(floorId: string, wall: Omit<Wall, "id">): void;
  removeWall(floorId: string, wallId: string): void;

  addDoor(floorId: string, door: Omit<Door, "id">): Door;
  updateDoor(floorId: string, doorId: string, partial: Partial<Door>): void;
  removeDoor(floorId: string, doorId: string): void;

  loadDemo(): void;
}

function defaultsFor(type: DeviceType): Omit<Device, "id" | "position"> {
  switch (type) {
    case "camera":
      return CAMERA_DEFAULTS;
    case "reader":
      return READER_DEFAULTS;
    case "sensor":
      return SENSOR_DEFAULTS;
    case "network":
      return NETWORK_DEFAULTS;
  }
}

export const useDesignStore = create<DesignState>()(
  persist(
    temporal(
      (set, get) => ({
        designs: {},
        currentDesignId: null,
        viewMode: "2d",
        threeDMode: "orbit",
        selectedDeviceId: null,
        tool: "select",
        showCoverage: true,
        viewTransform: { scale: 1, offset: { x: 0, y: 0 } },
        quoteSettings: DEFAULT_QUOTE_SETTINGS,
        aiSurveyOpen: false,
        aiAdvisorOpen: false,
        aiChatOpen: false,
        visibility: DEFAULT_VISIBILITY,
        walkSpawnOverride: null,

        ensureDesign(id) {
          const existing = get().designs[id];
          if (existing) return existing;
          const fresh = createDefaultDesign(id);
          set((state) => ({
            designs: { ...state.designs, [id]: fresh },
            currentDesignId: id,
          }));
          return fresh;
        },

        setCurrentDesign(id) {
          set({ currentDesignId: id });
        },

        updateDesignName(id, name) {
          set((state) => {
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: { ...design, name, updatedAt: nowISO() },
              },
            };
          });
        },

        updateQuoteSettings(partial) {
          set((state) => ({
            quoteSettings: { ...state.quoteSettings, ...partial },
          }));
        },

        importDesign(design) {
          set((state) => ({
            designs: { ...state.designs, [design.id]: design },
            currentDesignId: design.id,
          }));
        },

        setViewMode(mode) {
          set({ viewMode: mode });
        },

        setThreeDMode(mode) {
          set({ threeDMode: mode });
        },

        selectDevice(deviceId) {
          set({ selectedDeviceId: deviceId });
        },

        setTool(tool) {
          set({ tool });
        },

        toggleCoverage() {
          set((state) => ({ showCoverage: !state.showCoverage }));
        },

        setViewTransform(t) {
          set({ viewTransform: t });
        },

        setAISurveyOpen(open) {
          set({ aiSurveyOpen: open });
        },

        setAIAdvisorOpen(open) {
          set({ aiAdvisorOpen: open });
        },

        setAIChatOpen(open) {
          set({ aiChatOpen: open });
        },

        setWalkSpawnOverride(spawn) {
          set({ walkSpawnOverride: spawn });
        },

        toggleDeviceTypeVisible(type) {
          set((state) => ({
            visibility: {
              ...state.visibility,
              byType: {
                ...state.visibility.byType,
                [type]: !state.visibility.byType[type],
              },
            },
          }));
        },

        toggleInstallStatusVisible(status) {
          set((state) => ({
            visibility: {
              ...state.visibility,
              byStatus: {
                ...state.visibility.byStatus,
                [status]: !state.visibility.byStatus[status],
              },
            },
          }));
        },

        resetVisibility() {
          set({ visibility: DEFAULT_VISIBILITY });
        },

        addDevicePhoto(floorId, deviceId, photo) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? {
                          ...f,
                          devices: f.devices.map((d) =>
                            d.id === deviceId
                              ? { ...d, photos: [...(d.photos ?? []), photo] }
                              : d,
                          ),
                        }
                      : f,
                  ),
                  updatedAt: nowISO(),
                },
              },
            };
          });
        },

        removeDevicePhoto(floorId, deviceId, photoId) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? {
                          ...f,
                          devices: f.devices.map((d) =>
                            d.id === deviceId
                              ? {
                                  ...d,
                                  photos: (d.photos ?? []).filter(
                                    (p) => p.id !== photoId,
                                  ),
                                }
                              : d,
                          ),
                        }
                      : f,
                  ),
                  updatedAt: nowISO(),
                },
              },
            };
          });
        },

        addFloor() {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            const newFloor: Floor = {
              ...createDefaultFloor(),
              name: `Level ${design.floors.length}`,
              index: design.floors.length,
            };
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: [...design.floors, newFloor],
                  activeFloorId: newFloor.id,
                  updatedAt: nowISO(),
                },
              },
            };
          });
        },

        setActiveFloor(floorId) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: { ...design, activeFloorId: floorId },
              },
            };
          });
        },

        updateFloor(floorId, partial) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId ? { ...f, ...partial } : f
                  ),
                  updatedAt: nowISO(),
                },
              },
            };
          });
        },

        addDevice(floorId, type, position, catalogProduct) {
          const base = defaultsFor(type);
          const override: Record<string, unknown> = {};
          if (catalogProduct) {
            override.catalogId = catalogProduct.id;
            override.label = catalogProduct.fullName;
            if (catalogProduct.specs.fovDegrees != null) override.fovDegrees = catalogProduct.specs.fovDegrees;
            if (catalogProduct.specs.rangeMeters != null) override.rangeMeters = catalogProduct.specs.rangeMeters;
            if (catalogProduct.specs.irRange != null) override.irRange = catalogProduct.specs.irRange;
            if (catalogProduct.specs.resolution) override.resolution = catalogProduct.specs.resolution;
            if (catalogProduct.specs.coverageMeters != null) override.coverageMeters = catalogProduct.specs.coverageMeters;
            if (catalogProduct.specs.portCount != null) override.portCount = catalogProduct.specs.portCount;
            if (type === "camera") {
              override.cameraType = catalogProduct.subcategory;
              // Auto-generate lenses for multi-sensor cameras
              if (catalogProduct.subcategory === "multi-sensor" && catalogProduct.specs.lensCount) {
                const count = catalogProduct.specs.lensCount;
                const fov = catalogProduct.specs.fovDegrees ?? 90;
                const range = catalogProduct.specs.rangeMeters ?? 15;
                const lenses = [];
                for (let i = 0; i < count; i++) {
                  lenses.push({
                    id: uid("lens"),
                    label: `Lens ${i + 1}`,
                    fovDegrees: fov,
                    rangeMeters: range,
                    rotationOffset: (i * 2 * Math.PI) / count,
                    irRange: catalogProduct.specs.irRange,
                    resolution: catalogProduct.specs.resolution,
                  });
                }
                override.lenses = lenses;
              }
            }
            if (type === "reader") override.readerType = catalogProduct.subcategory;
            if (type === "sensor") override.sensorType = catalogProduct.subcategory;
            if (type === "network") override.networkType = catalogProduct.subcategory;
          }
          const newDevice: Device = {
            ...base,
            ...override,
            id: uid("dev"),
            position,
          } as Device;
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? { ...f, devices: [...f.devices, newDevice] }
                      : f
                  ),
                  updatedAt: nowISO(),
                },
              },
              selectedDeviceId: newDevice.id,
            };
          });
          return newDevice;
        },

        updateDevice(floorId, deviceId, partial) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? {
                          ...f,
                          devices: f.devices.map((d) =>
                            d.id === deviceId
                              ? ({ ...d, ...partial } as Device)
                              : d
                          ),
                        }
                      : f
                  ),
                  updatedAt: nowISO(),
                },
              },
            };
          });
        },

        removeDevice(floorId, deviceId) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? {
                          ...f,
                          devices: f.devices.filter((d) => d.id !== deviceId),
                        }
                      : f
                  ),
                  updatedAt: nowISO(),
                },
              },
              selectedDeviceId:
                state.selectedDeviceId === deviceId
                  ? null
                  : state.selectedDeviceId,
            };
          });
        },

        addWall(floorId, wall) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            const newWall: Wall = { ...wall, id: uid("wall") };
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? { ...f, walls: [...f.walls, newWall] }
                      : f
                  ),
                  updatedAt: nowISO(),
                },
              },
            };
          });
        },

        removeWall(floorId, wallId) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? { ...f, walls: f.walls.filter((w) => w.id !== wallId) }
                      : f
                  ),
                  updatedAt: nowISO(),
                },
              },
            };
          });
        },

        addDoor(floorId, door) {
          const newDoor: Door = { ...door, id: uid("door") };
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? { ...f, doors: [...(f.doors ?? []), newDoor] }
                      : f,
                  ),
                  updatedAt: nowISO(),
                },
              },
            };
          });
          return newDoor;
        },

        updateDoor(floorId, doorId, partial) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? {
                          ...f,
                          doors: (f.doors ?? []).map((d) =>
                            d.id === doorId ? { ...d, ...partial } : d,
                          ),
                        }
                      : f,
                  ),
                  updatedAt: nowISO(),
                },
              },
            };
          });
        },

        removeDoor(floorId, doorId) {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  floors: design.floors.map((f) =>
                    f.id === floorId
                      ? {
                          ...f,
                          doors: (f.doors ?? []).filter((d) => d.id !== doorId),
                          // Also clear any reader that controlled this door.
                          devices: f.devices.map((dev) =>
                            dev.type === "reader" &&
                            dev.controlsDoorId === doorId
                              ? { ...dev, controlsDoorId: undefined }
                              : dev,
                          ),
                        }
                      : f,
                  ),
                  updatedAt: nowISO(),
                },
              },
            };
          });
        },

        loadDemo() {
          set((state) => {
            const id = state.currentDesignId;
            if (!id) return state;
            const design = state.designs[id];
            if (!design) return state;
            const demoFloor: Floor = {
              ...buildDemoFloor(),
              id: uid("floor"),
              index: 0,
            };
            return {
              designs: {
                ...state.designs,
                [id]: {
                  ...design,
                  name: "Demo office",
                  floors: [demoFloor],
                  activeFloorId: demoFloor.id,
                  updatedAt: nowISO(),
                },
              },
              selectedDeviceId: null,
              viewMode: "2d",
              viewTransform: { scale: 1, offset: { x: 0, y: 0 } },
            };
          });
        },
      }),
      {
        limit: 50,
        partialize: (state) => ({ designs: state.designs }),
        equality: (a, b) => a.designs === b.designs,
      }
    ),
    {
      name: "deeper-vision-store",
      version: 5,
      // v3 → v4: added installStatus, photos, warrantyUntil, lastInspectionAt,
      //          endOfLifeAt to every device.
      // v4 → v5: added Floor.doors[]. Initialize to empty array on old floors.
      migrate: (persistedState, fromVersion) => {
        const state = persistedState as {
          designs?: Record<string, DesignDocument>;
        };
        if (!state?.designs) return state;
        if (fromVersion < 4) {
          for (const design of Object.values(state.designs)) {
            for (const floor of design.floors ?? []) {
              for (const device of floor.devices ?? []) {
                const d = device as Device & {
                  installStatus?: InstallStatus;
                  photos?: DevicePhoto[];
                };
                if (d.installStatus === undefined) d.installStatus = "proposed";
                if (!Array.isArray(d.photos)) d.photos = [];
              }
            }
          }
        }
        if (fromVersion < 5) {
          for (const design of Object.values(state.designs)) {
            for (const floor of design.floors ?? []) {
              const f = floor as Floor & { doors?: unknown };
              if (!Array.isArray(f.doors)) f.doors = [];
            }
          }
        }
        return state;
      },
      partialize: (state) => ({
        designs: state.designs,
        currentDesignId: state.currentDesignId,
        viewMode: state.viewMode,
        threeDMode: state.threeDMode,
        showCoverage: state.showCoverage,
        quoteSettings: state.quoteSettings,
        visibility: state.visibility,
      }),
    }
  )
);

export function useCurrentDesign(): DesignDocument | null {
  const id = useDesignStore((s) => s.currentDesignId);
  const designs = useDesignStore((s) => s.designs);
  return id ? designs[id] ?? null : null;
}

export function useActiveFloor(): Floor | null {
  const design = useCurrentDesign();
  if (!design) return null;
  return design.floors.find((f) => f.id === design.activeFloorId) ?? null;
}
