"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { DeviceType } from "@/types/design";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DevicePreview3D, type PreviewKind } from "./DevicePreview3D";
import {
  type CatalogProduct,
  getProductsByCategory,
  searchProducts,
} from "@/lib/catalog";

const TYPE_TONE: Record<
  DeviceType,
  { dot: string; pill: string; shadow: string }
> = {
  camera: {
    dot: "bg-blue-500",
    pill: "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/20",
    shadow: "hover:shadow-[0_10px_28px_-14px_oklch(0.6_0.17_245/45%)]",
  },
  reader: {
    dot: "bg-sky-500",
    pill: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/20",
    shadow: "hover:shadow-[0_10px_28px_-14px_oklch(0.65_0.16_230/40%)]",
  },
  sensor: {
    dot: "bg-amber-500",
    pill: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
    shadow: "hover:shadow-[0_10px_28px_-14px_oklch(0.75_0.16_80/45%)]",
  },
  network: {
    dot: "bg-violet-400",
    pill: "text-violet-700 dark:text-violet-300 bg-violet-500/10 border-violet-500/20",
    shadow: "hover:shadow-[0_10px_28px_-14px_oklch(0.65_0.18_300/40%)]",
  },
};

const SUBCATEGORY_TO_PREVIEW: Record<string, PreviewKind> = {
  dome: { type: "camera", subtype: "dome" },
  bullet: { type: "camera", subtype: "fixed" },
  fixed: { type: "camera", subtype: "fixed" },
  ptz: { type: "camera", subtype: "ptz" },
  fisheye: { type: "camera", subtype: "dome" },
  "multi-sensor": { type: "camera", subtype: "dome" },
  mini: { type: "camera", subtype: "dome" },
  modular: { type: "camera", subtype: "fixed" },
  card: { type: "reader", subtype: "card" },
  biometric: { type: "reader", subtype: "biometric" },
  keypad: { type: "reader", subtype: "keypad" },
  controller: { type: "reader", subtype: "card" },
  lock: { type: "reader", subtype: "card" },
  motion: { type: "sensor", subtype: "motion" },
  "glass-break": { type: "sensor", subtype: "glass-break" },
  "door-contact": { type: "sensor", subtype: "door-contact" },
  smoke: { type: "sensor", subtype: "motion" },
  heat: { type: "sensor", subtype: "motion" },
  notification: { type: "sensor", subtype: "motion" },
  "access-point": { type: "network", subtype: "access-point" },
  switch: { type: "network", subtype: "switch" },
  nvr: { type: "network", subtype: "nvr" },
};

type CategoryKey = "camera" | "reader" | "sensor" | "network";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "camera", label: "Cameras" },
  { key: "reader", label: "Access" },
  { key: "sensor", label: "Sensors" },
  { key: "network", label: "Network" },
];

