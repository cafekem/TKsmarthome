/**
 * Floor-plan PDF export, BOM CSV, and device-schedule CSV for DeeperVision.
 *
 * These exports are the deliverables integrators hand to clients and install
 * crews, so they need to look professional and be complete.
 */

import jsPDF from "jspdf";
import type {
  DesignDocument,
  Floor,
  Device,
  CameraDevice,
  SensorDevice,
  NetworkDeviceBase,
  Wall,
  Vec2,
} from "@/types/design";
import { getProduct, type CatalogProduct } from "./catalog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Device-type accent colors (hex). */
const TYPE_COLORS: Record<Device["type"], string> = {
  camera: "#10b981",
  reader: "#38bdf8",
  sensor: "#fbbf24",
  network: "#a78bfa",
};

/** Human labels for device types. */
const TYPE_LABELS: Record<Device["type"], string> = {
  camera: "Camera",
  reader: "Access Control",
  sensor: "Sensor",
  network: "Network",
};

/** Friendly subcategory labels used in the device schedule. */
function subcategoryLabel(device: Device): string {
  switch (device.type) {
    case "camera":
      return device.cameraType;
    case "reader":
      return device.readerType;
    case "sensor":
      return device.sensorType;
    case "network":
      return device.networkType;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a hex color string (#rrggbb) into [r,g,b] 0-255. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Resolve catalog product for a device, if any. */
function resolveProduct(device: Device): CatalogProduct | undefined {
  if (device.catalogId) return getProduct(device.catalogId);
  return undefined;
}

/** Trigger a browser download of a text blob. */
function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Escape a value for CSV — wraps in double-quotes if needed. */
function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from a header array and rows. */
function buildCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

/** Format a number as currency. */
function fmtCurrency(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format date as YYYY-MM-DD. */
function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Compute the axis-aligned bounding box of all geometry on a floor.
 * Returns { minX, minY, maxX, maxY } in floor-plan pixel coordinates.
 * Falls back to a default box if the floor has nothing.
 */
function computeBounds(floor: Floor): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const w of floor.walls) {
    xs.push(w.start.x, w.end.x);
    ys.push(w.start.y, w.end.y);
  }
  for (const d of floor.devices) {
    xs.push(d.position.x);
    ys.push(d.position.y);

    // Include device coverage/range in bounding box so arcs fit
    const rangePx = deviceRangePixels(d, floor.scale);
    if (rangePx > 0) {
      xs.push(d.position.x - rangePx, d.position.x + rangePx);
      ys.push(d.position.y - rangePx, d.position.y + rangePx);
    }
  }

  if (xs.length === 0 || ys.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  }

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/** Get the coverage/range of a device in floor-plan pixels. */
function deviceRangePixels(device: Device, scale: number): number {
  switch (device.type) {
    case "camera":
      return device.rangeMeters * scale;
    case "sensor":
      return device.rangeMeters * scale;
    case "network":
      return (device.coverageMeters ?? 0) * scale;
    default:
      return 0;
  }
}

/** Sort order for device types (used in grouping). */
const TYPE_SORT_ORDER: Record<Device["type"], number> = {
  camera: 0,
  reader: 1,
  sensor: 2,
  network: 3,
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface PDFExportOptions {
  preparedBy?: string;
  preparedFor?: string;
  companyName?: string;
  projectNumber?: string;
  /** Company logo as a data URL (PNG/JPEG). Rendered on the cover page. */
  companyLogoDataUrl?: string;
  /** Optional hex brand color used for the cover divider + headings. */
  brandColor?: string;
  /** Optional one-line footer (terms, license number, contact info). */
  printFooter?: string;
}

// ---------------------------------------------------------------------------
// 1. exportFloorPlanPDF
// ---------------------------------------------------------------------------

/**
 * Generate a professional install-ready PDF of a single floor plan.
 *
 * - Page 1: Cover page with project information and device summary
 * - Page 2+: Floor plan drawing with devices, coverage, legend, scale bar
 * - Last page: Device schedule table
 */
export async function exportFloorPlanPDF(
  design: DesignDocument,
  floor: Floor,
  options?: PDFExportOptions,
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageW = doc.internal.pageSize.getWidth(); // 612pt
  const pageH = doc.internal.pageSize.getHeight(); // 792pt
  const margin = 36; // 0.5"
  const now = new Date();
  const dateStr = fmtDate(now);

  // -----------------------------------------------------------------------
  // Page 1 — Cover
  // -----------------------------------------------------------------------
  drawCoverPage(doc, design, floor, dateStr, pageW, pageH, margin, options);

  // -----------------------------------------------------------------------
  // Page 2 — Floor plan (landscape)
  // -----------------------------------------------------------------------
  doc.addPage("letter", "landscape");
  const lpW = doc.internal.pageSize.getWidth(); // 792pt
  const lpH = doc.internal.pageSize.getHeight(); // 612pt
  drawFloorPlan(doc, floor, design.name, dateStr, lpW, lpH, margin);

  // -----------------------------------------------------------------------
  // Last page — Device schedule table
  // -----------------------------------------------------------------------
  doc.addPage("letter", "portrait");
  drawDeviceSchedule(doc, floor, design.name, dateStr, pageW, pageH, margin);

  // Save
  const safeName = design.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  await doc.save(`${safeName}-floor-plan.pdf`, { returnPromise: true });
}

// ---------------------------------------------------------------------------
// Cover Page
// ---------------------------------------------------------------------------

function drawCoverPage(
  doc: jsPDF,
  design: DesignDocument,
  floor: Floor,
  dateStr: string,
  pw: number,
  ph: number,
  m: number,
  options?: PDFExportOptions,
): void {
  const cx = pw / 2;

  // Determine brand RGB (default = slate-900). Parse the user's hex if present.
  const brand = parseHexToRgb(options?.brandColor) ?? { r: 15, g: 23, b: 42 };

  // Top accent bar — branded color
  doc.setFillColor(brand.r, brand.g, brand.b);
  doc.rect(0, 0, pw, 6, "F");

  // Branding header — company logo if provided, otherwise the platform mark
  if (options?.companyLogoDataUrl) {
    try {
      // Render the logo centered, max 200×60 pt
      const imgFmt = options.companyLogoDataUrl.startsWith("data:image/png")
        ? "PNG"
        : "JPEG";
      doc.addImage(
        options.companyLogoDataUrl,
        imgFmt,
        cx - 100,
        40,
        200,
        60,
        undefined,
        "FAST",
      );
    } catch {
      // If the logo fails to render, fall back to text branding silently.
    }
  } else {
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont("helvetica", "normal");
    doc.text("DEEPER VISION", cx, 72, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Physical Security Design Platform", cx, 88, { align: "center" });
  }

  // Divider — uses brand color, slightly thicker than before
  doc.setDrawColor(brand.r, brand.g, brand.b);
  doc.setLineWidth(0.8);
  doc.line(m + 60, 110, pw - m - 60, 110);

  // Project name
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont("helvetica", "bold");
  doc.text(design.name, cx, 170, { align: "center", maxWidth: pw - m * 2 });

  // Floor name
  doc.setFontSize(16);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont("helvetica", "normal");
  doc.text(floor.name, cx, 200, { align: "center" });

  // Divider
  doc.line(m + 60, 230, pw - m - 60, 230);

  // Info block
  let infoY = 280;
  const labelX = pw / 2 - 80;
  const valueX = pw / 2 + 10;

  const addInfoRow = (label: string, value: string) => {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text(label, labelX, infoY, { align: "right" });
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(value, valueX, infoY);
    infoY += 22;
  };

  addInfoRow("Date", dateStr);
  if (options?.projectNumber) {
    addInfoRow("Project #", options.projectNumber);
  }
  if (options?.preparedBy) {
    addInfoRow("Prepared by", options.preparedBy);
  }
  if (options?.preparedFor) {
    addInfoRow("Prepared for", options.preparedFor);
  }

  // Device summary section
  infoY += 20;
  doc.setDrawColor(226, 232, 240);
  doc.line(m + 60, infoY, pw - m - 60, infoY);
  infoY += 30;

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Device Summary", cx, infoY, { align: "center" });
  infoY += 30;

  // Count by type
  const counts: Record<string, number> = {};
  for (const d of floor.devices) {
    counts[d.type] = (counts[d.type] || 0) + 1;
  }

  const typeOrder: Device["type"][] = ["camera", "reader", "sensor", "network"];
  for (const t of typeOrder) {
    const count = counts[t] || 0;
    if (count === 0) continue;

    const [r, g, b] = hexToRgb(TYPE_COLORS[t]);
    doc.setFillColor(r, g, b);
    doc.circle(cx - 80, infoY - 4, 5, "F");

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${TYPE_LABELS[t]}`, cx - 65, infoY);

    doc.setFont("helvetica", "bold");
    doc.text(`${count}`, cx + 80, infoY);
    infoY += 22;
  }

  // Total
  const total = floor.devices.length;
  infoY += 6;
  doc.setDrawColor(203, 213, 225);
  doc.line(cx - 80, infoY - 12, cx + 100, infoY - 12);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Total Devices", cx - 65, infoY);
  doc.text(`${total}`, cx + 80, infoY);

  // Bottom accent bar (brand color)
  doc.setFillColor(brand.r, brand.g, brand.b);
  doc.rect(0, ph - 6, pw, 6, "F");

  // Footer — custom line if provided, otherwise the platform mark
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  const footerText = options?.printFooter
    ? `${options.printFooter}  |  ${dateStr}  |  Page 1`
    : `Generated by DeeperVision  |  ${dateStr}  |  Page 1`;
  doc.text(footerText, cx, ph - 18, { align: "center" });
}

/**
 * Parse a `#rrggbb` (or `#rgb`) hex string into RGB tuples for jsPDF.
 * Returns null for empty / invalid input so callers can fall back to defaults.
 */
function parseHexToRgb(
  hex: string | undefined,
): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// ---------------------------------------------------------------------------
// Floor Plan Drawing
// ---------------------------------------------------------------------------

function drawFloorPlan(
  doc: jsPDF,
  floor: Floor,
  designName: string,
  dateStr: string,
  pw: number,
  ph: number,
  m: number,
): void {
  // Reserve space for title block at bottom-right
  const titleBlockH = 60;
  const legendW = 130;
  const drawableW = pw - m * 2 - legendW - 10;
  const drawableH = ph - m * 2 - titleBlockH - 10;

  const bounds = computeBounds(floor);
  const floorW = bounds.maxX - bounds.minX;
  const floorH = bounds.maxY - bounds.minY;

  if (floorW <= 0 || floorH <= 0) return;

  // Scale to fit printable area
  const scaleFitX = drawableW / floorW;
  const scaleFitY = drawableH / floorH;
  const scaleFit = Math.min(scaleFitX, scaleFitY) * 0.92; // 8% padding

  const offsetX = m + (drawableW - floorW * scaleFit) / 2;
  const offsetY = m + (drawableH - floorH * scaleFit) / 2;

  // Transform helpers: floor-plan pixel coords -> PDF points
  const tx = (px: number) => offsetX + (px - bounds.minX) * scaleFit;
  const ty = (py: number) => offsetY + (py - bounds.minY) * scaleFit;

  // Create GState for semi-transparent fills
  let gsCoverage: any;
  try {
    // jsPDF GState constructor
    gsCoverage = doc.GState({ opacity: 0.15, "stroke-opacity": 0.3 });
    doc.addGState("coverageState", gsCoverage);
  } catch {
    // Fallback: we will use lighter colors instead
    gsCoverage = null;
  }

  // --- Draw coverage arcs/circles first (behind everything) ---
  for (const device of floor.devices) {
    const rangePx = deviceRangePixels(device, floor.scale);
    if (rangePx <= 0) continue;

    const cx = tx(device.position.x);
    const cy = ty(device.position.y);
    const rPt = rangePx * scaleFit;

    const [cr, cg, cb] = hexToRgb(TYPE_COLORS[device.type]);

    if (device.type === "camera") {
      // Draw FOV wedge for cameras
      const cam = device as CameraDevice;
      drawFOVWedge(doc, cx, cy, rPt, cam.rotation, cam.fovDegrees, cr, cg, cb, gsCoverage);
    } else if (device.type === "sensor") {
      // Detection circle for sensors
      drawCoverageCircle(doc, cx, cy, rPt, cr, cg, cb, gsCoverage);
    } else if (device.type === "network" && rPt > 0) {
      // Coverage circle for APs
      drawCoverageCircle(doc, cx, cy, rPt, cr, cg, cb, gsCoverage);
    }
  }

  // --- Draw walls ---
  doc.setDrawColor(30, 41, 59); // slate-800
  doc.setLineWidth(2.5);
  for (const wall of floor.walls) {
    doc.line(tx(wall.start.x), ty(wall.start.y), tx(wall.end.x), ty(wall.end.y));
  }

  // --- Draw devices ---
  for (const device of floor.devices) {
    const cx = tx(device.position.x);
    const cy = ty(device.position.y);
    const [r, g, b] = hexToRgb(TYPE_COLORS[device.type]);

    // Device marker (filled circle with dark stroke)
    doc.setFillColor(r, g, b);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.75);
    doc.circle(cx, cy, 5, "FD");

    // Label — use a short label: model number from catalog, or device label
    const product = resolveProduct(device);
    const shortLabel = product ? product.model : device.label;
    doc.setFontSize(6);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(shortLabel, cx + 8, cy + 2, { maxWidth: 60 });
  }

  // --- Legend ---
  const legendX = pw - m - legendW;
  const legendY = m + 10;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(legendX, legendY, legendW, 100, 3, 3);

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("LEGEND", legendX + 10, legendY + 14);

  const legendTypes: Device["type"][] = ["camera", "reader", "sensor", "network"];
  const legendLabels = ["Camera", "Reader", "Sensor", "Network"];
  const legendDescriptions = [
    "Green / FOV arc",
    "Blue",
    "Amber / detection range",
    "Violet / coverage",
  ];

  let ly = legendY + 30;
  for (let i = 0; i < legendTypes.length; i++) {
    const [r, g, b] = hexToRgb(TYPE_COLORS[legendTypes[i]]);
    doc.setFillColor(r, g, b);
    doc.circle(legendX + 16, ly - 3, 4, "F");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(legendLabels[i], legendX + 26, ly);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(legendDescriptions[i], legendX + 26, ly + 9);
    ly += 21;
  }

  // --- Scale bar ---
  const scaleBarY = ph - m - titleBlockH - 20;
  const scaleBarX = m;
  // Show a bar representing some number of whole meters
  const metersPerPt = 1 / (floor.scale * scaleFit);
  // Pick a round number of meters for the bar (1, 2, 5, 10, 20 ...)
  const targetBarPt = 100;
  const rawMeters = targetBarPt * metersPerPt;
  const niceMeters = niceRound(rawMeters);
  const barLenPt = niceMeters / metersPerPt;

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(scaleBarX, scaleBarY, scaleBarX + barLenPt, scaleBarY);
  // Tick marks at endpoints
  doc.line(scaleBarX, scaleBarY - 4, scaleBarX, scaleBarY + 4);
  doc.line(scaleBarX + barLenPt, scaleBarY - 4, scaleBarX + barLenPt, scaleBarY + 4);

  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.text(`${niceMeters} m`, scaleBarX + barLenPt / 2, scaleBarY - 7, {
    align: "center",
  });

  // --- Title block (bottom-right) ---
  const tbX = pw - m - 200;
  const tbY = ph - m - titleBlockH;
  const tbW = 200;
  const tbH = titleBlockH;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1);
  doc.rect(tbX, tbY, tbW, tbH);
  doc.line(tbX, tbY + 16, tbX + tbW, tbY + 16);

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(floor.name, tbX + 6, tbY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const scaleText = `Scale: 1px = ${(1 / floor.scale).toFixed(3)} m`;
  doc.text(scaleText, tbX + 6, tbY + 28);
  doc.text(`Date: ${dateStr}`, tbX + 6, tbY + 40);
  doc.text(`Page 2 of ${doc.getNumberOfPages()}`, tbX + 6, tbY + 52);
  doc.text("Deeper Vision", tbX + tbW - 6, tbY + 52, { align: "right" });
}

/**
 * Draw a camera FOV wedge (pie-slice) using path operations.
 * The wedge points in the direction of `rotationDeg` and covers `fovDeg`.
 */
function drawFOVWedge(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  rotationDeg: number,
  fovDeg: number,
  r: number,
  g: number,
  b: number,
  gsCoverage: any,
): void {
  if (radius <= 0 || fovDeg <= 0) return;

  const halfFov = (fovDeg / 2) * (Math.PI / 180);
  // rotation: 0 = up (north) in our coordinate system; PDF y-axis is inverted
  const baseAngle = ((rotationDeg - 90) * Math.PI) / 180;
  const startAngle = baseAngle - halfFov;
  const endAngle = baseAngle + halfFov;
  const segments = Math.max(12, Math.ceil(fovDeg / 5));
  const step = (endAngle - startAngle) / segments;

  doc.saveGraphicsState();
  if (gsCoverage) {
    try {
      doc.setGState(gsCoverage);
    } catch {
      // fallback below
    }
  }

  // Build path: center -> arc -> back to center
  doc.setFillColor(r, g, b);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.25);

  doc.moveTo(cx, cy);
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + step * i;
    const px = cx + radius * Math.cos(a);
    const py = cy + radius * Math.sin(a);
    doc.lineTo(px, py);
  }
  doc.lineTo(cx, cy);
  doc.fillStroke();

  doc.restoreGraphicsState();
}

/**
 * Draw a circular coverage area.
 */
function drawCoverageCircle(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
  gsCoverage: any,
): void {
  if (radius <= 0) return;

  doc.saveGraphicsState();
  if (gsCoverage) {
    try {
      doc.setGState(gsCoverage);
    } catch {
      // fallback
    }
  }

  doc.setFillColor(r, g, b);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, radius, "FD");

  doc.restoreGraphicsState();
}

/** Pick a "nice" round number near `n` for scale-bar labelling. */
function niceRound(n: number): number {
  if (n <= 0) return 1;
  const candidates = [0.5, 1, 2, 5, 10, 15, 20, 25, 50, 100];
  let best = candidates[0];
  let bestDist = Math.abs(n - best);
  for (const c of candidates) {
    const dist = Math.abs(n - c);
    if (dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Device Schedule Table (last PDF page)
// ---------------------------------------------------------------------------

function drawDeviceSchedule(
  doc: jsPDF,
  floor: Floor,
  designName: string,
  dateStr: string,
  pw: number,
  ph: number,
  m: number,
): void {
  // Header
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Device Schedule", m, m + 16);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text(`${designName}  —  ${floor.name}  —  ${dateStr}`, m, m + 30);

  // Table columns and widths
  const colHeaders = ["#", "Label", "Manufacturer", "Model", "Type", "Subcat.", "Mount Ht.", "Notes"];
  const colWidths = [24, 72, 80, 72, 54, 54, 48, pw - m * 2 - 24 - 72 - 80 - 72 - 54 - 54 - 48];

  const tableX = m;
  let tableY = m + 44;
  const rowH = 16;
  const headerH = 18;

  // Sort devices: type, then manufacturer/label
  const sorted = [...floor.devices].sort((a, b) => {
    const td = TYPE_SORT_ORDER[a.type] - TYPE_SORT_ORDER[b.type];
    if (td !== 0) return td;
    const prodA = resolveProduct(a);
    const prodB = resolveProduct(b);
    const mfgA = prodA?.manufacturer ?? "";
    const mfgB = prodB?.manufacturer ?? "";
    const mfgCmp = mfgA.localeCompare(mfgB);
    if (mfgCmp !== 0) return mfgCmp;
    return a.label.localeCompare(b.label);
  });

  // Draw header row
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(tableX, tableY, pw - m * 2, headerH, "F");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");

  let colX = tableX;
  for (let c = 0; c < colHeaders.length; c++) {
    doc.text(colHeaders[c], colX + 4, tableY + 12);
    colX += colWidths[c];
  }
  tableY += headerH;

  // Draw rows
  const typeCounts: Record<string, number> = {};
  const pageBottom = ph - m - 40;

  for (let i = 0; i < sorted.length; i++) {
    // Page break check
    if (tableY + rowH > pageBottom) {
      doc.addPage("letter", "portrait");
      tableY = m + 16;
      // Re-draw header on new page
      doc.setFillColor(241, 245, 249);
      doc.rect(tableX, tableY, pw - m * 2, headerH, "F");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      colX = tableX;
      for (let c = 0; c < colHeaders.length; c++) {
        doc.text(colHeaders[c], colX + 4, tableY + 12);
        colX += colWidths[c];
      }
      tableY += headerH;
    }

    const device = sorted[i];
    const product = resolveProduct(device);
    const subcat = subcategoryLabel(device);

    typeCounts[device.type] = (typeCounts[device.type] || 0) + 1;

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(tableX, tableY, pw - m * 2, rowH, "F");
    }

    // Row separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(tableX, tableY + rowH, tableX + pw - m * 2, tableY + rowH);

    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");

    const rowData = [
      `${i + 1}`,
      device.label,
      product?.manufacturer ?? "—",
      product?.model ?? (device.type === "camera" ? (device as CameraDevice).model : "—"),
      TYPE_LABELS[device.type],
      subcat,
      `${device.mountHeight.toFixed(1)} m`,
      device.notes || "—",
    ];

    colX = tableX;
    for (let c = 0; c < rowData.length; c++) {
      const maxW = colWidths[c] - 6;
      doc.text(rowData[c], colX + 4, tableY + 11, { maxWidth: maxW });
      colX += colWidths[c];
    }

    tableY += rowH;
  }

  // Summary row
  tableY += 6;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.75);
  doc.line(tableX, tableY, tableX + pw - m * 2, tableY);
  tableY += 14;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);

  const typeOrder: Device["type"][] = ["camera", "reader", "sensor", "network"];
  const summaryParts: string[] = [];
  for (const t of typeOrder) {
    if (typeCounts[t]) {
      summaryParts.push(`${TYPE_LABELS[t]}: ${typeCounts[t]}`);
    }
  }
  summaryParts.push(`Total: ${sorted.length}`);
  doc.text(summaryParts.join("    "), tableX + 4, tableY);

  // Footer
  const pageNum = doc.getNumberOfPages();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Deeper Vision  |  ${dateStr}  |  Page ${pageNum} of ${pageNum}`,
    pw / 2,
    ph - m + 8,
    { align: "center" },
  );
}

// ---------------------------------------------------------------------------
// 2. exportBOMCSV
// ---------------------------------------------------------------------------

/**
 * Export a CSV Bill of Materials, grouped by product (catalogId).
 *
 * Triggers a browser download of `{design-name}-bom.csv`.
 */
export async function exportBOMCSV(
  design: DesignDocument,
  floor: Floor,
): Promise<void> {
  // Group devices by catalogId, or by type+subtype if no catalogId
  interface BOMGroup {
    key: string;
    product: CatalogProduct | undefined;
    type: Device["type"];
    subcat: string;
    qty: number;
    labels: string[];
  }

  const groups = new Map<string, BOMGroup>();

  for (const device of floor.devices) {
    const product = resolveProduct(device);
    const subcat = subcategoryLabel(device);
    const key = device.catalogId ?? `generic-${device.type}-${subcat}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        product,
        type: device.type,
        subcat,
        qty: 0,
        labels: [],
      };
      groups.set(key, group);
    }
    group.qty++;
    if (device.label) {
      group.labels.push(device.label);
    }
  }

  // Sort groups by type, then manufacturer, then model
  const sorted = [...groups.values()].sort((a, b) => {
    const td = TYPE_SORT_ORDER[a.type] - TYPE_SORT_ORDER[b.type];
    if (td !== 0) return td;
    const mfgA = a.product?.manufacturer ?? "";
    const mfgB = b.product?.manufacturer ?? "";
    return mfgA.localeCompare(mfgB) || (a.product?.model ?? "").localeCompare(b.product?.model ?? "");
  });

  const headers = [
    "Line #",
    "Manufacturer",
    "Model",
    "Full Name",
    "Category",
    "Subcategory",
    "Qty",
    "Unit Price (Street)",
    "Extended Price",
    "Labor Hours (per unit)",
    "Total Labor Hours",
    "Label/Location",
  ];

  const rows: (string | number)[][] = [];
  let totalPrice = 0;
  let totalLabor = 0;
  let lineNum = 0;

  for (const g of sorted) {
    lineNum++;
    const unitPrice = g.product?.streetPrice ?? 0;
    const extPrice = unitPrice * g.qty;
    const laborPerUnit = g.product?.laborHours ?? 0;
    const totalLaborRow = laborPerUnit * g.qty;

    totalPrice += extPrice;
    totalLabor += totalLaborRow;

    rows.push([
      lineNum,
      g.product?.manufacturer ?? "Generic",
      g.product?.model ?? g.subcat,
      g.product?.fullName ?? `Generic ${g.type} (${g.subcat})`,
      TYPE_LABELS[g.type],
      g.subcat,
      g.qty,
      unitPrice > 0 ? fmtCurrency(unitPrice) : "—",
      extPrice > 0 ? fmtCurrency(extPrice) : "—",
      laborPerUnit > 0 ? laborPerUnit.toFixed(1) : "—",
      totalLaborRow > 0 ? totalLaborRow.toFixed(1) : "—",
      g.labels.join(", "),
    ]);
  }

  // Summary row
  rows.push([
    "",
    "",
    "",
    "",
    "",
    "TOTALS",
    floor.devices.length,
    "",
    totalPrice > 0 ? fmtCurrency(totalPrice) : "—",
    "",
    totalLabor > 0 ? totalLabor.toFixed(1) : "—",
    "",
  ]);

  const csv = buildCSV(headers, rows);
  const safeName = design.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  downloadText(`${safeName}-bom.csv`, csv, "text/csv;charset=utf-8");
}

