"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Compass,
  FileDown,
  FileSpreadsheet,
  FileText,
  Images,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunset,
  Upload,
} from "lucide-react";
import type { FloorStyle, WallStyle, TimeOfDay } from "@/types/design";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/branding/Logo";
import { useDesignStore, useCurrentDesign, useActiveFloor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ModeSwitcher } from "./ModeSwitcher";
import { toast } from "sonner";

export function TopBar() {
  const design = useCurrentDesign();
  const floor = useActiveFloor();
  const updateName = useDesignStore((s) => s.updateDesignName);
  const importDesign = useDesignStore((s) => s.importDesign);
  const quoteSettings = useDesignStore((s) => s.quoteSettings);
  const setQuoteOpen = useDesignStore((s) => s.setQuoteOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!design) return null;

  function exportJSON() {
    if (!design) return;
    const blob = new Blob([JSON.stringify(design, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${design.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "design"}.dvjson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Design exported", {
      description: `${a.download} saved to your downloads.`,
    });
  }

  function importJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed?.id || !Array.isArray(parsed?.floors)) {
          throw new Error("Invalid design file");
        }
        importDesign(parsed);
        toast.success("Design imported", {
          description: `Loaded "${parsed.name}".`,
        });
      } catch {
        toast.error("Couldn't read that file", {
          description: "Make sure it's a .dvjson export from DeeperVision.",
        });
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border/70 bg-sidebar px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-[0.92rem] font-medium tracking-[-0.01em] text-foreground/90 hover:text-foreground transition-colors"
          >
            <span className="flex size-6 items-center justify-center text-primary">
              <LogoMark strokeWidth={1.8} />
            </span>
            DeeperVision
          </Link>
          <div className="h-4 w-px bg-border/70" />
          {/* Inline title editor — auto-sizes to its content so the
              focus/hover background never extends past the actual text.
              Capped at a comfortable max so very long titles wrap. */}
          <TitleInput value={design.name} onChange={(v) => updateName(design.id, v)} />
        </div>

        <ModeSwitcher />

        <div className="flex flex-1 items-center justify-end gap-1">
          {/* Coverage toggle moved into the 3D scene's left tool strip
              (alongside Wiring) so all scene-rendering toggles live in one
              place. */}

          {/* AI chat tab toggle (no dropdown, no kbd hint). */}
          <AIMenu />

          {/* Single combined Project menu — replaces File + Export.
              Holds save, import, and every export option (PDF, BoM CSV,
              device schedule CSV, dvjson). */}
          <span data-tour="project-menu" className="inline-flex">
            <ProjectMenu
              design={design}
              floor={floor}
              quoteSettings={quoteSettings}
              onImport={() => fileInputRef.current?.click()}
              onSaveJson={exportJSON}
            />
          </span>

          <Button
            data-tour="quote"
            size="sm"
            className="btn-lift ml-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[inset_0_1px_0_oklch(1_0_0/14%),0_4px_14px_-6px_oklch(0.78_0.135_158/50%)]"
            onClick={() => setQuoteOpen(true)}
          >
            <Calculator className="size-3.5" />
            Quote
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".dvjson,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJSON(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>
      {/* QuoteDrawer is mounted at the EditorShell level now so the AI chat
          panel can open it too via the same store flag. */}
    </>
  );
}

/**
 * Top-bar AI dropdown — Survey (auto-design from image) + Advisor (analyse
 * coverage of an existing design). Both trigger state living in the design
 * store so the actual UI (dialog / drawer) is mounted at EditorShell level.
 */
/**
 * Single AI button — clicking it toggles the AI tab in the right sidebar.
 * No dropdown, no flyout. Survey and Advisor are accessible from inside
 * the chat's empty state ("From plan image" / "Analyze coverage" buttons).
 */

