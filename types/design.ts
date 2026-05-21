export type Vec2 = { x: number; y: number };

export type ViewMode = "2d" | "3d" | "sim";
export type ThreeDMode = "orbit" | "walk" | "pov";

export type DeviceType = "camera" | "reader" | "sensor" | "network";

export type CameraSubtype = "fixed" | "ptz" | "dome" | "fisheye" | "bullet" | "multi-sensor" | "mini" | "modular";
export type ReaderSubtype = "card" | "biometric" | "keypad" | "controller" | "lock";
export type SensorSubtype = "motion" | "glass-break" | "door-contact" | "smoke" | "heat" | "notification";
export type NetworkSubtype = "switch" | "access-point" | "nvr";

/**
 * Install lifecycle stage for a device.
 *  - "proposed":      planned but not yet installed (the default for new drops)
 *  - "installed":     physically mounted and commissioned
 *  - "decommissioned": removed/retired; kept on the plan for history
 */
export type InstallStatus = "proposed" | "installed" | "decommissioned";

/**
 * A photo captured during a site survey (or attached during desk design).
 * `dataUrl` keeps everything client-side so the design file is self-contained.
 */
export interface DevicePhoto {
  id: string;
  /** base64 data URL — keeps the design self-contained and offline-friendly */
  dataUrl: string;
  caption?: string;
  /** ISO timestamp when the photo was added */
  takenAt: string;
}

export interface DeviceBase {
  id: string;
  catalogId?: string;
  position: Vec2;
  rotation: number;
  mountHeight: number;
  label: string;
  notes: string;
  /** Lifecycle stage. Defaults to "proposed" on creation. */
  installStatus: InstallStatus;
  /** Site-walk + install photos attached to this device. */
  photos: DevicePhoto[];
  /** ISO date string (YYYY-MM-DD) when device warranty expires. */
  warrantyUntil?: string;
  /** ISO date string for the most recent inspection. */
  lastInspectionAt?: string;
  /** ISO date string for projected end-of-life / replacement. */
  endOfLifeAt?: string;
}

/**
 * Individual lens on a multi-sensor camera. Each lens has its own FOV,
 * range, and rotation offset relative to the device's base rotation.
 * For single-lens cameras, the `lenses` array is omitted and the
 * top-level fovDegrees/rangeMeters are used directly.
 */
export interface CameraLens {
  id: string;
  label: string;
  fovDegrees: number;
  rangeMeters: number;
  /** Rotation offset in radians relative to the device's base rotation */
  rotationOffset: number;
  irRange?: number;
  resolution?: string;
}

export interface CameraDevice extends DeviceBase {
  type: "camera";
  cameraType: CameraSubtype;
  model: string;
  fovDegrees: number;
  rangeMeters: number;
  irRange?: number;
  resolution?: string;
  /** Multi-sensor cameras have multiple lenses with independent FOV/rotation */
  lenses?: CameraLens[];
}

export interface ReaderDevice extends DeviceBase {
  type: "reader";
  readerType: ReaderSubtype;
  controlsDoorId?: string;
}

export interface SensorDevice extends DeviceBase {
  type: "sensor";
  sensorType: SensorSubtype;
  rangeMeters: number;
}

export interface NetworkDeviceBase extends DeviceBase {
  type: "network";
  networkType: NetworkSubtype;
  /** Access-point only: wireless coverage radius in meters. */
  coverageMeters?: number;
  /** Switch or NVR: number of physical ports / camera channels. */
  portCount?: number;
  /** Switch only: total PoE power budget in watts. */
  poeBudgetW?: number;
  /** NVR only: storage capacity in TB and recording-retention days. */
  storageTb?: number;
  retentionDays?: number;
  /** Wi-Fi standard for APs ("Wi-Fi 6" / "Wi-Fi 7" / etc.) */
  wifiStandard?: string;
}

export type Device =
  | CameraDevice
  | ReaderDevice
  | SensorDevice
  | NetworkDeviceBase;

export interface Wall {
  id: string;
  start: Vec2;
  end: Vec2;
  height: number;
}