// ---------------------------------------------------------------------------
// 3. exportDeviceScheduleCSV
// ---------------------------------------------------------------------------

/**
 * Export a CSV with one row per device instance.
 *
 * Triggers a browser download of `{design-name}-device-schedule.csv`.
 */
export async function exportDeviceScheduleCSV(
  design: DesignDocument,
  floor: Floor,
): Promise<void> {
  const headers = [
    "Device #",
    "Label",
    "Manufacturer",
    "Model",
    "Type",
    "Location (x m)",
    "Location (y m)",
    "Mount Height (m)",
    "Notes",
  ];

  // Sort same as the PDF schedule: type, manufacturer, label
  const sorted = [...floor.devices].sort((a, b) => {
    const td = TYPE_SORT_ORDER[a.type] - TYPE_SORT_ORDER[b.type];
    if (td !== 0) return td;
    const prodA = resolveProduct(a);
    const prodB = resolveProduct(b);
    const mfgA = prodA?.manufacturer ?? "";
    const mfgB = prodB?.manufacturer ?? "";
    const mfgCmp = mfgA.localeCompare(mfgB);
    if (mfgCmp !== 0) return mfgCmp;
    return a.label.localeCompare(b.label);
  });

  const rows: (string | number)[][] = [];

  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i];
    const product = resolveProduct(d);
    const xMeters = (d.position.x / floor.scale).toFixed(2);
    const yMeters = (d.position.y / floor.scale).toFixed(2);

    rows.push([
      i + 1,
      d.label,
      product?.manufacturer ?? "—",
      product?.model ?? (d.type === "camera" ? (d as CameraDevice).model : "—"),
      TYPE_LABELS[d.type],
      xMeters,
      yMeters,
      d.mountHeight.toFixed(1),
      d.notes || "",
    ]);
  }

  const csv = buildCSV(headers, rows);
  const safeName = design.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  downloadText(`${safeName}-device-schedule.csv`, csv, "text/csv;charset=utf-8");
}
