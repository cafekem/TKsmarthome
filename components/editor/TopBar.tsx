"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, FileDown, Receipt, Upload } from "lucide-react";
import { LogoMark } from "@/components/branding/Logo";
import { useDesignStore, useCurrentDesign } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ModeSwitcher } from "./ModeSwitcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuoteDrawer } from "@/components/quote/QuoteDrawer";
import { toast } from "sonner";

export function TopBar() {
  const design = useCurrentDesign();
  const updateName = useDesignStore((s) => s.updateDesignName);
  const importDesign = useDesignStore((s) => s.importDesign);
  const [quoteOpen, setQuoteOpen] = useState(false);
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
          description: "Make sure it's a .dvjson export from Deeper Vision.",
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
            className="flex shrink-0 items-center gap-2 text-[0.92rem] font-medium tracking-[-0.01em]"
          >
            <span className="flex size-6 items-center justify-center rounded border border-border bg-card/60 p-0.5 text-primary">
              <LogoMark strokeWidth={1.8} />
            </span>
            Deeper Vision
          </Link>
          <div className="h-4 w-px bg-border" />
          <input
            value={design.name}
            onChange={(e) => updateName(design.id, e.target.value)}
            className="min-w-0 max-w-xs flex-1 rounded px-1.5 py-1 text-[0.92rem] tracking-[-0.005em] bg-transparent outline-none placeholder:text-muted-foreground/70 focus:outline-1 focus:outline-primary/40"
            placeholder="Untitled design"
            spellCheck={false}
          />
        </div>

        <ModeSwitcher />

        <div className="flex flex-1 items-center justify-end gap-1.5">
          <ThemeToggle size="sm" className="mr-1" />
          <Button
            size="sm"
            variant="ghost"
            className="btn-lift"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            Import
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="btn-lift"
            onClick={exportJSON}
          >
            <FileDown className="size-3.5" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="btn-lift"
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
