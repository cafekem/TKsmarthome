/**
 * Product catalog — real manufacturer products with realistic distributor
 * pricing.  Street prices are typical US distributor-to-integrator numbers
 * (~60-75 % of MSRP).  Specs are drawn from published datasheets.
 *
 * The catalog is intentionally a flat array so it can be filtered, searched,
 * and extended without fighting nested structures.  Helper functions at the
 * bottom cover the most common access patterns.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogProduct {
  id: string;
  manufacturer: string;
  model: string;
  name: string;
  fullName: string;
  category: "camera" | "reader" | "sensor" | "network";
  subcategory:
    | "dome"
    | "bullet"
    | "ptz"
    | "fixed"
    | "fisheye"
    | "multi-sensor"
    | "mini"
    | "modular"
    | "card"
    | "biometric"
    | "keypad"
    | "controller"
    | "lock"
    | "motion"
    | "glass-break"
    | "door-contact"
    | "smoke"
    | "heat"
    | "notification"
    | "switch"
    | "access-point"
    | "nvr";

  // Pricing
  msrp: number;
  streetPrice: number;
  laborHours: number;

  // Specs — category-specific, all optional
  specs: {
    resolution?: string;
    fovDegrees?: number;
    rangeMeters?: number;
    irRange?: number;
    zoomFactor?: number;
    mounting?: "ceiling" | "wall" | "surface" | "pendant";
    indoor?: boolean;
    outdoor?: boolean;
    poe?: boolean;
    lensCount?: number;
    portCount?: number;
    storageCapacity?: string;
    channelCount?: number;
    coverageMeters?: number;
    wireless?: boolean;
  };

  description: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Catalog data
// ---------------------------------------------------------------------------

export const PRODUCT_CATALOG: CatalogProduct[] = [
  // =======================================================================
  // CAMERAS — Verkada
  // =======================================================================
  {
    id: "verkada-cm42",
    manufacturer: "Verkada",
    model: "CM42",
    name: "Mini Camera",
    fullName: "Verkada CM42 Mini Camera",
    category: "camera",
    subcategory: "mini",
    msrp: 500,
    streetPrice: 350,
    laborHours: 1.0,
    specs: {
      resolution: "5MP",
      fovDegrees: 95,
      irRange: 15,
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "5MP indoor mini camera, 95° FOV, 15m IR, PoE",
    tags: ["indoor", "5mp", "mini", "compact", "cloud", "verkada", "poe"],
  },
  {
    id: "verkada-cd32",
    manufacturer: "Verkada",
    model: "CD32",
    name: "Mini Dome Camera",
    fullName: "Verkada CD32 Mini Dome",
    category: "camera",
    subcategory: "dome",
    msrp: 570,
    streetPrice: 400,
    laborHours: 1.25,
    specs: {
      resolution: "5MP",
      fovDegrees: 95,
      irRange: 15,
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "5MP indoor mini dome, 95° FOV, 15m IR, PoE",
    tags: ["indoor", "5mp", "dome", "mini", "cloud", "verkada", "ir", "poe"],
  },
  {
    id: "verkada-cd42",
    manufacturer: "Verkada",
    model: "CD42",
    name: "Indoor Dome Camera",
    fullName: "Verkada CD42 Indoor Dome",
    category: "camera",
    subcategory: "dome",
    msrp: 715,
    streetPrice: 500,
    laborHours: 1.5,
    specs: {
      resolution: "5MP",
      fovDegrees: 110,
      irRange: 30,
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "5MP indoor dome, 110° FOV, 30m IR, PoE",
    tags: ["indoor", "5mp", "dome", "cloud", "verkada", "ir", "poe", "wide-angle"],
  },
  {
    id: "verkada-cd52",
    manufacturer: "Verkada",
    model: "CD52",
    name: "Outdoor Dome Camera",
    fullName: "Verkada CD52 Outdoor Dome",
    category: "camera",
    subcategory: "dome",
    msrp: 860,
    streetPrice: 600,
    laborHours: 2.0,
    specs: {
      resolution: "5MP",
      fovDegrees: 100,
      irRange: 30,
      mounting: "ceiling",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "5MP outdoor dome, 100° FOV, 30m IR, IK10, PoE",
    tags: ["outdoor", "5mp", "dome", "cloud", "verkada", "ir", "poe", "vandal-resistant"],
  },
  {
    id: "verkada-cd62",
    manufacturer: "Verkada",
    model: "CD62",
    name: "4K Outdoor Dome Camera",
    fullName: "Verkada CD62 Outdoor Dome",
    category: "camera",
    subcategory: "dome",
    msrp: 1140,
    streetPrice: 800,
    laborHours: 2.0,
    specs: {
      resolution: "4K",
      fovDegrees: 100,
      irRange: 40,
      mounting: "ceiling",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "8MP/4K outdoor dome, 100° FOV, 40m IR, IK10, PoE",
    tags: ["outdoor", "4k", "8mp", "dome", "cloud", "verkada", "ir", "poe", "vandal-resistant"],
  },
  {
    id: "verkada-cb52",
    manufacturer: "Verkada",
    model: "CB52",
    name: "Outdoor Bullet Camera",
    fullName: "Verkada CB52 Bullet",
    category: "camera",
    subcategory: "bullet",
    msrp: 785,
    streetPrice: 550,
    laborHours: 1.75,
    specs: {
      resolution: "5MP",
      fovDegrees: 95,
      irRange: 50,
      mounting: "wall",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "5MP outdoor bullet, 95° FOV, 50m IR, PoE",
    tags: ["outdoor", "5mp", "bullet", "fixed", "cloud", "verkada", "ir", "long-range", "poe"],
  },
  {
    id: "verkada-cb62",
    manufacturer: "Verkada",
    model: "CB62",
    name: "4K Outdoor Bullet Camera",
    fullName: "Verkada CB62 Bullet",
    category: "camera",
    subcategory: "bullet",
    msrp: 1070,
    streetPrice: 750,
    laborHours: 1.75,
    specs: {
      resolution: "4K",
      fovDegrees: 95,
      irRange: 60,
      mounting: "wall",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "8MP/4K outdoor bullet, 95° FOV, 60m IR, PoE",
    tags: ["outdoor", "4k", "8mp", "bullet", "fixed", "cloud", "verkada", "ir", "long-range", "poe"],
  },
  {
    id: "verkada-cp62",
    manufacturer: "Verkada",
    model: "CP62",
    name: "PTZ Camera",
    fullName: "Verkada CP62 PTZ",
    category: "camera",
    subcategory: "ptz",
    msrp: 3140,
    streetPrice: 2200,
    laborHours: 3.0,
    specs: {
      resolution: "4K",
      fovDegrees: 62,
      irRange: 100,
      zoomFactor: 36,
      mounting: "ceiling",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "8MP PTZ, 36x optical zoom, 100m IR, cloud-managed",
    tags: ["outdoor", "indoor", "4k", "8mp", "ptz", "zoom", "cloud", "verkada", "ir", "poe"],
  },
  {
    id: "verkada-cf82",
    manufacturer: "Verkada",
    model: "CF82",
    name: "Fisheye Camera",
    fullName: "Verkada CF82 Fisheye",
    category: "camera",
    subcategory: "fisheye",
    msrp: 1000,
    streetPrice: 700,
    laborHours: 1.5,
    specs: {
      resolution: "12MP",
      fovDegrees: 180,
      irRange: 10,
      mounting: "ceiling",
      indoor: true,
      outdoor: true,
      poe: true,
    },
    description: "12MP fisheye, 180° panoramic, dewarping, PoE",
    tags: ["indoor", "outdoor", "12mp", "fisheye", "panoramic", "360", "cloud", "verkada", "poe"],
  },

  // =======================================================================
  // CAMERAS — Axis Communications
  // =======================================================================
  {
    id: "axis-m3116-lve",
    manufacturer: "Axis",
    model: "M3116-LVE",
    name: "Mini Dome Camera",
    fullName: "Axis M3116-LVE Mini Dome",
    category: "camera",
    subcategory: "dome",
    msrp: 460,
    streetPrice: 320,
    laborHours: 1.25,
    specs: {
      resolution: "4MP",
      fovDegrees: 97,
      irRange: 20,
      mounting: "ceiling",
      indoor: true,
      outdoor: true,
      poe: true,
    },
    description: "4MP mini dome, 97° FOV, 20m IR, IK08, PoE",
    tags: ["indoor", "outdoor", "4mp", "dome", "mini", "axis", "ir", "poe"],
  },
  {
    id: "axis-p3265-lve",
    manufacturer: "Axis",
    model: "P3265-LVE",
    name: "Dome Camera",
    fullName: "Axis P3265-LVE Dome",
    category: "camera",
    subcategory: "dome",
    msrp: 640,
    streetPrice: 450,
    laborHours: 1.75,
    specs: {
      resolution: "2MP",
      fovDegrees: 108,
      irRange: 40,
      mounting: "ceiling",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "2MP outdoor dome, 108° FOV, 40m IR, Lightfinder 2.0",
    tags: ["outdoor", "2mp", "1080p", "dome", "axis", "ir", "poe", "wide-angle", "lightfinder"],
  },
  {
    id: "axis-p3268-lve",
    manufacturer: "Axis",
    model: "P3268-LVE",
    name: "4K Dome Camera",
    fullName: "Axis P3268-LVE 4K Dome",
    category: "camera",
    subcategory: "dome",
    msrp: 930,
    streetPrice: 650,
    laborHours: 1.75,
    specs: {
      resolution: "4K",
      fovDegrees: 100,
      irRange: 40,
      mounting: "ceiling",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "8MP/4K outdoor dome, 100° FOV, 40m IR, Lightfinder 2.0",
    tags: ["outdoor", "4k", "8mp", "dome", "axis", "ir", "poe", "lightfinder"],
  },
  {
    id: "axis-p1468-le",
    manufacturer: "Axis",
    model: "P1468-LE",
    name: "Bullet Camera",
    fullName: "Axis P1468-LE Bullet",
    category: "camera",
    subcategory: "bullet",
    msrp: 1000,
    streetPrice: 700,
    laborHours: 1.75,
    specs: {
      resolution: "4K",
      fovDegrees: 100,
      irRange: 50,
      mounting: "wall",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "8MP/4K outdoor bullet, 100° FOV, 50m OptimizedIR",
    tags: ["outdoor", "4k", "8mp", "bullet", "fixed", "axis", "ir", "long-range", "poe"],
  },
  {
    id: "axis-q6135-le",
    manufacturer: "Axis",
    model: "Q6135-LE",
    name: "PTZ Camera",
    fullName: "Axis Q6135-LE PTZ",
    category: "camera",
    subcategory: "ptz",
    msrp: 5000,
    streetPrice: 3500,
    laborHours: 3.5,
    specs: {
      resolution: "2MP",
      fovDegrees: 59,
      irRange: 200,
      zoomFactor: 32,
      mounting: "pendant",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "2MP PTZ, 32x zoom, 200m IR, HDTV 1080p, Autotracking 2",
    tags: ["outdoor", "2mp", "1080p", "ptz", "zoom", "axis", "ir", "long-range", "poe", "autotracking"],
  },
  {
    id: "axis-m3077-plve",
    manufacturer: "Axis",
    model: "M3077-PLVE",
    name: "Panoramic Camera",
    fullName: "Axis M3077-PLVE Panoramic",
    category: "camera",
    subcategory: "fisheye",
    msrp: 1285,
    streetPrice: 900,
    laborHours: 1.5,
    specs: {
      resolution: "6MP",
      fovDegrees: 180,
      irRange: 15,
      mounting: "ceiling",
      indoor: true,
      outdoor: true,
      poe: true,
    },
    description: "6MP panoramic, 180° FOV, dewarping, Lightfinder",
    tags: ["indoor", "outdoor", "6mp", "fisheye", "panoramic", "360", "axis", "poe", "lightfinder"],
  },
  {
    id: "axis-fa54",
    manufacturer: "Axis",
    model: "FA54",
    name: "Modular Sensor Unit",
    fullName: "Axis FA54 Modular Sensor",
    category: "camera",
    subcategory: "modular",
    msrp: 400,
    streetPrice: 280,
    laborHours: 1.0,
    specs: {
      resolution: "2MP",
      fovDegrees: 87,
      mounting: "surface",
      indoor: true,
      outdoor: false,
      poe: false,
    },
    description: "1080p modular pinhole sensor, 87° FOV, covert mount",
    tags: ["indoor", "2mp", "1080p", "modular", "pinhole", "covert", "discreet", "axis"],
  },

  // =======================================================================
  // CAMERAS — Hanwha Vision (Samsung)
  // =======================================================================
  {
    id: "hanwha-xnd-8080r",
    manufacturer: "Hanwha Vision",
    model: "XND-8080R",
    name: "Dome Camera",
    fullName: "Hanwha XND-8080R Dome",
    category: "camera",
    subcategory: "dome",
    msrp: 540,
    streetPrice: 380,
    laborHours: 1.5,
    specs: {
      resolution: "5MP",
      fovDegrees: 104,
      irRange: 30,
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "5MP indoor dome, 104° FOV, 30m IR, WiseStream II",
    tags: ["indoor", "5mp", "dome", "hanwha", "samsung", "ir", "poe"],
  },
  {
    id: "hanwha-xno-8080r",
    manufacturer: "Hanwha Vision",
    model: "XNO-8080R",
    name: "Bullet Camera",
    fullName: "Hanwha XNO-8080R Bullet",
    category: "camera",
    subcategory: "bullet",
    msrp: 570,
    streetPrice: 400,
    laborHours: 1.75,
    specs: {
      resolution: "5MP",
      fovDegrees: 104,
      irRange: 30,
      mounting: "wall",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "5MP outdoor bullet, 104° FOV, 30m IR, WiseStream II",
    tags: ["outdoor", "5mp", "bullet", "fixed", "hanwha", "samsung", "ir", "poe"],
  },
  {
    id: "hanwha-xnp-9300rw",
    manufacturer: "Hanwha Vision",
    model: "XNP-9300RW",
    name: "4K PTZ Camera",
    fullName: "Hanwha XNP-9300RW PTZ",
    category: "camera",
    subcategory: "ptz",
    msrp: 4570,
    streetPrice: 3200,
    laborHours: 3.5,
    specs: {
      resolution: "4K",
      fovDegrees: 58,
      irRange: 200,
      zoomFactor: 30,
      mounting: "pendant",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "4K PTZ, 30x zoom, 200m IR, AI auto-tracking",
    tags: ["outdoor", "4k", "8mp", "ptz", "zoom", "hanwha", "samsung", "ir", "long-range", "poe", "ai"],
  },
  {
    id: "hanwha-pnm-9085rqz",
    manufacturer: "Hanwha Vision",
    model: "PNM-9085RQZ",
    name: "4-Directional Multi-Sensor Camera",
    fullName: "Hanwha PNM-9085RQZ Multi-Sensor",
    category: "camera",
    subcategory: "multi-sensor",
    msrp: 2570,
    streetPrice: 1800,
    laborHours: 3.0,
    specs: {
      resolution: "2MP",
      fovDegrees: 108,
      irRange: 30,
      lensCount: 4,
      mounting: "ceiling",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "4x 2MP multi-directional, 4 adjustable lenses, 30m IR",
    tags: ["outdoor", "2mp", "multi-sensor", "multi-directional", "hanwha", "samsung", "ir", "poe"],
  },
  {
    id: "hanwha-pnm-c34404rqpz",
    manufacturer: "Hanwha Vision",
    model: "PNM-C34404RQPZ",
    name: "Multi-Sensor + PTZ Camera",
    fullName: "Hanwha PNM-C34404RQPZ Multi-Sensor PTZ",
    category: "camera",
    subcategory: "multi-sensor",
    msrp: 4000,
    streetPrice: 2800,
    laborHours: 3.5,
    specs: {
      resolution: "4MP",
      fovDegrees: 108,
      irRange: 30,
      zoomFactor: 12,
      lensCount: 4,
      mounting: "pendant",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "4x 4MP multi-sensor + PTZ, 12x zoom, 30m IR",
    tags: ["outdoor", "4mp", "multi-sensor", "ptz", "zoom", "hanwha", "samsung", "ir", "poe"],
  },
  {
    id: "hanwha-xnf-8010r",
    manufacturer: "Hanwha Vision",
    model: "XNF-8010R",
    name: "Fisheye Camera",
    fullName: "Hanwha XNF-8010R Fisheye",
    category: "camera",
    subcategory: "fisheye",
    msrp: 740,
    streetPrice: 520,
    laborHours: 1.5,
    specs: {
      resolution: "6MP",
      fovDegrees: 360,
      irRange: 15,
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "6MP 360° fisheye, dewarping, 15m IR, PoE",
    tags: ["indoor", "6mp", "fisheye", "360", "panoramic", "hanwha", "samsung", "ir", "poe"],
  },

  // =======================================================================
  // CAMERAS — Avigilon (Motorola Solutions)
  // =======================================================================
  {
    id: "avigilon-h5a-dome",
    manufacturer: "Avigilon",
    model: "H5A",
    name: "Dome Camera",
    fullName: "Avigilon H5A Dome",
    category: "camera",
    subcategory: "dome",
    msrp: 860,
    streetPrice: 600,
    laborHours: 2.0,
    specs: {
      resolution: "5MP",
      fovDegrees: 95,
      irRange: 30,
      mounting: "ceiling",
      indoor: true,
      outdoor: true,
      poe: true,
    },
    description: "5MP dome, 95° FOV, 30m IR, self-learning analytics",
    tags: ["indoor", "outdoor", "5mp", "dome", "avigilon", "motorola", "ir", "poe", "analytics"],
  },
  {
    id: "avigilon-h6a-bullet",
    manufacturer: "Avigilon",
    model: "H6A",
    name: "4K Bullet Camera",
    fullName: "Avigilon H6A Bullet",
    category: "camera",
    subcategory: "bullet",
    msrp: 1210,
    streetPrice: 850,
    laborHours: 2.0,
    specs: {
      resolution: "4K",
      fovDegrees: 95,
      irRange: 50,
      mounting: "wall",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "8MP/4K bullet, 95° FOV, 50m IR, object classification",
    tags: ["outdoor", "4k", "8mp", "bullet", "fixed", "avigilon", "motorola", "ir", "long-range", "poe", "analytics"],
  },
  {
    id: "avigilon-h5a-ptz",
    manufacturer: "Avigilon",
    model: "H5A PTZ",
    name: "PTZ Camera",
    fullName: "Avigilon H5A PTZ",
    category: "camera",
    subcategory: "ptz",
    msrp: 5430,
    streetPrice: 3800,
    laborHours: 4.0,
    specs: {
      resolution: "2MP",
      fovDegrees: 62,
      irRange: 250,
      zoomFactor: 36,
      mounting: "pendant",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "2MP PTZ, 36x zoom, 250m IR, self-learning analytics",
    tags: ["outdoor", "2mp", "1080p", "ptz", "zoom", "avigilon", "motorola", "ir", "long-range", "poe", "analytics"],
  },
  {
    id: "avigilon-h5a-multisensor",
    manufacturer: "Avigilon",
    model: "H5A Multisensor",
    name: "Multi-Sensor Camera",
    fullName: "Avigilon H5A Multisensor",
    category: "camera",
    subcategory: "multi-sensor",
    msrp: 3430,
    streetPrice: 2400,
    laborHours: 3.0,
    specs: {
      resolution: "5MP",
      fovDegrees: 180,
      irRange: 30,
      lensCount: 4,
      mounting: "ceiling",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "4x 5MP multi-sensor, 4-directional, 30m IR, analytics",
    tags: ["outdoor", "5mp", "multi-sensor", "multi-directional", "panoramic", "avigilon", "motorola", "ir", "poe", "analytics"],
  },

  // =======================================================================
  // CAMERAS — Bosch
  // =======================================================================
  {
    id: "bosch-flexidome-5100i",
    manufacturer: "Bosch",
    model: "FLEXIDOME IP 5100i",
    name: "Dome Camera",
    fullName: "Bosch FLEXIDOME IP 5100i",
    category: "camera",
    subcategory: "dome",
    msrp: 600,
    streetPrice: 420,
    laborHours: 1.5,
    specs: {
      resolution: "5MP",
      fovDegrees: 116,
      irRange: 30,
      mounting: "ceiling",
      indoor: true,
      outdoor: true,
      poe: true,
    },
    description: "5MP dome, 116° FOV, 30m IR, built-in AI analytics",
    tags: ["indoor", "outdoor", "5mp", "dome", "bosch", "ir", "poe", "wide-angle", "analytics"],
  },
  {
    id: "bosch-dinion-5100i",
    manufacturer: "Bosch",
    model: "DINION IP 5100i",
    name: "Bullet Camera",
    fullName: "Bosch DINION IP 5100i Bullet",
    category: "camera",
    subcategory: "bullet",
    msrp: 860,
    streetPrice: 600,
    laborHours: 1.75,
    specs: {
      resolution: "4K",
      fovDegrees: 95,
      irRange: 50,
      mounting: "wall",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "8MP/4K bullet, 95° FOV, 50m IR, Intelligent Video Analytics",
    tags: ["outdoor", "4k", "8mp", "bullet", "fixed", "bosch", "ir", "long-range", "poe", "analytics"],
  },
  {
    id: "bosch-autodome-5100i",
    manufacturer: "Bosch",
    model: "AUTODOME IP 5100i",
    name: "PTZ Camera",
    fullName: "Bosch AUTODOME IP 5100i PTZ",
    category: "camera",
    subcategory: "ptz",
    msrp: 4000,
    streetPrice: 2800,
    laborHours: 3.0,
    specs: {
      resolution: "2MP",
      fovDegrees: 63,
      irRange: 150,
      zoomFactor: 20,
      mounting: "pendant",
      indoor: false,
      outdoor: true,
      poe: true,
    },
    description: "2MP PTZ, 20x zoom, 150m IR, Intelligent Tracking",
    tags: ["outdoor", "2mp", "1080p", "ptz", "zoom", "bosch", "ir", "long-range", "poe", "analytics"],
  },

  // =======================================================================
  // ACCESS CONTROL — HID Global (Readers)
  // =======================================================================
  {
    id: "hid-r10",
    manufacturer: "HID Global",
    model: "iCLASS SE R10",
    name: "Contactless Card Reader",
    fullName: "HID iCLASS SE R10",
    category: "reader",
    subcategory: "card",
    msrp: 135,
    streetPrice: 95,
    laborHours: 1.0,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: false,
    },
    description: "Contactless smart card reader, iCLASS SE platform",
    tags: ["indoor", "card", "contactless", "hid", "iclass", "reader", "access-control"],
  },
  {
    id: "hid-r40",
    manufacturer: "HID Global",
    model: "iCLASS SE R40",
    name: "Multi-Format Card Reader",
    fullName: "HID iCLASS SE R40",
    category: "reader",
    subcategory: "card",
    msrp: 205,
    streetPrice: 145,
    laborHours: 1.0,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: true,
    },
    description: "Multi-format card reader, iCLASS SE, weatherized",
    tags: ["indoor", "outdoor", "card", "multi-format", "hid", "iclass", "reader", "access-control"],
  },
  {
    id: "hid-rk40",
    manufacturer: "HID Global",
    model: "iCLASS SE RK40",
    name: "Reader with Keypad",
    fullName: "HID iCLASS SE RK40",
    category: "reader",
    subcategory: "keypad",
    msrp: 255,
    streetPrice: 180,
    laborHours: 1.25,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: true,
    },
    description: "Multi-format card reader + keypad combo, iCLASS SE",
    tags: ["indoor", "outdoor", "card", "keypad", "multi-format", "hid", "iclass", "reader", "access-control"],
  },
  {
    id: "hid-signo-40",
    manufacturer: "HID Global",
    model: "Signo 40",
    name: "Mobile + Smart Card Reader",
    fullName: "HID Signo 40 Reader",
    category: "reader",
    subcategory: "card",
    msrp: 240,
    streetPrice: 170,
    laborHours: 1.0,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: true,
      wireless: true,
    },
    description: "Mobile-ready + smart card reader, BLE, NFC, OSDP",
    tags: ["indoor", "outdoor", "card", "mobile", "bluetooth", "nfc", "hid", "signo", "reader", "access-control", "osdp"],
  },
  {
    id: "hid-signo-40k",
    manufacturer: "HID Global",
    model: "Signo 40K",
    name: "Mobile + Smart Card Reader with Keypad",
    fullName: "HID Signo 40K Reader",
    category: "reader",
    subcategory: "keypad",
    msrp: 300,
    streetPrice: 210,
    laborHours: 1.25,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: true,
      wireless: true,
    },
    description: "Mobile + smart card + keypad, BLE, NFC, OSDP",
    tags: ["indoor", "outdoor", "card", "keypad", "mobile", "bluetooth", "nfc", "hid", "signo", "reader", "access-control", "osdp"],
  },

  // =======================================================================
  // ACCESS CONTROL — Mercury Security (Controllers)
  // =======================================================================
  {
    id: "mercury-lp4502",
    manufacturer: "Mercury Security",
    model: "LP4502",
    name: "2-Door Intelligent Controller",
    fullName: "Mercury LP4502 Controller",
    category: "reader",
    subcategory: "controller",
    msrp: 970,
    streetPrice: 680,
    laborHours: 3.0,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "2-door intelligent controller, PoE, embedded Linux",
    tags: ["indoor", "controller", "2-door", "mercury", "poe", "access-control", "panel"],
  },
  {
    id: "mercury-lp1502",
    manufacturer: "Mercury Security",
    model: "LP1502",
    name: "Single-Door Controller",
    fullName: "Mercury LP1502 Controller",
    category: "reader",
    subcategory: "controller",
    msrp: 600,
    streetPrice: 420,
    laborHours: 2.5,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "Single-door intelligent controller, PoE, compact",
    tags: ["indoor", "controller", "single-door", "mercury", "poe", "access-control", "panel"],
  },
  {
    id: "mercury-mr62e",
    manufacturer: "Mercury Security",
    model: "MR62e",
    name: "Reader Interface Module",
    fullName: "Mercury MR62e Reader Interface",
    category: "reader",
    subcategory: "controller",
    msrp: 255,
    streetPrice: 180,
    laborHours: 1.5,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: false,
    },
    description: "Reader interface board, RS-485, OSDP-ready",
    tags: ["indoor", "controller", "interface", "mercury", "access-control", "osdp"],
  },

  // =======================================================================
  // ACCESS CONTROL — Suprema (Biometric)
  // =======================================================================
  {
    id: "suprema-bioentry-w2",
    manufacturer: "Suprema",
    model: "BioEntry W2",
    name: "Fingerprint + Card Reader",
    fullName: "Suprema BioEntry W2",
    category: "reader",
    subcategory: "biometric",
    msrp: 740,
    streetPrice: 520,
    laborHours: 2.0,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: true,
    },
    description: "Fingerprint + card reader, IP67, IK08, OSDP",
    tags: ["indoor", "outdoor", "biometric", "fingerprint", "card", "suprema", "reader", "access-control", "osdp"],
  },
  {
    id: "suprema-facestation-f2",
    manufacturer: "Suprema",
    model: "FaceStation F2",
    name: "Facial Recognition Terminal",
    fullName: "Suprema FaceStation F2",
    category: "reader",
    subcategory: "biometric",
    msrp: 1710,
    streetPrice: 1200,
    laborHours: 2.5,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: false,
    },
    description: "Facial recognition + card, fusion matching, live detection",
    tags: ["indoor", "biometric", "facial-recognition", "face", "card", "suprema", "reader", "access-control"],
  },

  // =======================================================================
  // ACCESS CONTROL — ASSA ABLOY (Locks)
  // =======================================================================
  {
    id: "assa-abloy-aperio-h100",
    manufacturer: "ASSA ABLOY",
    model: "Aperio H100",
    name: "Wireless Lock",
    fullName: "ASSA ABLOY Aperio H100",
    category: "reader",
    subcategory: "lock",
    msrp: 640,
    streetPrice: 450,
    laborHours: 2.5,
    specs: {
      mounting: "surface",
      indoor: true,
      outdoor: false,
      wireless: true,
    },
    description: "Wireless lock, integrates with existing ACS, BLE",
    tags: ["indoor", "lock", "wireless", "bluetooth", "assa-abloy", "aperio", "access-control"],
  },
  {
    id: "assa-abloy-in120",
    manufacturer: "ASSA ABLOY",
    model: "IN120",
    name: "WiFi Lock",
    fullName: "ASSA ABLOY IN120 WiFi Lock",
    category: "reader",
    subcategory: "lock",
    msrp: 540,
    streetPrice: 380,
    laborHours: 2.0,
    specs: {
      mounting: "surface",
      indoor: true,
      outdoor: false,
      wireless: true,
    },
    description: "WiFi-networked lock, real-time monitoring, audit trail",
    tags: ["indoor", "lock", "wireless", "wifi", "assa-abloy", "access-control", "networked"],
  },

  // =======================================================================
  // SENSORS — Bosch Security
  // =======================================================================
  {
    id: "bosch-bdl2-wp12g",
    manufacturer: "Bosch",
    model: "ISC-BDL2-WP12G",
    name: "Blue Line Gen2 PIR Sensor",
    fullName: "Bosch Blue Line Gen2 PIR",
    category: "sensor",
    subcategory: "motion",
    msrp: 65,
    streetPrice: 45,
    laborHours: 0.75,
    specs: {
      rangeMeters: 12,
      fovDegrees: 90,
      mounting: "wall",
      indoor: true,
      outdoor: false,
    },
    description: "PIR motion sensor, 12m range, wide-angle, pet-immune",
    tags: ["indoor", "motion", "pir", "bosch", "sensor", "blue-line", "intrusion"],
  },
  {
    id: "bosch-ds938z",
    manufacturer: "Bosch",
    model: "DS938Z",
    name: "Long-Range PIR Sensor",
    fullName: "Bosch DS938Z PIR",
    category: "sensor",
    subcategory: "motion",
    msrp: 92,
    streetPrice: 65,
    laborHours: 0.75,
    specs: {
      rangeMeters: 18,
      fovDegrees: 60,
      mounting: "wall",
      indoor: true,
      outdoor: false,
    },
    description: "Long-range PIR sensor, 18m, narrow curtain pattern",
    tags: ["indoor", "motion", "pir", "bosch", "sensor", "long-range", "intrusion"],
  },
  {
    id: "bosch-cdl1-wa12g",
    manufacturer: "Bosch",
    model: "ISC-CDL1-WA12G",
    name: "Ceiling-Mount PIR Sensor",
    fullName: "Bosch Ceiling-Mount PIR",
    category: "sensor",
    subcategory: "motion",
    msrp: 78,
    streetPrice: 55,
    laborHours: 0.75,
    specs: {
      rangeMeters: 12,
      fovDegrees: 360,
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
    },
    description: "360° ceiling-mount PIR, 12m radius, walk-test LED",
    tags: ["indoor", "motion", "pir", "bosch", "sensor", "ceiling", "360", "intrusion"],
  },

  // =======================================================================
  // SENSORS — Honeywell
  // =======================================================================
  {
    id: "honeywell-is3016",
    manufacturer: "Honeywell",
    model: "IS3016",
    name: "PIR Motion Sensor",
    fullName: "Honeywell IS3016 PIR",
    category: "sensor",
    subcategory: "motion",
    msrp: 57,
    streetPrice: 40,
    laborHours: 0.75,
    specs: {
      rangeMeters: 16,
      fovDegrees: 90,
      mounting: "wall",
      indoor: true,
      outdoor: false,
    },
    description: "PIR motion sensor, 16m range, 90° coverage",
    tags: ["indoor", "motion", "pir", "honeywell", "sensor", "intrusion"],
  },
  {
    id: "honeywell-fg1625",
    manufacturer: "Honeywell",
    model: "FG-1625",
    name: "Acoustic Glass-Break Sensor",
    fullName: "Honeywell FG-1625 Glass-Break",
    category: "sensor",
    subcategory: "glass-break",
    msrp: 85,
    streetPrice: 60,
    laborHours: 0.5,
    specs: {
      rangeMeters: 7.6,
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
    },
    description: "Acoustic glass-break, 7.6m range, FlexGuard technology",
    tags: ["indoor", "glass-break", "acoustic", "honeywell", "sensor", "intrusion"],
  },
  {
    id: "honeywell-5816",
    manufacturer: "Honeywell",
    model: "5816",
    name: "Door/Window Transmitter",
    fullName: "Honeywell 5816 Door/Window",
    category: "sensor",
    subcategory: "door-contact",
    msrp: 36,
    streetPrice: 25,
    laborHours: 0.25,
    specs: {
      mounting: "surface",
      indoor: true,
      outdoor: false,
      wireless: true,
    },
    description: "Wireless door/window contact, 345 MHz, slim profile",
    tags: ["indoor", "door-contact", "wireless", "magnetic", "honeywell", "sensor", "intrusion"],
  },

  // =======================================================================
  // SENSORS — System Sensor (Fire)
  // =======================================================================
  {
    id: "system-sensor-2wtr-b",
    manufacturer: "System Sensor",
    model: "2WTR-B",
    name: "Smoke Detector",
    fullName: "System Sensor 2WTR-B Smoke Detector",
    category: "sensor",
    subcategory: "smoke",
    msrp: 50,
    streetPrice: 35,
    laborHours: 0.75,
    specs: {
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
    },
    description: "Conventional 2-wire photoelectric smoke detector",
    tags: ["indoor", "smoke", "fire", "photoelectric", "system-sensor", "sensor", "conventional"],
  },
  {
    id: "system-sensor-spsr",
    manufacturer: "System Sensor",
    model: "SPSR",
    name: "Speaker/Strobe",
    fullName: "System Sensor SPSR Speaker/Strobe",
    category: "sensor",
    subcategory: "notification",
    msrp: 120,
    streetPrice: 85,
    laborHours: 1.0,
    specs: {
      mounting: "wall",
      indoor: true,
      outdoor: false,
    },
    description: "Wall-mount speaker/strobe, selectable candela, fire alarm",
    tags: ["indoor", "notification", "speaker", "strobe", "fire", "system-sensor", "sensor", "alarm"],
  },
  {
    id: "system-sensor-p2rh",
    manufacturer: "System Sensor",
    model: "P2RH",
    name: "Heat Detector",
    fullName: "System Sensor P2RH Heat Detector",
    category: "sensor",
    subcategory: "heat",
    msrp: 42,
    streetPrice: 30,
    laborHours: 0.75,
    specs: {
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
    },
    description: "Rate-of-rise heat detector, 135°F fixed temp, low-profile",
    tags: ["indoor", "heat", "fire", "rate-of-rise", "system-sensor", "sensor", "conventional"],
  },

  // =======================================================================
  // NETWORK — Ubiquiti
  // =======================================================================
  {
    id: "ubiquiti-u6-enterprise",
    manufacturer: "Ubiquiti",
    model: "U6 Enterprise",
    name: "WiFi 6E Access Point",
    fullName: "Ubiquiti U6 Enterprise AP",
    category: "network",
    subcategory: "access-point",
    msrp: 500,
    streetPrice: 350,
    laborHours: 1.0,
    specs: {
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
      poe: true,
      coverageMeters: 30,
      wireless: true,
    },
    description: "WiFi 6E access point, 2.5G uplink, PoE, UniFi managed",
    tags: ["indoor", "access-point", "wifi", "wifi-6e", "ubiquiti", "unifi", "poe", "network"],
  },
  {
    id: "ubiquiti-usw-pro-24-poe",
    manufacturer: "Ubiquiti",
    model: "USW-Pro-24-PoE",
    name: "24-Port Managed PoE Switch",
    fullName: "Ubiquiti USW-Pro-24-PoE Switch",
    category: "network",
    subcategory: "switch",
    msrp: 1000,
    streetPrice: 700,
    laborHours: 2.0,
    specs: {
      portCount: 24,
      mounting: "surface",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "24-port L2/L3 managed PoE+ switch, 400W PoE budget",
    tags: ["indoor", "switch", "poe", "24-port", "managed", "ubiquiti", "unifi", "network", "layer-3"],
  },

  // =======================================================================
  // NETWORK — Cisco Meraki
  // =======================================================================
  {
    id: "meraki-ms225-24p",
    manufacturer: "Cisco Meraki",
    model: "MS225-24P",
    name: "24-Port PoE Switch",
    fullName: "Cisco Meraki MS225-24P Switch",
    category: "network",
    subcategory: "switch",
    msrp: 2570,
    streetPrice: 1800,
    laborHours: 2.0,
    specs: {
      portCount: 24,
      mounting: "surface",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "24-port PoE L2 switch, cloud-managed, 370W PoE",
    tags: ["indoor", "switch", "poe", "24-port", "managed", "cisco", "meraki", "cloud", "network"],
  },
  {
    id: "meraki-mr46",
    manufacturer: "Cisco Meraki",
    model: "MR46",
    name: "WiFi 6 Access Point",
    fullName: "Cisco Meraki MR46 AP",
    category: "network",
    subcategory: "access-point",
    msrp: 1285,
    streetPrice: 900,
    laborHours: 1.0,
    specs: {
      mounting: "ceiling",
      indoor: true,
      outdoor: false,
      poe: true,
      coverageMeters: 35,
      wireless: true,
    },
    description: "WiFi 6 AP, cloud-managed, 802.11ax, enterprise",
    tags: ["indoor", "access-point", "wifi", "wifi-6", "cisco", "meraki", "cloud", "poe", "network", "enterprise"],
  },

  // =======================================================================
  // NETWORK — NVRs
  // =======================================================================
  {
    id: "axis-s3008",
    manufacturer: "Axis",
    model: "S3008",
    name: "8-Channel Recorder",
    fullName: "Axis S3008 Recorder",
    category: "network",
    subcategory: "nvr",
    msrp: 1210,
    streetPrice: 850,
    laborHours: 2.5,
    specs: {
      channelCount: 8,
      storageCapacity: "4TB",
      portCount: 8,
      mounting: "surface",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "8-channel recorder, 4TB, built-in PoE switch, AXIS Camera Station",
    tags: ["indoor", "nvr", "recorder", "8-channel", "4tb", "axis", "poe", "network"],
  },
  {
    id: "verkada-vx52",
    manufacturer: "Verkada",
    model: "VX52",
    name: "Cloud-Managed NVR",
    fullName: "Verkada VX52 NVR",
    category: "network",
    subcategory: "nvr",
    msrp: 3430,
    streetPrice: 2400,
    laborHours: 3.0,
    specs: {
      channelCount: 32,
      storageCapacity: "10TB",
      mounting: "surface",
      indoor: true,
      outdoor: false,
      poe: false,
    },
    description: "Cloud-managed NVR, 32-channel, 10TB, Verkada Command",
    tags: ["indoor", "nvr", "recorder", "32-channel", "10tb", "verkada", "cloud", "network"],
  },
  {
    id: "hanwha-xrn-1620b",
    manufacturer: "Hanwha Vision",
    model: "XRN-1620B",
    name: "16-Channel NVR",
    fullName: "Hanwha XRN-1620B NVR",
    category: "network",
    subcategory: "nvr",
    msrp: 1570,
    streetPrice: 1100,
    laborHours: 2.5,
    specs: {
      channelCount: 16,
      storageCapacity: "8TB",
      portCount: 16,
      mounting: "surface",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "16-channel NVR, 8TB, built-in PoE, Wisenet WAVE",
    tags: ["indoor", "nvr", "recorder", "16-channel", "8tb", "hanwha", "samsung", "poe", "network"],
  },
  {
    id: "hanwha-xrn-3210b2",
    manufacturer: "Hanwha Vision",
    model: "XRN-3210B2",
    name: "32-Channel NVR",
    fullName: "Hanwha XRN-3210B2 NVR",
    category: "network",
    subcategory: "nvr",
    msrp: 2570,
    streetPrice: 1800,
    laborHours: 3.0,
    specs: {
      channelCount: 32,
      storageCapacity: "16TB",
      portCount: 16,
      mounting: "surface",
      indoor: true,
      outdoor: false,
      poe: true,
    },
    description: "32-channel NVR, 16TB, RAID, Wisenet WAVE",
    tags: ["indoor", "nvr", "recorder", "32-channel", "16tb", "hanwha", "samsung", "poe", "network", "raid"],
  },
];

// ---------------------------------------------------------------------------
// Default product per subtype — used to map the legacy generic subtypes to a
// sensible real product when no explicit selection has been made.
// ---------------------------------------------------------------------------

export const DEFAULT_PRODUCT_FOR_SUBTYPE: Record<string, string> = {
  dome: "verkada-cd52",
  bullet: "verkada-cb52",
  ptz: "axis-q6135-le",
  fixed: "verkada-cb52",
  fisheye: "verkada-cf82",
  "multi-sensor": "hanwha-pnm-9085rqz",
  mini: "verkada-cm42",
  modular: "axis-fa54",
  card: "hid-signo-40",
  biometric: "suprema-bioentry-w2",
  keypad: "hid-rk40",
  controller: "mercury-lp4502",
  lock: "assa-abloy-aperio-h100",
  motion: "bosch-bdl2-wp12g",
  "glass-break": "honeywell-fg1625",
  "door-contact": "honeywell-5816",
  smoke: "system-sensor-2wtr-b",
  heat: "system-sensor-p2rh",
  notification: "system-sensor-spsr",
  "access-point": "ubiquiti-u6-enterprise",
  switch: "ubiquiti-usw-pro-24-poe",
  nvr: "axis-s3008",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lazy index built on first call, then cached. */
