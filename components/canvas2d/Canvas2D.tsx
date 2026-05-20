"use client";

import { useRef } from "react";
import { Camera, DoorOpen, ImagePlus, Radar, Wifi } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { DeviceType } from "@/types/design";

const ICONS: Record<DeviceType, LucideIcon> = {
  camera: Camera,
  reader: DoorOpen,
  sensor: Radar,
  network: Wifi,
};

const ACCENTS: Record<DeviceType, string> = {
  camera: "text-emerald-400",
  reader: "text-sky-400",
  sensor: "text-amber-400",
  network: "text-violet-400",
};

export function Canvas2D() {
  const floor = useActiveFloor();
  const addDevice = useDesignStore((s) => s.addDevice);
  const selectDevice = useDesignStore((s) => s.selectDevice);
  const selectedId = useDesignStore((s) => s.selectedDeviceId);
  const updateFloor = useDesignStore((s) => s.updateFloor);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!floor) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No floor selected.
      </div>
    );
  }

  function onCanvasDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-dv-device");
    if (!raw || !floor) return;
    try {
      const payload = JSON.parse(raw) as { type: DeviceType };
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addDevice(floor.id, payload.type, { x, y });
    } catch {
      // bad payload, ignore
    }
  }

  function onFileChosen(file: File | undefined) {
    if (!file || !floor) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateFloor(floor.id, { planImage: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[oklch(0.115_0_0)] bg-grid"
      onDrop={onCanvasDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) selectDevice(null);
      }}
    >
      {floor.planImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={floor.planImage}
            alt="Floor plan"
            className="absolute inset-0 mx-auto my-auto max-h-full max-w-full object-contain opacity-90 pointer-events-none select-none"
          />
        </>
      ) : (
        <EmptyState
          onUploadClick={() => fileInputRef.current?.click()}
        />
      )}

      {/* Device chips (M0 preview — full Konva interaction lands in M1) */}
      <div className="absolute inset-0 pointer-events-none">
        {floor.devices.map((device) => {
          const Icon = ICONS[device.type];
          const accent = ACCENTS[device.type];
          const isSelected = device.id === selectedId;
          return (
            <button
              key={device.id}
              type="button"
              onClick={() => selectDevice(device.id)}
              className={cn(
                "pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-1 text-xs shadow-lg backdrop-blur transition-all",
                isSelected
                  ? "border-primary scale-110 shadow-[0_0_0_4px_oklch(0.74_0.18_152_/_25%)]"
                  : "border-border hover:border-primary/40"
              )}
              style={{ left: device.position.x, top: device.position.y }}
            >
              <Icon className={cn("size-3.5", accent)} />
              <span className="font-medium">{device.label}</span>
            </button>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => onFileChosen(e.target.files?.[0])}
      />
    </div>
  );
}

function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <button
        type="button"
        onClick={onUploadClick}
        className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card/40 px-10 py-12 text-center transition-all hover:border-primary/50 hover:bg-card/60"
      >
        <div className="flex size-14 items-center justify-center rounded-xl border border-border bg-background/40 transition-colors group-hover:border-primary/40">
          <ImagePlus className="size-6 text-primary" />
        </div>
        <div className="space-y-1.5">
          <div className="text-base font-semibold">Upload a floor plan</div>
          <div className="text-sm text-muted-foreground max-w-xs">
            Drop a JPG or PNG to start. Or skip ahead and drag devices straight
            onto the canvas to preview the workflow.
          </div>
        </div>
      </button>
    </div>
  );
}