function groupByManufacturer(products: CatalogProduct[]) {
  const map = new Map<string, CatalogProduct[]>();
  for (const p of products) {
    const list = map.get(p.manufacturer) ?? [];
    list.push(p);
    map.set(p.manufacturer, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatPrice(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}

export function LibraryPanel() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("camera");
  const [expandedMfg, setExpandedMfg] = useState<Set<string>>(new Set());
  const floor = useActiveFloor();
  const addDevice = useDesignStore((s) => s.addDevice);

  const isSearching = query.trim().length > 0;

  const searchResults = useMemo(
    () => (isSearching ? searchProducts(query) : []),
    [query, isSearching],
  );

  const categoryProducts = useMemo(
    () => (isSearching ? [] : getProductsByCategory(activeCategory)),
    [activeCategory, isSearching],
  );

  const grouped = useMemo(
    () => groupByManufacturer(isSearching ? searchResults : categoryProducts),
    [isSearching, searchResults, categoryProducts],
  );

  function toggleMfg(name: string) {
    setExpandedMfg((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleAdd(product: CatalogProduct) {
    if (!floor) return;
    addDevice(
      floor.id,
      product.category,
      { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      product,
    );
  }

  function handleDragStart(e: React.DragEvent, product: CatalogProduct) {
    e.dataTransfer.setData(
      "application/x-dv-device",
      JSON.stringify({
        type: product.category,
        subtype: product.subcategory,
        catalogId: product.id,
      }),
    );
    e.dataTransfer.effectAllowed = "copy";

    // Custom drag preview — replace the native "row banner" with a small,
    // device-shaped pill (same visual language as the 2D canvas marker) so
    // the cursor carries just the item, not the entire library row.
    const ghost = buildDragGhost(product);
    document.body.appendChild(ghost);
    // Center the ghost under the cursor (32×32 → offset 16,16).
    e.dataTransfer.setDragImage(ghost, 24, 24);
    // The browser owns the ghost for the duration of the drag; clean up after.
    window.setTimeout(() => ghost.remove(), 0);
  }

  return (
    <aside className="flex flex-col h-full border-r border-border/70 bg-sidebar">
      <div className="border-b border-border/70 px-3 py-3.5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <div className="text-[0.92rem] font-semibold tracking-[-0.01em] text-foreground">
            Library
          </div>
          <div className="text-[0.7rem] text-muted-foreground/70">
            Drag onto canvas
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products… e.g. Verkada dome"
            className="h-9 w-full rounded-lg border border-border bg-background/50 pl-8 pr-3 text-[0.82rem] outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-border/90 focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {!isSearching && (
        <div className="flex border-b border-border/70">
          {CATEGORIES.map((cat) => {
            const tone = TYPE_TONE[cat.key];
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1.5 px-1 py-2.5 text-[0.74rem] font-medium tracking-[-0.005em] transition-colors relative",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground/80 hover:text-foreground",
                )}
              >
                <span className={cn("inline-block size-1.5 rounded-full transition-colors", isActive ? tone.dot : "bg-muted-foreground/30")} />
                {cat.label}
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {grouped.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12 px-3">
              {isSearching ? (
                <>
                  <div className="mb-1">No products match</div>
                  <div className="font-medium text-foreground/80">
                    &ldquo;{query}&rdquo;
                  </div>
                </>
              ) : (
                <div>No products in this category</div>
              )}
            </div>
          )}

          {grouped.map(([manufacturer, products]) => {
            const isOpen = isSearching || expandedMfg.has(manufacturer) || grouped.length === 1;
            return (
              <div key={manufacturer}>
                <button
                  type="button"
                  onClick={() => toggleMfg(manufacturer)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 text-muted-foreground transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                  <span className="text-[0.78rem] font-semibold tracking-[-0.005em]">
                    {manufacturer}
                  </span>
                  <span className="ml-auto text-[0.62rem] font-mono text-muted-foreground/70">
                    {products.length}
                  </span>
                </button>

                {isOpen && (
                  <div className="ml-1 space-y-1 pb-2">
                    {products.map((product) => {
                      const tone = TYPE_TONE[product.category];
                      const preview = SUBCATEGORY_TO_PREVIEW[product.subcategory] ?? { type: "camera", subtype: "dome" };
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAdd(product)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, product)}
                          className={cn(
                            "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl",
                            "bg-card/30 px-2.5 py-2 text-left ring-1 ring-border/40",
                            "transition-[transform,background-color,box-shadow,ring] duration-200",
                            "hover:bg-card hover:ring-border hover:shadow-[0_4px_18px_-10px_rgba(0,0,0,0.18)]",
                            "active:scale-[0.99] cursor-grab active:cursor-grabbing",
                          )}
                        >
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/[0.06] dark:ring-white/[0.04]">
                            <DevicePreview3D kind={preview} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[0.84rem] font-medium tracking-[-0.005em] text-foreground/95">
                                {product.model}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 inline-flex items-center gap-1 text-[0.62rem] tracking-[-0.005em] text-muted-foreground",
                                )}
                              >
                                <span className={cn("size-1 rounded-full", tone.dot)} />
                                {product.subcategory}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[0.7rem] text-muted-foreground/75">
                              <span className="truncate">{product.description}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5 text-[0.7rem] text-muted-foreground/60 tabular-nums">
                            {formatPrice(product.streetPrice)}
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60"
                              aria-hidden="true"
                            >
                              <circle cx="9" cy="6" r="1" />
                              <circle cx="9" cy="12" r="1" />
                              <circle cx="9" cy="18" r="1" />
                              <circle cx="15" cy="6" r="1" />
                              <circle cx="15" cy="12" r="1" />
                              <circle cx="15" cy="18" r="1" />
                            </svg>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}

/* ── Drag ghost ─────────────────────────────────────────────────────────
   Build a small offscreen DOM element used by `setDragImage` so the
   cursor carries just the device (not the entire library row banner).
   The element is added to the body so the browser can snapshot it, then
   removed on the next tick. */

const DRAG_GHOST_COLORS: Record<string, string> = {
  camera: "#3b82f6",
  reader: "#0ea5e9",
  sensor: "#f59e0b",
  network: "#a78bfa",
};

function buildDragGhost(product: CatalogProduct): HTMLElement {
  const color = DRAG_GHOST_COLORS[product.category] ?? "#3b82f6";
  const root = document.createElement("div");
  // Position it offscreen so it's never visible to the user — the browser
  // only needs it to exist long enough to snapshot for the drag image.
  root.style.position = "fixed";
  root.style.top = "-1000px";
  root.style.left = "-1000px";
  root.style.width = "48px";
  root.style.height = "48px";
  root.style.display = "flex";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.pointerEvents = "none";
  root.style.fontFamily = "system-ui, sans-serif";

  // Outer white ring (matches the 2D canvas marker).
  const ring = document.createElement("div");
  ring.style.width = "36px";
  ring.style.height = "36px";
  ring.style.borderRadius = "50%";
  ring.style.background = "#ffffff";
  ring.style.boxShadow = "0 6px 14px -4px rgba(0,0,0,0.35)";
  ring.style.display = "flex";
  ring.style.alignItems = "center";
  ring.style.justifyContent = "center";
  root.appendChild(ring);

  // Inner colored body.
  const body = document.createElement("div");
  body.style.width = "28px";
  body.style.height = "28px";
  body.style.borderRadius = "50%";
  body.style.background = color;
  body.style.display = "flex";
  body.style.alignItems = "center";
  body.style.justifyContent = "center";
  body.style.color = "#ffffff";
  body.style.fontSize = "13px";
  body.style.fontWeight = "600";
  body.textContent = product.subcategory
    ? product.subcategory.charAt(0).toUpperCase()
    : "·";
  ring.appendChild(body);

  return root;
}
