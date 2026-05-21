import type {
  Device,
  Floor,
} from "@/types/design";
import { getProduct } from "./catalog";

export interface ModelEntry {
  id: string;
  displayName: string;
  vendor: string;
  unitPrice: number;
  laborHours: number;
}

const FALLBACK_MODELS: Record<string, ModelEntry> = {
  dome:           { id: "dome-generic",    displayName: "Dome Camera",           vendor: "Generic", unitPrice: 280,  laborHours: 1.5  },
  bullet:         { id: "bullet-generic",  displayName: "Bullet Camera",         vendor: "Generic", unitPrice: 320,  laborHours: 1.75 },
  ptz:            { id: "ptz-generic",     displayName: "PTZ Camera",            vendor: "Generic", unitPrice: 1480, laborHours: 2.5  },
  fixed:          { id: "fixed-generic",   displayName: "Fixed Camera",          vendor: "Generic", unitPrice: 320,  laborHours: 1.75 },
  fisheye:        { id: "fisheye-generic", displayName: "Fisheye Camera",        vendor: "Generic", unitPrice: 640,  laborHours: 1.5  },
  "multi-sensor": { id: "multi-generic",   displayName: "Multi-Sensor Camera",   vendor: "Generic", unitPrice: 1800, laborHours: 3.0  },
  mini:           { id: "mini-generic",    displayName: "Mini Camera",           vendor: "Generic", unitPrice: 350,  laborHours: 1.0  },
  modular:        { id: "modular-generic", displayName: "Modular Camera",        vendor: "Generic", unitPrice: 280,  laborHours: 1.0  },
  card:           { id: "card-generic",    displayName: "Card Reader",           vendor: "Generic", unitPrice: 170,  laborHours: 1.25 },
  biometric:      { id: "bio-generic",     displayName: "Biometric Reader",      vendor: "Generic", unitPrice: 520,  laborHours: 1.75 },
  keypad:         { id: "keypad-generic",  displayName: "Keypad Reader",         vendor: "Generic", unitPrice: 120,  laborHours: 1.25 },
  controller:     { id: "ctrl-generic",    displayName: "Door Controller",       vendor: "Generic", unitPrice: 680,  laborHours: 2.0  },
  lock:           { id: "lock-generic",    displayName: "Electronic Lock",       vendor: "Generic", unitPrice: 380,  laborHours: 1.5  },
  motion:         { id: "motion-generic",  displayName: "Motion Sensor",         vendor: "Generic", unitPrice: 45,   laborHours: 0.75 },
  "glass-break":  { id: "glass-generic",   displayName: "Glass-Break Sensor",    vendor: "Generic", unitPrice: 60,   laborHours: 0.5  },
  "door-contact": { id: "contact-generic", displayName: "Door Contact",          vendor: "Generic", unitPrice: 25,   laborHours: 0.25 },
  smoke:          { id: "smoke-generic",   displayName: "Smoke Detector",        vendor: "Generic", unitPrice: 35,   laborHours: 0.75 },
  heat:           { id: "heat-generic",    displayName: "Heat Detector",         vendor: "Generic", unitPrice: 30,   laborHours: 0.75 },
  notification:   { id: "notif-generic",   displayName: "Notification Appliance", vendor: "Generic", unitPrice: 85,   laborHours: 0.75 },
  "access-point": { id: "ap-generic",      displayName: "Wi-Fi Access Point",    vendor: "Generic", unitPrice: 350,  laborHours: 1.0  },
  switch:         { id: "switch-generic",  displayName: "PoE Switch",            vendor: "Generic", unitPrice: 700,  laborHours: 2.0  },
  nvr:            { id: "nvr-generic",     displayName: "NVR",                   vendor: "Generic", unitPrice: 850,  laborHours: 3.0  },
};

function subtypeOf(device: Device): string {
  switch (device.type) {
    case "camera":  return device.cameraType;
    case "reader":  return device.readerType;
    case "sensor":  return device.sensorType;
    case "network": return device.networkType;
  }
}

export function modelFor(device: Device): ModelEntry {
  if (device.catalogId) {
    const product = getProduct(device.catalogId);
    if (product) {
      return {
        id: product.id,
        displayName: product.fullName,
        vendor: product.manufacturer,
        unitPrice: product.streetPrice,
        laborHours: product.laborHours,
      };
    }
  }
  return FALLBACK_MODELS[subtypeOf(device)] ?? FALLBACK_MODELS.dome;
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
