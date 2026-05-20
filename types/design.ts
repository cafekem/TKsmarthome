export type Vec2 = { x: number; y: number };

export type ViewMode = "2d" | "3d" | "sim";
export type ThreeDMode = "orbit" | "walk";

export type DeviceType = "camera" | "reader" | "sensor" | "network";

export type CameraSubtype = "fixed" | "ptz" | "dome" | "fisheye";
export type ReaderSubtype = "card" | "biometric" | "keypad";
export type SensorSubtype = "motion" | "glass-break" | "door-contact" | "smoke";
export type NetworkSubtype = "switch" | "access-point" | "nvr";

export interface DeviceBase {
  id: string;
  position: Vec2;
  rotation: number;
  mountHeight: number;
  label: string;
  notes: string;
}

export interface CameraDevice extends DeviceBase {
  type: "camera";
  cameraType: CameraSubtype;
  model: string;
  fovDegrees: number;
  rangeMeters: number;
  irRange?: number;
  resolution?: string;
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
  coverageMeters?: number;
  portCount?: number;
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

export interface Floor {
  id: string;
  name: string;
  index: number;
  planImage: string | null;
  scale: number;
  ceilingHeight: number;
  walls: Wall[];
  devices: Device[];
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
};

export const READER_DEFAULTS: Omit<ReaderDevice, "id" | "position"> = {
  type: "reader",
  readerType: "card",
  label: "Reader",
  rotation: 0,
  mountHeight: 1.2,
  notes: "",
};

export const SENSOR_DEFAULTS: Omit<SensorDevice, "id" | "position"> = {
  type: "sensor",
  sensorType: "motion",
  rangeMeters: 8,
  label: "Sensor",
  rotation: 0,
  mountHeight: 2.4,
  notes: "",
};

export const NETWORK_DEFAULTS: Omit<NetworkDeviceBase, "id" | "position"> = {
  type: "network",
  networkType: "access-point",
  coverageMeters: 15,
  label: "Access Point",
  rotation: 0,
  mountHeight: 2.6,
  notes: "",
};
