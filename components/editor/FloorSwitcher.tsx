"use client";

import { Plus } from "lucide-react";
import { useCurrentDesign, useDesignStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function FloorSwitcher() {
  const design = useCurrentDesign();
  const setActive = useDesignStore((s) => s.setActiveFloor);
  const addFloor = useDesignStore((s) => s.addFloor);

  if (!design) return null;

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto">
      {design.floors.map((floor) => {
        const active = design.activeFloorId === floor.id;
        return (
          <button
            key={floor.id}
            type="button"
            onClick={() => setActive(floor.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.76rem] font-medium tracking-[-0.005em] transition-colors",
              active
                ? "bg-foreground/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
            )}
          >
            {active && (
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            )}
            {floor.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => addFloor()}
        className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.72rem] font-medium text-muted-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
      >
        <Plus className="size-3" />
        Add floor
      </button>
    </div>
  );
}
