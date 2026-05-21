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
  { key: "reader", label: "Access Control" },
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
  }

  return (
    <aside className="flex flex-col h-full border-r border-border/70 bg-sidebar">
      <div className="border-b border-border/70 px-3 py-3.5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Product library
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
                  "flex-1 px-1 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] transition-colors",
                  isActive
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground/70 hover:text-muted-foreground",
                )}
              >
                <span className={cn("mr-1 inline-block size-1.5 rounded-full", isActive ? tone.dot : "bg-muted-foreground/30")} />
                {cat.label}
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
                  <div className="font-serif-italic text-foreground/70">
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
                  <div className="ml-2 space-y-1 pb-2">
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
                            "group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border border-border/70",
                            "bg-card/40 px-2.5 py-2 text-left",
                            "transition-[transform,background-color,border-color,box-shadow] duration-200",
                            "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card",
                            tone.shadow,
                            "active:translate-y-0 active:scale-[0.99] cursor-grab active:cursor-grabbing",
                          )}
                        >
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(0_0_0_/_8%),0_1px_3px_-1px_rgb(0_0_0_/_15%)]">
                            <DevicePreview3D kind={preview} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[0.8rem] font-medium tracking-[-0.005em]">
                                {product.model}
                              </span>
                              <span className={cn(
                                "shrink-0 rounded-full border px-1.5 py-0 text-[0.55rem] font-mono leading-relaxed",
                                tone.pill,
                              )}>
                                {product.subcategory}
                              </span>
                            </div>
                            <div className="truncate text-[0.68rem] text-muted-foreground/85">
                              {product.description}
                            </div>
                            <div className="mt-0.5 text-[0.62rem] font-mono text-muted-foreground/60">
                              {formatPrice(product.streetPrice)}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-50">
                            <span className="size-1 rounded-full bg-current" />
                            <span className="size-1 rounded-full bg-current" />
                            <span className="size-1 rounded-full bg-current" />
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
