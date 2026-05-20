import type {
  Device,
  Floor,
  CameraDevice,
  NetworkDeviceBase,
  ReaderDevice,
  SensorDevice,
} from "@/types/design";

/**
 * Pricing catalog. Numbers are mid-market US-distributor estimates — they're
 * meant to be configurable per integrator, but they're plausible enough that
 * a quote generated with them on a typical small-office design lands in the
 * ballpark of an actual proposal.
 *
 * Editing strategy: an integrator who wants their own numbers can either
 * fork this file or, at runtime, override the rates that live in the
 * QuoteSettings store (labor rate, cabling, commissioning, tax). Per-model
 * unit prices are intentionally NOT user-editable in the UI yet — that's
 * the next milestone (a "Pricing settings" page).
 */

export interface ModelEntry {
  id: string;
  displayName: string;
  vendor: string;
  /** Hardware unit price in USD (distributor → integrator) */
  unitPrice: number;
  /** Installation labor estimate in hours */
  laborHours: number;
}

export const CAMERA_MODELS: Record<
  "dome" | "ptz" | "fixed" | "fisheye",
  ModelEntry
> = {
  dome: {
    id: "dome-4mp",
    displayName: "Indoor Dome — 4MP IR",
    vendor: "Hikvision-class",
    unitPrice: 280,
    laborHours: 1.5,
  },
  ptz: {
    id: "ptz-4k",
    displayName: "PTZ — 4K 25× zoom",
    vendor: "Axis-class",
    unitPrice: 1480,
    laborHours: 2.5,
  },
  fixed: {
    id: "fixed-4mp",
    displayName: "Outdoor Bullet — 4MP IR",
    vendor: "Hikvision-class",
    unitPrice: 320,
    laborHours: 1.75,
  },
  fisheye: {
    id: "fisheye-12mp",
    displayName: "Fisheye 360° — 12MP",
    vendor: "Hanwha-class",
    unitPrice: 640,
    laborHours: 1.5,
  },
};

export const READER_MODELS: Record<
  "card" | "biometric" | "keypad",
  ModelEntry
> = {
  card: {
    id: "reader-card",
    displayName: "Multi-format Card Reader",
    vendor: "HID-class",
    unitPrice: 180,
    laborHours: 1.25,
  },
  biometric: {
    id: "reader-bio",
    displayName: "Biometric Reader (fingerprint + card)",
    vendor: "Suprema-class",
    unitPrice: 540,
    laborHours: 1.75,
  },
  keypad: {
    id: "reader-keypad",
    displayName: "Keypad Reader",
    vendor: "HID-class",
    unitPrice: 120,
    laborHours: 1.25,
  },
};

export const SENSOR_MODELS: Record<
  "motion" | "glass-break" | "door-contact" | "smoke",
  ModelEntry
> = {
  motion: {
    id: "sensor-pir",
    displayName: "PIR Motion Sensor",
    vendor: "Bosch-class",
    unitPrice: 55,
    laborHours: 0.75,
  },
  "glass-break": {
    id: "sensor-glass",
    displayName: "Acoustic Glass-Break",
    vendor: "DSC-class",
    unitPrice: 75,
    laborHours: 0.5,
  },
  "door-contact": {
    id: "sensor-contact",
    displayName: "Door Contact (magnetic)",
    vendor: "Honeywell-class",
    unitPrice: 18,
    laborHours: 0.25,
  },
  smoke: {
    id: "sensor-smoke",
    displayName: "Commercial Smoke Detector",
    vendor: "System Sensor",
    unitPrice: 95,
    laborHours: 0.75,
  },
};

export const NETWORK_MODELS: Record<
  "switch" | "access-point" | "nvr",
  ModelEntry
> = {
  "access-point": {
    id: "ap-wifi6",
    displayName: "Wi-Fi 6 Access Point (PoE)",
    vendor: "Ubiquiti-class",
    unitPrice: 260,
    laborHours: 1.0,
  },
  switch: {
    id: "switch-24p",
    displayName: "24-port Managed PoE+ Switch",
    vendor: "Cisco-class",
    unitPrice: 920,
    laborHours: 2.0,
  },
  nvr: {
    id: "nvr-32ch",
    displayName: "32-channel NVR (8TB)",
    vendor: "Hikvision-class",
    unitPrice: 1450,
    laborHours: 3.0,
  },
};