let _byId: Map<string, CatalogProduct> | null = null;

function ensureIndex(): Map<string, CatalogProduct> {
  if (!_byId) {
    _byId = new Map(PRODUCT_CATALOG.map((p) => [p.id, p]));
  }
  return _byId;
}

/** Look up a single product by its unique id. */
export function getProduct(id: string): CatalogProduct | undefined {
  return ensureIndex().get(id);
}

/** Return all products in a given top-level category. */
export function getProductsByCategory(
  category: CatalogProduct["category"],
): CatalogProduct[] {
  return PRODUCT_CATALOG.filter((p) => p.category === category);
}

/** Return all products that match a given subcategory. */
export function getProductsBySubcategory(
  subcategory: CatalogProduct["subcategory"],
): CatalogProduct[] {
  return PRODUCT_CATALOG.filter((p) => p.subcategory === subcategory);
}

/**
 * Free-text search across name, model, manufacturer, description, and tags.
 * Case-insensitive.  Returns products sorted by relevance (number of matching
 * terms).
 */
export function searchProducts(query: string): CatalogProduct[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) return [];

  const scored = PRODUCT_CATALOG.map((p) => {
    const haystack = [
      p.name,
      p.model,
      p.manufacturer,
      p.fullName,
      p.description,
      p.subcategory,
      ...p.tags,
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;
    for (const term of terms) {
      if (haystack.includes(term)) score += 1;
    }
    return { product: p, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.product);
}
