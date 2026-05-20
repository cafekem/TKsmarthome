"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { DeviceType } from "@/types/design";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DevicePreview3D, type PreviewKind } from "./DevicePreview3D";

type CameraSubtype = "dome" | "ptz" | "fixed" | "fisheye";
type ReaderSubtype = "card" | "biometric" | "keypad";
type SensorSubtype = "motion" | "glass-break" | "door-contact" | "smoke";
type NetworkSubtype = "switch" | "access-point" | "nvr";

interface DeviceCard {
  type: DeviceType;
  subtype: CameraSubtype | ReaderSubtype | SensorSubtype | NetworkSubtype;
  label: string;
  description: string;
}

// Per-device-type accent metadata that drives the hover shadow + category
// pill. Keeping this colocated with the catalog means each device kind has
// one source of truth for its color identity.
const TYPE_TONE: Record<
  DeviceType,
  { dot: string; pill: string; shadow: string }
> = {
  camera: {
    dot: "bg-emerald-400",
    pill: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    shadow: "hover:shadow-[0_10px_28px_-14px_oklch(0.7_0.16_158/40%)]",
  },
  reader: {
    dot: "bg-sky-400",
    pill: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/20",
    shadow: "hover:shadow-[0_10px_28px_-14px_oklch(0.65_0.16_230/40%)]",
  },
  sensor: {
    dot: "bg-amber-400",
    pill: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
    shadow: "hover:shadow-[0_10px_28px_-14px_oklch(0.75_0.16_80/45%)]",
  },
  network: {
    dot: "bg-violet-400",
    pill: "text-violet-700 dark:text-violet-300 bg-violet-500/10 border-violet-500/20",
    shadow: "hover:shadow-[0_10px_28px_-14px_oklch(0.65_0.18_300/40%)]",
  },
};

function previewKindFor(card: DeviceCard): PreviewKind {
  switch (card.type) {
    case "camera":
      return { type: "camera", subtype: card.subtype as CameraSubtype };
    case "reader":
      return { type: "reader", subtype: card.subtype as ReaderSubtype };
    case "sensor":
      return { type: "sensor", subtype: card.subtype as SensorSubtype };
    case "network":
      return { type: "network", subtype: card.subtype as NetworkSubtype };
  }
}

const catalog: { category: string; items: DeviceCard[] }[] = [
  {
    category: "Cameras",
    items: [
      {
        type: "camera",
        subtype: "dome",
        label: "Dome camera",
        description: "Indoor ceiling-mount · 90° FOV",
      },
      {
        type: "camera",
        subtype: "ptz",
        label: "PTZ camera",
        description: "Pan / tilt / zoom · 60° FOV",
      },
      {
        type: "camera",
        subtype: "fixed",
        label: "Fixed camera",
        description: "Wall-mount bullet · 80° FOV",
      },
    ],
  },
  {
    category: "Access control",
    items: [
      {
        type: "reader",
        subtype: "card",
        label: "Card reader",
        description: "Door-side mount · 1.2m",
      },
      {
        type: "reader",
        subtype: "biometric",
        label: "Biometric reader",
        description: "Fingerprint + card",
      },
    ],
  },
  {
    category: "Sensors",
    items: [
      {
        type: "sensor",
        subtype: "motion",
        label: "Motion sensor",
        description: "PIR · 8m detection",
      },
      {
        type: "sensor",
        subtype: "glass-break",
        label: "Glass-break",
        description: "Acoustic · 6m range",
      },
      {
        type: "sensor",
        subtype: "door-contact",
        label: "Door contact",
        description: "Magnetic switch",
      },
    ],
  },
  {
    category: "Network",
    items: [
      {
        type: "network",
        subtype: "access-point",
        label: "Wi-Fi access point",
        description: "Wi-Fi 6 · 15m coverage",
      },
      {
        type: "network",
        subtype: "switch",
        label: "Network switch",
        description: "PoE · 24 ports",
      },
      {
        type: "network",
        subtype: "nvr",
        label: "NVR",
        description: "32-channel · 8TB",
      },
    ],
  },
];

const CATEGORY_TYPE: Record<string, DeviceType> = {
  Cameras: "camera",
  "Access control": "reader",
  Sensors: "sensor",
  Network: "network",
};

export function LibraryPanel() {
  const [query, setQuery] = useState("");
  const floor = useActiveFloor();
  const addDevice = useDesignStore((s) => s.addDevice);

  const lower = query.trim().toLowerCase();
  const filtered = catalog
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (i) =>
          !lower ||
          i.label.toLowerCase().includes(lower) ||
          i.description.toLowerCase().includes(lower) ||
          group.category.toLowerCase().includes(lower)
      ),
    }))
    .filter((g) => g.items.length > 0);

  function quickAdd(card: DeviceCard) {
    if (!floor) return;
    addDevice(floor.id, card.type, {
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
    });
  }

  return (
    <aside className="flex flex-col h-full border-r border-border/70 bg-sidebar">
      <div className="border-b border-border/70 px-3 py-3.5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Device library
          </div>
          <div className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-muted-foreground/70">
            drag → canvas
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search devices…"
            className="h-9 w-full rounded-lg border border-border bg-background/50 pl-8 pr-3 text-[0.82rem] outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-border/90 focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-6">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12 px-3">
              <div className="mb-1">Nothing matches</div>
              <div className="font-serif-italic text-foreground/70">
                &ldquo;{query}&rdquo;
              </div>
            </div>
          )}
          {filtered.map((group) => {
            const deviceType = CATEGORY_TYPE[group.category];
            const tone = TYPE_TONE[deviceType];
            return (
              <div key={group.category}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", tone.dot)} />
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {group.category}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[0.6rem] font-mono",
                      tone.pill
                    )}
                  >
                    {group.items.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.items.map((card) => (
                    <button
                      key={card.label}
                      type="button"
                      onClick={() => quickAdd(card)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/x-dv-device",
                          JSON.stringify({
                            type: card.type,
                            subtype: card.subtype,
                          })
                        );
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      className={cn(
                        "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border/70",
                        "bg-card/40 px-2.5 py-2 text-left",
                        "transition-[transform,background-color,border-color,box-shadow] duration-200",
                        "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card",
                        tone.shadow,
                        "active:translate-y-0 active:scale-[0.99] cursor-grab active:cursor-grabbing"
                      )}
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(0_0_0_/_8%),0_1px_3px_-1px_rgb(0_0_0_/_15%)]">
                        <DevicePreview3D kind={previewKindFor(card)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.85rem] font-medium tracking-[-0.005em]">
                          {card.label}
                        </div>
                        <div className="truncate text-[0.7rem] text-muted-foreground/85">
                          {card.description}
                        </div>
                      </div>
                      {/* Subtle drag affordance — three vertical dots that show on hover */}
                      <div className="flex shrink-0 flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-50">
                        <span className="size-1 rounded-full bg-current" />
                        <span className="size-1 rounded-full bg-current" />
                        <span className="size-1 rounded-full bg-current" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