function AIMenu() {
  const rightTab = useDesignStore((s) => s.rightTab);
  const setRightTab = useDesignStore((s) => s.setRightTab);
  const active = rightTab === "ai";
  return (
    <button
      type="button"
      onClick={() => setRightTab(active ? "properties" : "ai")}
      className={
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium transition-colors " +
        (active
          ? "bg-primary/12 text-primary"
          : "text-primary hover:bg-primary/10")
      }
      aria-pressed={active}
      title={active ? "Hide AI chat" : "Open AI chat (⌘K)"}
    >
      <Sparkles className="size-3.5" strokeWidth={1.9} />
      <span className="hidden sm:inline">AI</span>
    </button>
  );
}

/**
 * Combined project + scene settings menu. Iconified gear trigger (no label,
 * no chevron). The dropdown holds project file operations + every export +
 * the scene-style controls (time-of-day, wall texture, floor texture) that
 * used to live as floating buttons on the 3D canvas.
 */
function ProjectMenu({
  design,
  floor,
  quoteSettings,
  onImport,
  onSaveJson,
}: {
  design: ReturnType<typeof useCurrentDesign>;
  floor: ReturnType<typeof useActiveFloor>;
  quoteSettings: ReturnType<typeof useDesignStore.getState>["quoteSettings"];
  onImport: () => void;
  onSaveJson: () => void;
}) {
  const [open, setOpen] = useState(false);
  const timeOfDay = useDesignStore((s) => s.timeOfDay);
  const setTimeOfDay = useDesignStore((s) => s.setTimeOfDay);
  const updateFloor = useDesignStore((s) => s.updateFloor);
  const wallStyle: WallStyle = floor?.wallStyle ?? "plain";
  const floorStyle: FloorStyle = floor?.floorStyle ?? "wood";

  async function exportPDF() {
    if (!design || !floor) return;
    toast.info("Generating PDF…");
    const { exportFloorPlanPDF } = await import("@/lib/export");
    await exportFloorPlanPDF(design, floor, {
      preparedBy: quoteSettings.preparedBy,
      preparedFor: quoteSettings.clientName,
      companyLogoDataUrl: quoteSettings.companyLogoDataUrl || undefined,
      brandColor: quoteSettings.brandColor || undefined,
      printFooter: quoteSettings.printFooter || undefined,
    });
    toast.success("PDF exported");
  }
  async function exportBom() {
    if (!design || !floor) return;
    const { exportBOMCSV } = await import("@/lib/export");
    await exportBOMCSV(design, floor);
    toast.success("BOM exported");
  }
  async function exportSchedule() {
    if (!design || !floor) return;
    const { exportDeviceScheduleCSV } = await import("@/lib/export");
    await exportDeviceScheduleCSV(design, floor);
    toast.success("Device schedule exported");
  }
  async function exportPermitPackage() {
    if (!design || !floor) return;
    toast.info("Generating permit package…", { duration: 4000 });
    const { exportPermitPackagePDF } = await import("@/lib/export");
    await exportPermitPackagePDF(design, floor, {
      preparedBy: quoteSettings.preparedBy,
      preparedFor: quoteSettings.clientName,
      companyLogoDataUrl: quoteSettings.companyLogoDataUrl || undefined,
      brandColor: quoteSettings.brandColor || undefined,
      printFooter: quoteSettings.printFooter || undefined,
      // Permit-specific fields are blank by default — the integrator fills
      // them in by hand after print, or we read them from a future
      // PermitSettings dialog. For v1, blank is fine; the sheet still
      // generates with placeholder dashes.
    });
    toast.success("Permit package exported");
  }

  async function exportPhotoTour() {
    if (!design || !floor) return;
    const photoCount = floor.devices.reduce(
      (sum, d) => sum + (d.photos?.length ?? 0),
      0,
    );
    if (photoCount === 0) {
      toast.message("No site-walk photos yet", {
        description:
          "Select a device, click Add in the Photos section, then re-run this export.",
      });
      // Still generate the cover + empty-state page so the user has a
      // sharable artefact to put in front of the team.
    } else {
      toast.info(
        `Generating photo tour… ${photoCount} photo${photoCount === 1 ? "" : "s"}`,
      );
    }
    const { exportPhotoTourPDF } = await import("@/lib/export");
    await exportPhotoTourPDF(design, floor);
    if (photoCount > 0) toast.success("Photo tour exported");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Project settings"
        title="Project settings"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
      >
        <Settings className="size-4" strokeWidth={1.9} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-popover p-1 shadow-lg">
            <MenuSection label="Scene">
              <div className="px-2 pt-1 pb-2">
                <div className="mb-1 text-[0.66rem] uppercase tracking-[0.08em] text-muted-foreground/80">
                  Time of day
                </div>
                <SegmentedRow>
                  <SegmentedOption
                    active={timeOfDay === "day"}
                    onClick={() => setTimeOfDay("day" as TimeOfDay)}
                    icon={<Sun className="size-3.5" />}
                    label="Day"
                  />
                  <SegmentedOption
                    active={timeOfDay === "dusk"}
                    onClick={() => setTimeOfDay("dusk" as TimeOfDay)}
                    icon={<Sunset className="size-3.5" />}
                    label="Sunset"
                  />
                </SegmentedRow>
              </div>
              <div className="px-2 pb-2">
                <div className="mb-1 text-[0.66rem] uppercase tracking-[0.08em] text-muted-foreground/80">
                  Walls
                </div>
                <TileGrid>
                  {(["plain", "painted", "concrete", "brick"] as WallStyle[]).map(
                    (s) => (
                      <TileOption
                        key={s}
                        active={wallStyle === s}
                        onClick={() =>
                          floor && updateFloor(floor.id, { wallStyle: s })
                        }
                        label={WALL_LABELS[s]}
                        swatch={<WallSwatch style={s} />}
                      />
                    ),
                  )}
                </TileGrid>
              </div>
              <div className="px-2 pb-2">
                <div className="mb-1 text-[0.66rem] uppercase tracking-[0.08em] text-muted-foreground/80">
                  Floor
                </div>
                <TileGrid>
                  {(["wood", "tile", "concrete", "carpet"] as FloorStyle[]).map(
                    (s) => (
                      <TileOption
                        key={s}
                        active={floorStyle === s}
                        onClick={() =>
                          floor && updateFloor(floor.id, { floorStyle: s })
                        }
                        label={FLOOR_LABELS[s]}
                        swatch={<FloorSwatch style={s} />}
                      />
                    ),
                  )}
                </TileGrid>
              </div>
            </MenuSection>
            <div className="my-1 border-t border-border/50" />
            <MenuSection label="Project file">
              <MenuItem
                icon={<FileDown className="size-3.5 text-muted-foreground" />}
                label="Save project (.dvjson)"
                onClick={() => {
                  setOpen(false);
                  onSaveJson();
                }}
              />
              <MenuItem
                icon={<Upload className="size-3.5 text-muted-foreground" />}
                label="Import project"
                onClick={() => {
                  setOpen(false);
                  onImport();
                }}
              />
            </MenuSection>
            <div className="my-1 border-t border-border/50" />
            <MenuSection label="Export">
              <MenuItem
                icon={<FileText className="size-3.5 text-rose-500" />}
                label="Floor plan PDF"
                description="Install-ready drawing"
                onClick={() => {
                  setOpen(false);
                  exportPDF();
                }}
              />
              <MenuItem
                icon={<ShieldCheck className="size-3.5 text-orange-500" />}
                label="Permit package (PDF)"
                description="10 sheets — AHJ submittal-ready"
                onClick={() => {
                  setOpen(false);
                  exportPermitPackage();
                }}
              />
              <MenuItem
                icon={<FileSpreadsheet className="size-3.5 text-emerald-500" />}
                label="Bill of materials (CSV)"
                description="Quantities, pricing, labor"
                onClick={() => {
                  setOpen(false);
                  exportBom();
                }}
              />
              <MenuItem
                icon={<FileSpreadsheet className="size-3.5 text-sky-500" />}
                label="Device schedule (CSV)"
                description="Every device, one row each"
                onClick={() => {
                  setOpen(false);
                  exportSchedule();
                }}
              />
              <MenuItem
                icon={<Images className="size-3.5 text-violet-500" />}
                label="Photo tour (PDF)"
                description="Every site-walk photo, one per page"
                onClick={() => {
                  setOpen(false);
                  exportPhotoTour();
                }}
              />
            </MenuSection>
            <div className="my-1 border-t border-border/50" />
            <MenuSection label="Help">
              <MenuItem
                icon={<Compass className="size-3.5 text-primary" />}
                label="Take the tour"
                description="60-second walkthrough of the editor"
                onClick={() => {
                  setOpen(false);
                  useDesignStore.getState().startTour();
                }}
              />
            </MenuSection>
          </div>
        </>
      )}
    </div>
  );
}

