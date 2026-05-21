"use client";

import { Camera, Ruler, Squircle } from "lucide-react";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import { FloorSwitcher } from "./FloorSwitcher";

export function StatusBar() {
  const floor = useActiveFloor();
  const mode = useDesignStore((s) => s.viewMode);

  const deviceCount = floor?.devices.length ?? 0;
  const wallCount = floor?.walls.length ?? 0;
  const scale = floor?.scale ?? 0;

  return (
    <div className="flex h-10 items-center justify-between gap-3 border-t border-border/70 bg-sidebar px-4">
      <FloorSwitcher />
      <div className="flex items-center gap-4 text-[0.78rem] text-muted-foreground">
        <Stat
          icon={<Camera className="size-3.5" strokeWidth={1.7} />}
          value={deviceCount}
          label={deviceCount === 1 ? "device" : "devices"}
        />
        <Stat
          icon={<Squircle className="size-3.5" strokeWidth={1.7} />}
          value={wallCount}
          label={wallCount === 1 ? "wall" : "walls"}
        />
        <Stat
          icon={<Ruler className="size-3.5" strokeWidth={1.7} />}
          value={scale}
          label="px/m"
        />
        <div className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[0.72rem] font-medium text-primary">
          {mode === "2d" ? "2D" : mode === "3d" ? "3D" : "Sim"}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground/60">{icon}</span>
      <span className="text-foreground/85 tabular-nums font-medium">{value}</span>
      <span className="text-muted-foreground/80">{label}</span>
    </span>
  );
}
