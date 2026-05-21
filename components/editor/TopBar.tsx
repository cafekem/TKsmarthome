"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  FileText,
  Receipt,
  Sparkles,
  Upload,
} from "lucide-react";
import { LogoMark } from "@/components/branding/Logo";
import { useDesignStore, useCurrentDesign, useActiveFloor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ModeSwitcher } from "./ModeSwitcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuoteDrawer } from "@/components/quote/QuoteDrawer";
import { toast } from "sonner";

export function TopBar() {
  const design = useCurrentDesign();
  const floor = useActiveFloor();
  const updateName = useDesignStore((s) => s.updateDesignName);
  const importDesign = useDesignStore((s) => s.importDesign);
  const quoteSettings = useDesignStore((s) => s.quoteSettings);
  const setAISurveyOpen = useDesignStore((s) => s.setAISurveyOpen);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
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
          <div className="group relative flex min-w-0 max-w-sm flex-1 items-center">
            <input
              value={design.name}
              onChange={(e) => updateName(design.id, e.target.value)}
              className="peer w-full min-w-0 rounded-md px-2 py-1 text-[0.92rem] tracking-[-0.005em] bg-transparent outline-none placeholder:text-muted-foreground/60 hover:bg-foreground/[0.04] focus:bg-foreground/[0.04] focus:ring-1 focus:ring-primary/40 transition-colors"
              placeholder="Untitled design"
              spellCheck={false}
            />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 peer-focus:opacity-0"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </div>
        </div>

        <ModeSwitcher />

        <div className="flex flex-1 items-center justify-end gap-1">
          <ThemeToggle size="sm" className="mr-0.5" />

          {/* AI Survey trigger — sparkles button so the killer feature is
              always one click away even after the empty state is dismissed. */}
          <button
            type="button"
            onClick={() => setAISurveyOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium text-primary transition-colors hover:bg-primary/10"
            aria-label="Generate design with AI"
          >
            <Sparkles className="size-3.5" strokeWidth={1.8} />
            <span className="hidden sm:inline">AI</span>
          </button>

          {/* File menu — Import / Save grouped into one menu */}
          <FileMenu
            onImport={() => fileInputRef.current?.click()}
            onSave={exportJSON}
          />

          {/* Export dropdown */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              className="btn-lift"
              onClick={() => setExportOpen((v) => !v)}
            >
              <FileText className="size-3.5" />
              Export
              <ChevronDown className="size-3 ml-0.5" />
            </Button>
            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg">
                  <ExportMenuItem
                    icon={<FileText className="size-3.5 text-rose-500" />}
                    label="Floor plan PDF"
                    description="Install-ready drawing"
                    onClick={async () => {
                      setExportOpen(false);
                      if (!design || !floor) return;
                      toast.info("Generating PDF…");
                      const { exportFloorPlanPDF } = await import("@/lib/export");
                      await exportFloorPlanPDF(design, floor, {
                        preparedBy: quoteSettings.preparedBy,
                        preparedFor: quoteSettings.clientName,
                      });
                      toast.success("PDF exported");
                    }}
                  />
                  <ExportMenuItem
                    icon={<FileSpreadsheet className="size-3.5 text-emerald-500" />}
                    label="Bill of materials (CSV)"
                    description="Quantities, pricing, labor"
                    onClick={async () => {
                      setExportOpen(false);
                      if (!design || !floor) return;
                      const { exportBOMCSV } = await import("@/lib/export");
                      await exportBOMCSV(design, floor);
                      toast.success("BOM exported");
                    }}
                  />
                  <ExportMenuItem
                    icon={<FileSpreadsheet className="size-3.5 text-sky-500" />}
                    label="Device schedule (CSV)"
                    description="Every device, one row each"
                    onClick={async () => {
                      setExportOpen(false);
                      if (!design || !floor) return;
                      const { exportDeviceScheduleCSV } = await import("@/lib/export");
                      await exportDeviceScheduleCSV(design, floor);
                      toast.success("Device schedule exported");
                    }}
                  />
                  <div className="my-1 border-t border-border/60" />
                  <ExportMenuItem
                    icon={<FileDown className="size-3.5 text-muted-foreground" />}
                    label="Project file (.dvjson)"
                    description="Full design for re-import"
                    onClick={() => {
                      setExportOpen(false);
                      exportJSON();
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <Button
            size="sm"
            className="btn-lift ml-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[inset_0_1px_0_oklch(1_0_0/14%),0_4px_14px_-6px_oklch(0.78_0.135_158/50%)]"
            onClick={() => setQuoteOpen(true)}
          >
            <Receipt className="size-3.5" />
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
      <QuoteDrawer open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </>
  );
}

function FileMenu({
  onImport,
  onSave,
}: {
  onImport: () => void;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        className="btn-lift"
        onClick={() => setOpen((v) => !v)}
        aria-label="File menu"
      >
        <FileDown className="size-3.5" />
        File
        <ChevronDown className="size-3 ml-0.5" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-border bg-popover p-1 shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[0.82rem] transition-colors hover:bg-muted/60"
              onClick={() => {
                setOpen(false);
                onSave();
              }}
            >
              <FileDown className="size-3.5 text-muted-foreground" />
              Save project
              <kbd className="ml-auto rounded border border-border/40 bg-background/40 px-1 py-px font-mono text-[10px] text-muted-foreground">
                ⌘S
              </kbd>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[0.82rem] transition-colors hover:bg-muted/60"
              onClick={() => {
                setOpen(false);
                onImport();
              }}
            >
              <Upload className="size-3.5 text-muted-foreground" />
              Import project
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ExportMenuItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
      onClick={onClick}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-[0.8rem] font-medium">{label}</div>
        <div className="text-[0.65rem] text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}
