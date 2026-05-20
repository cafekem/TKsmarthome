"use client";

import Link from "next/link";
import { Download, Eye, Save } from "lucide-react";
import { useDesignStore, useCurrentDesign } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ModeSwitcher } from "./ModeSwitcher";
import { toast } from "sonner";

export function TopBar() {
  const design = useCurrentDesign();
  const updateName = useDesignStore((s) => s.updateDesignName);

  if (!design) return null;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-sidebar px-4">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Eye className="size-5 text-primary" />
          Deeper Vision
        </Link>
        <div className="h-5 w-px bg-border" />
        <input
          value={design.name}
          onChange={(e) => updateName(design.id, e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground focus:outline-1 focus:outline-primary/50 rounded px-1.5 py-1"
          placeholder="Untitled design"
        />
      </div>

      <ModeSwitcher />

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => toast.success("Saved", { description: "Your design is stored locally." })}
        >
          <Save className="size-4" />
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            toast.info("Export coming soon", {
              description: "PDF + BoM export lands in milestone 7.",
            })
          }
        >
          <Download className="size-4" />
          Export
        </Button>
      </div>
    </header>
  );
}
