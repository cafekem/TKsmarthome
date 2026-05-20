"use client";

import { useActiveFloor, useDesignStore } from "@/lib/store";
import { FloorSwitcher } from "./FloorSwitcher";

export function StatusBar() {
  const floor = useActiveFloor();
  const mode = useDesignStore((s) => s.viewMode);

  return (
    <div className="flex h-10 items-center justify-between gap-3 border-t border-border bg-sidebar px-3">
      <FloorSwitcher />
      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
        <span>
          Devices: <span className="text-foreground">{floor?.devices.length ?? 0}</span>
        </span>
        <span>·</span>
        <span>
          Walls: <span className="text-foreground">{floor?.walls.length ?? 0}</span>
        </span>
        <span>·</span>
        <span>
          Scale: <span className="text-foreground">{floor?.scale ?? 0}</span> px/m
        </span>
        <span>·</span>
        <span>
          Mode: <span className="text-foreground">{mode.toUpperCase()}</span>
        </span>
      </div>
    </div>
  );
}