const WALL_LABELS: Record<WallStyle, string> = {
  plain: "Drywall",
  painted: "Painted",
  concrete: "Concrete",
  brick: "Brick",
};

const FLOOR_LABELS: Record<FloorStyle, string> = {
  wood: "Wood",
  tile: "Tile",
  concrete: "Concrete",
  carpet: "Carpet",
};

/** Pill-shaped row of mutually-exclusive options used inside the gear menu
 *  for Time of day / Wall / Floor pickers. Uses auto-fit so each row sizes
 *  evenly regardless of how many options it holds. */
function SegmentedRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1 rounded-md bg-muted/40 p-1 [&>*]:flex-1">
      {children}
    </div>
  );
}

function SegmentedOption({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 items-center justify-center gap-1 rounded-sm px-1 text-[0.7rem] font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

/** 4-column grid of material tiles — each tile has a swatch + label. Used
 *  by the Walls + Floor pickers in the gear menu. */
function TileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-4 gap-1.5">{children}</div>;
}

function TileOption({
  active,
  onClick,
  label,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  swatch: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-stretch gap-1 rounded-md p-1 transition-all",
        active
          ? "bg-card ring-2 ring-primary/70"
          : "ring-1 ring-border/60 hover:ring-border hover:bg-foreground/[0.03]",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-sm ring-1 ring-black/5">
        {swatch}
      </div>
      <span
        className={cn(
          "text-center text-[0.62rem] font-medium leading-tight tracking-[-0.005em] transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** Inline SVG swatch of each wall style. Tiny — they render at ~40px so
 *  detail is intentionally chunky to be legible at thumbnail size. */
function WallSwatch({ style }: { style: WallStyle }) {
  switch (style) {
    case "plain":
      return (
        <svg viewBox="0 0 40 40" className="size-full">
          <rect width="40" height="40" fill="#e8e1d6" />
          <rect width="40" height="40" fill="url(#wallPlainGrain)" />
          <defs>
            <pattern id="wallPlainGrain" width="3" height="3" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="0.4" fill="rgba(0,0,0,0.07)" />
            </pattern>
          </defs>
        </svg>
      );
    case "painted":
      return (
        <svg viewBox="0 0 40 40" className="size-full">
          <defs>
            <linearGradient id="wallPaintBase" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#f1ebe0" />
              <stop offset="1" stopColor="#dcd3c4" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" fill="url(#wallPaintBase)" />
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={i}
              x1="0"
              x2="40"
              y1={6 + i * 6}
              y2={6 + i * 6 + (i % 2 ? 1 : -1)}
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="0.6"
            />
          ))}
        </svg>
      );
    case "concrete":
      return (
        <svg viewBox="0 0 40 40" className="size-full">
          <rect width="40" height="40" fill="#aaa6a0" />
          <circle cx="10" cy="14" r="9" fill="rgba(255,255,255,0.15)" />
          <circle cx="28" cy="26" r="10" fill="rgba(0,0,0,0.12)" />
          {Array.from({ length: 14 }).map((_, i) => (
            <circle
              key={i}
              cx={(i * 7) % 40}
              cy={(i * 11) % 40}
              r="0.8"
              fill={i % 2 ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.25)"}
            />
          ))}
        </svg>
      );
    case "brick":
      return (
        <svg viewBox="0 0 40 40" className="size-full">
          <rect width="40" height="40" fill="#3a342c" />
          {[0, 1, 2, 3, 4].map((row) => {
            const offset = row % 2 === 0 ? 0 : 10;
            return [0, 1, 2, 3].map((col) => {
              const x = col * 20 + offset - 10;
              const y = row * 8;
              return (
                <rect
                  key={`${row}-${col}`}
                  x={x + 1}
                  y={y + 1}
                  width={18}
                  height={6}
                  fill="#9a4d33"
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth="0.4"
                />
              );
            });
          })}
        </svg>
      );
  }
}

/** Inline SVG swatch of each floor style. */
function FloorSwatch({ style }: { style: FloorStyle }) {
  switch (style) {
    case "wood":
      return (
        <svg viewBox="0 0 40 40" className="size-full">
          <rect width="40" height="40" fill="#c79a64" />
          {[10, 20, 30].map((x) => (
            <line
              key={x}
              x1={x}
              x2={x}
              y1="0"
              y2="40"
              stroke="rgba(0,0,0,0.25)"
              strokeWidth="0.6"
            />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <line
              key={i}
              x1={(i * 7) % 40}
              y1={(i * 5) % 40}
              x2={((i * 7) % 40) + 0.5}
              y2={((i * 5) % 40) + 14}
              stroke="rgba(120,80,40,0.45)"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      );
    case "tile":
      return (
        <svg viewBox="0 0 40 40" className="size-full">
          <rect width="40" height="40" fill="#7a8089" />
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3].map((col) => {
              const x = col * 10 + 1;
              const y = row * 10 + 1;
              return (
                <rect
                  key={`${row}-${col}`}
                  x={x}
                  y={y}
                  width={8}
                  height={8}
                  fill="#c4cbd2"
                />
              );
            }),
          )}
        </svg>
      );
    case "concrete":
      return (
        <svg viewBox="0 0 40 40" className="size-full">
          <rect width="40" height="40" fill="#b1aea7" />
          <circle cx="14" cy="12" r="12" fill="rgba(255,255,255,0.16)" />
          <circle cx="30" cy="28" r="10" fill="rgba(0,0,0,0.1)" />
          {Array.from({ length: 10 }).map((_, i) => (
            <circle
              key={i}
              cx={(i * 11) % 40}
              cy={(i * 7) % 40}
              r="0.6"
              fill={i % 2 ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.18)"}
            />
          ))}
        </svg>
      );
    case "carpet":
      return (
        <svg viewBox="0 0 40 40" className="size-full">
          <rect width="40" height="40" fill="#5d6b78" />
          {Array.from({ length: 220 }).map((_, i) => {
            const x = (i * 13) % 40;
            const y = (i * 7) % 40;
            const shade = i % 3 === 0 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.18)";
            return <rect key={i} x={x} y={y} width="1" height="1" fill={shade} />;
          })}
        </svg>
      );
  }
}

function MenuSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-muted/60"
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-[0.8rem] font-medium leading-tight">{label}</div>
        {description && (
          <div className="text-[0.66rem] text-muted-foreground leading-snug">
            {description}
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Inline title editor. The input visually sizes to its actual text so the
 * hover/focus background never sprawls past the title itself.
 *
 * Uses a hidden span to measure, then sets the input's width to match
 * (capped at a comfortable max so very long titles wrap into the next
 * row of chrome rather than pushing the mode switcher).
 */
function TitleInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="group relative inline-flex min-w-0 items-center">
      <span
        aria-hidden
        className="invisible whitespace-pre px-2 py-1 text-[0.92rem] tracking-[-0.005em]"
      >
        {value || "Untitled design"}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="peer absolute inset-0 min-w-[8ch] max-w-[26rem] rounded-md px-2 py-1 text-[0.92rem] tracking-[-0.005em] bg-transparent outline-none placeholder:text-muted-foreground/60 hover:bg-foreground/[0.04] focus:bg-foreground/[0.04] focus:ring-1 focus:ring-primary/40 transition-colors"
        placeholder="Untitled design"
        spellCheck={false}
        size={Math.max(8, value.length || 16)}
      />
    </div>
  );
}