/** Look up the model entry that applies to a given device. */
export function modelFor(device: Device): ModelEntry {
  switch (device.type) {
    case "camera":
      return CAMERA_MODELS[device.cameraType];
    case "reader":
      return READER_MODELS[device.readerType];
    case "sensor":
      return SENSOR_MODELS[device.sensorType];
    case "network":
      return NETWORK_MODELS[device.networkType];
  }
}

export interface QuoteSettings {
  laborRate: number;
  cablingPerCamera: number;
  cablingPerReader: number;
  commissioningFee: number;
  markupPct: number;
  taxPct: number;
  preparedBy: string;
  clientName: string;
}

export const DEFAULT_QUOTE_SETTINGS: QuoteSettings = {
  laborRate: 95, // USD per hour
  cablingPerCamera: 240, // cable + connectors + terminations per camera run
  cablingPerReader: 150, // less than camera since reader is lower voltage
  commissioningFee: 850, // fixed system programming / testing
  markupPct: 0,
  taxPct: 8.5,
  preparedBy: "",
  clientName: "",
};

export interface BoMRow {
  modelId: string;
  displayName: string;
  vendor: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  /** Total install hours for this line (qty × laborHours) */
  laborHours: number;
}

export interface QuoteBreakdown {
  rows: BoMRow[];
  hardwareSubtotal: number;
  laborHoursTotal: number;
  laborSubtotal: number;
  cablingSubtotal: number;
  commissioningFee: number;
  preTaxSubtotal: number;
  markupAmount: number;
  taxAmount: number;
  grandTotal: number;
}

/**
 * Compute a full quote breakdown for the active floor. Walks the device list,
 * groups by model id, multiplies, then layers in labor + cabling +
 * commissioning + markup + tax.
 */
export function computeQuote(
  floor: Floor,
  settings: QuoteSettings = DEFAULT_QUOTE_SETTINGS
): QuoteBreakdown {
  const byModel = new Map<string, BoMRow>();

  for (const device of floor.devices) {
    const model = modelFor(device);
    const row = byModel.get(model.id);
    if (row) {
      row.quantity += 1;
      row.subtotal = round2(row.unitPrice * row.quantity);
      row.laborHours = round2(model.laborHours * row.quantity);
    } else {
      byModel.set(model.id, {
        modelId: model.id,
        displayName: model.displayName,
        vendor: model.vendor,
        unitPrice: model.unitPrice,
        quantity: 1,
        subtotal: model.unitPrice,
        laborHours: model.laborHours,
      });
    }
  }

  const rows = Array.from(byModel.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  const hardwareSubtotal = round2(
    rows.reduce((sum, r) => sum + r.subtotal, 0)
  );
  const laborHoursTotal = round2(
    rows.reduce((sum, r) => sum + r.laborHours, 0)
  );
  const laborSubtotal = round2(laborHoursTotal * settings.laborRate);

  // Cabling: per-camera + per-reader runs
  const cameraCount = floor.devices.filter((d) => d.type === "camera").length;
  const readerCount = floor.devices.filter((d) => d.type === "reader").length;
  const cablingSubtotal = round2(
    cameraCount * settings.cablingPerCamera +
      readerCount * settings.cablingPerReader
  );

  const baseSubtotal = round2(
    hardwareSubtotal + laborSubtotal + cablingSubtotal + settings.commissioningFee
  );
  const markupAmount = round2((baseSubtotal * settings.markupPct) / 100);
  const preTaxSubtotal = round2(baseSubtotal + markupAmount);
  const taxAmount = round2((preTaxSubtotal * settings.taxPct) / 100);
  const grandTotal = round2(preTaxSubtotal + taxAmount);

  return {
    rows,
    hardwareSubtotal,
    laborHoursTotal,
    laborSubtotal,
    cablingSubtotal,
    commissioningFee: settings.commissioningFee,
    preTaxSubtotal,
    markupAmount,
    taxAmount,
    grandTotal,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}
