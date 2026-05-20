"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { DeviceType } from "@/types/design";
import { Input } from "@/components/ui/input";
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

function previewKindFor(card: DeviceCard): PreviewKind {
  // Narrow the union — at runtime the type field tells us the subtype shape
  switch (card.type) {
    case "camera":
      return {
        type: "camera",
        subtype: card.subtype as CameraSubtype,
      };
    case "reader":
      return {
        type: "reader",
        subtype: card.subtype as ReaderSubtype,
      };
    case "sensor":
      return {
        type: "sensor",
        subtype: card.subtype as SensorSubtype,
      };
    case "network":
      return {
        type: "network",
        subtype: card.subtype as NetworkSubtype,
      };
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
        description: "Indoor, ceiling-mount, 90° FOV",
      },
      {
        type: "camera",
        subtype: "ptz",
        label: "PTZ camera",
        description: "Pan / tilt / zoom, 60° FOV",
      },
      {
        type: "camera",
        subtype: "fixed",
        label: "Fixed camera",
        description: "Wall-mount, 80° FOV",
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
        description: "Door-side mount, 1.2m",
      },
      {
        type: "reader",
        subtype: "biometric",
        label: "Biometric reader",
        description: "Fingerprint or face",
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
        description: "PIR, 8m detection",
      },
      {
        type: "sensor",
        subtype: "glass-break",
        label: "Glass-break",
        description: "Acoustic, 6m range",
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
        label: "WiFi AP",
        description: "WiFi 6, 15m coverage",
      },
      {
        type: "network",
        subtype: "switch",
        label: "Network switch",
        description: "PoE, 24 ports",
      },
      {
        type: "network",
        subtype: "nvr",
        label: "NVR",
        description: "Network video recorder",
      },
    ],
  },
];

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
    addDevice(floor.id, card.type, { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 });
  }

  return (
    <aside className="flex flex-col h-full border-r border-border/70 bg-sidebar">
      <div className="border-b border-border/70 px-3 py-3">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
          Device library
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search devices…"
            className="pl-8 h-9 bg-background/40"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-5">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              No devices match &ldquo;{query}&rdquo;.
            </div>
          )}
          {filtered.map((group) => (
            <div key={group.category}>
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                {group.category}
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
                        JSON.stringify({ type: card.type, subtype: card.subtype })
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-lg border border-border bg-card/40 p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-card",
                      "cursor-grab active:cursor-grabbing"
                    )}
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border shadow-[inset_0_1px_0_color-mix(in_oklch,white_8%,transparent)]">
                      <DevicePreview3D kind={previewKindFor(card)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {card.label}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {card.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
