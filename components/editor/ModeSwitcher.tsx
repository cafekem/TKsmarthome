"use client";

import { Eye, MousePointer2, Play } from "lucide-react";
import { useDesignStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const modes = [
  { value: "2d" as const, label: "2D", icon: MousePointer2 },
  { value: "3d" as const, label: "3D", icon: Eye },
  { value: "sim" as const, label: "Sim", icon: Play },
];

export function ModeSwitcher() {
  const mode = useDesignStore((s) => s.viewMode);
  const setMode = useDesignStore((s) => s.setViewMode);

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card/60 p-1">
      {modes.map((m) => {
        const active = mode === m.value;
        return (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            type="button"
          >
            <m.icon className="size-4" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