/**
 * A door is a real-world opening on a wall segment. We model it as a position
 * (snapped to a wall) plus a rotation (the wall's tangent direction), a width
 * in meters, and a lock state.
 *
 * Readers can be linked to a door via `ReaderDevice.controlsDoorId` so the
 * design tracks 'which reader controls which door' — the System Surveyor
 * pattern.
 */
export interface Door {
  id: string;
  /** Position in floor-plan pixels, snapped to the wall it's mounted on. */
  position: Vec2;
  /** Rotation in radians — points along the wall the door is mounted on. */
  rotation: number;
  /** Door width in real-world meters. */
  widthMeters: number;
  /** Which wall this door sits on. */
  wallId: string;
  /** Whether the door is currently locked. */
  locked: boolean;
  /** Display label. */
  label: string;
  /** Free-form notes (hardware spec, fire rating, etc.). */
  notes: string;
}

/**
 * Pinned annotation on the floor plan — a sticky note the AI (or user) can
 * drop at any point to flag a concern, note an idea, or warn about a
 * constraint. Renders as a small floating marker on the 2D canvas.
 */
export type AnnotationKind = "note" | "warning" | "idea";

export interface Annotation {
  id: string;
  position: Vec2;
  text: string;
  kind: AnnotationKind;
  /** Who created this. "ai" annotations get a small sparkle indicator. */
  author: "user" | "ai";
  createdAt: string;
}

export interface Floor {
  id: string;
  name: string;
  index: number;
  planImage: string | null;
  scale: number;
  ceilingHeight: number;
  walls: Wall[];
  devices: Device[];
  /** Doors placed on walls. Readers can link to specific doors by id. */
  doors: Door[];
  /** Sticky-note annotations the AI or user can drop at any point. */
  annotations: Annotation[];
  /** Optional preset path used by simulation mode. Floor-plan pixel coords. */
  simPath?: Vec2[];
}

export interface DesignDocument {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  floors: Floor[];
  activeFloorId: string;
}

export type SimEventType = "detected" | "lost" | "triggered";

export interface SimEvent {
  timestamp: number;
  type: SimEventType;
  deviceId: string;
  actorPosition: Vec2;
}

export interface SimulationScenario {
  id: string;
  name: string;
  actor: { startPosition: Vec2; speedMs: number };
  path: Vec2[];
  events: SimEvent[];
}

export interface DeviceDefaults {
  label: string;
  rotation: number;
  mountHeight: number;
  notes: string;
}

/** Defaults shared by every device kind — lifecycle, photos, dates. */
const BASE_LIFECYCLE_DEFAULTS = {
  installStatus: "proposed" as InstallStatus,
  photos: [] as DevicePhoto[],
};

export const CAMERA_DEFAULTS: Omit<CameraDevice, "id" | "position"> = {
  type: "camera",
  cameraType: "dome",
  model: "Generic Dome",
  fovDegrees: 90,
  rangeMeters: 12,
  irRange: 15,
  resolution: "4K",
  label: "Camera",
  rotation: 0,
  mountHeight: 2.8,
  notes: "",
  ...BASE_LIFECYCLE_DEFAULTS,
};

export const READER_DEFAULTS: Omit<ReaderDevice, "id" | "position"> = {
  type: "reader",
  readerType: "card",
  label: "Reader",
  rotation: 0,
  mountHeight: 1.2,
  notes: "",
  ...BASE_LIFECYCLE_DEFAULTS,
};

export const SENSOR_DEFAULTS: Omit<SensorDevice, "id" | "position"> = {
  type: "sensor",
  sensorType: "motion",
  rangeMeters: 8,
  label: "Sensor",
  rotation: 0,
  mountHeight: 2.4,
  notes: "",
  ...BASE_LIFECYCLE_DEFAULTS,
};

export const NETWORK_DEFAULTS: Omit<NetworkDeviceBase, "id" | "position"> = {
  type: "network",
  networkType: "access-point",
  coverageMeters: 15,
  label: "Access Point",
  rotation: 0,
  mountHeight: 2.6,
  notes: "",
  ...BASE_LIFECYCLE_DEFAULTS,
};
