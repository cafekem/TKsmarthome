"use client";

import { Trash2 } from "lucide-react";
import {
  useActiveFloor,
  useCurrentDesign,
  useDesignStore,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import type { CameraDevice, Device } from "@/types/design";
import { getProduct } from "@/lib/catalog";
import { formatUSD } from "@/lib/pricing";

function pickValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

export function PropertiesPanel() {
  const selectedId = useDesignStore((s) => s.selectedDeviceId);
  const floor = useActiveFloor();
  const design = useCurrentDesign();
  const updateDevice = useDesignStore((s) => s.updateDevice);
  const updateFloor = useDesignStore((s) => s.updateFloor);
  const removeDevice = useDesignStore((s) => s.removeDevice);

  const selected: Device | null =
    floor?.devices.find((d) => d.id === selectedId) ?? null;

  return (
    <aside className="flex h-full w-full flex-col border-l border-border/70 bg-sidebar">
      <div className="border-b border-border/70 px-4 py-3">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {selected ? "Device properties" : floor ? "Floor settings" : "Properties"}
        </div>
        {selected && (
          <div className="mt-1 text-[0.78rem] font-serif-italic text-foreground/70">
            Editing {selected.type === "camera"
              ? "a camera"
              : selected.type === "reader"
                ? "a reader"
                : selected.type === "sensor"
                  ? "a sensor"
                  : "a network device"}
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {selected ? (
            <DeviceForm
              device={selected}
              onChange={(partial) =>
                floor && updateDevice(floor.id, selected.id, partial)
              }
              onDelete={() => floor && removeDevice(floor.id, selected.id)}
            />
          ) : floor && design ? (
            <FloorForm
              name={floor.name}
              scale={floor.scale}
              ceilingHeight={floor.ceilingHeight}
              onChange={(partial) => updateFloor(floor.id, partial)}
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              Loading…
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function FloorForm({
  name,
  scale,
  ceilingHeight,
  onChange,
}: {
  name: string;
  scale: number;
  ceilingHeight: number;
  onChange: (partial: { name?: string; scale?: number; ceilingHeight?: number }) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Floor name</Label>
        <Input
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Scale (pixels per meter)
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            min={10}
            max={200}
            step={1}
            value={[scale]}
            onValueChange={(v) => onChange({ scale: pickValue(v) })}
            className="flex-1"
          />
          <div className="font-mono text-sm w-12 text-right">{scale}</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Used to convert floor-plan pixels into real-world meters.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Ceiling height (m)
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            min={2.2}
            max={6}
            step={0.1}
            value={[ceilingHeight]}
            onValueChange={(v) => onChange({ ceilingHeight: pickValue(v) })}
            className="flex-1"
          />
          <div className="font-mono text-sm w-12 text-right">
            {ceilingHeight.toFixed(1)}
          </div>
        </div>
      </div>

      <Separator />

      <div className="rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground leading-relaxed">
        Tip: Drag a device from the left sidebar onto the canvas to place it.
        Click any placed device to edit its properties here.
      </div>
    </div>
  );
}

function DeviceForm({
  device,
  onChange,
  onDelete,
}: {
  device: Device;
  onChange: (partial: Partial<Device>) => void;
  onDelete: () => void;
}) {
  const catalogProduct = device.catalogId ? getProduct(device.catalogId) : null;

  return (
    <div className="space-y-5">
      {catalogProduct && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-primary/70">
            {catalogProduct.manufacturer}
          </div>
          <div className="mt-0.5 text-[0.88rem] font-medium tracking-[-0.01em]">
            {catalogProduct.model}
          </div>
          <div className="mt-0.5 text-[0.72rem] text-muted-foreground">
            {catalogProduct.description}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 text-[0.7rem]">
            <span className="font-mono font-medium">{formatUSD(catalogProduct.streetPrice)}</span>
            <span className="text-muted-foreground/60">street</span>
            <span className="font-mono text-muted-foreground/50">{formatUSD(catalogProduct.msrp)}</span>
            <span className="text-muted-foreground/60">MSRP</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Label</Label>
        <Input
          value={device.label}
          onChange={(e) =>
            onChange({ label: e.target.value } as Partial<Device>)
          }
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Input
          value={device.notes}
          onChange={(e) =>
            onChange({ notes: e.target.value } as Partial<Device>)
          }
          placeholder="Anything to remember…"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Rotation (degrees)
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            min={0}
            max={360}
            step={1}
            value={[Math.round((device.rotation * 180) / Math.PI) % 360]}
            onValueChange={(v) =>
              onChange({
                rotation: (pickValue(v) * Math.PI) / 180,
              } as Partial<Device>)
            }
            className="flex-1"
          />
          <div className="font-mono text-sm w-12 text-right">
            {Math.round((device.rotation * 180) / Math.PI) % 360}°
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Mount height (m)
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            min={0.1}
            max={6}
            step={0.1}
            value={[device.mountHeight]}
            onValueChange={(v) =>
              onChange({ mountHeight: pickValue(v) } as Partial<Device>)
            }
            className="flex-1"
          />
          <div className="font-mono text-sm w-12 text-right">
            {device.mountHeight.toFixed(1)}
          </div>
        </div>
      </div>

      {device.type === "camera" && (
        <CameraExtras
          device={device}
          onChange={(partial) =>
            onChange(partial as Partial<Device>)
          }
        />
      )}

      {device.type === "sensor" && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Detection range (m)
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              min={1}
              max={30}
              step={0.5}
              value={[device.rangeMeters]}
              onValueChange={(v) =>
                onChange({ rangeMeters: pickValue(v) } as Partial<Device>)
              }
              className="flex-1"
            />
            <div className="font-mono text-sm w-12 text-right">
              {device.rangeMeters.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {device.type === "network" && device.networkType === "access-point" && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Coverage radius (m)
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              min={1}
              max={50}
              step={0.5}
              value={[device.coverageMeters ?? 15]}
              onValueChange={(v) =>
                onChange({ coverageMeters: pickValue(v) } as Partial<Device>)
              }
              className="flex-1"
            />
            <div className="font-mono text-sm w-12 text-right">
              {(device.coverageMeters ?? 15).toFixed(1)}
            </div>
          </div>
        </div>
      )}

      <Separator />

      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
        Remove device
      </Button>
    </div>
  );
}

function CameraExtras({
  device,
  onChange,
}: {
  device: CameraDevice;
  onChange: (partial: Partial<CameraDevice>) => void;
}) {
  const hasLenses = device.lenses && device.lenses.length > 0;

  function updateLens(lensId: string, partial: Record<string, number>) {
    if (!device.lenses) return;
    const updated = device.lenses.map((l) =>
      l.id === lensId ? { ...l, ...partial } : l
    );
    onChange({ lenses: updated });
  }

  if (hasLenses) {
    return (
      <>
        <Separator />
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Lenses ({device.lenses!.length})
        </div>
        {device.lenses!.map((lens, i) => (
          <div
            key={lens.id}
            className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3"
          >
            <div className="text-[0.72rem] font-medium">
              <span
                className="mr-1.5 inline-block size-2 rounded-full"
                style={{ backgroundColor: LENS_COLORS[i % LENS_COLORS.length] }}
              />
              {lens.label}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">FOV (°)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  min={20}
                  max={180}
                  step={1}
                  value={[lens.fovDegrees]}
                  onValueChange={(v) =>
                    updateLens(lens.id, { fovDegrees: pickValue(v) })
                  }
                  className="flex-1"
                />
                <div className="font-mono text-[0.75rem] w-10 text-right">
                  {lens.fovDegrees}°
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Range (m)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  min={1}
                  max={60}
                  step={0.5}
                  value={[lens.rangeMeters]}
                  onValueChange={(v) =>
                    updateLens(lens.id, { rangeMeters: pickValue(v) })
                  }
                  className="flex-1"
                />
                <div className="font-mono text-[0.75rem] w-10 text-right">
                  {lens.rangeMeters.toFixed(1)}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Direction offset (°)
              </Label>
              <div className="flex items-center gap-3">
                <Slider
                  min={0}
                  max={360}
                  step={5}
                  value={[Math.round((lens.rotationOffset * 180) / Math.PI) % 360]}
                  onValueChange={(v) =>
                    updateLens(lens.id, {
                      rotationOffset: (pickValue(v) * Math.PI) / 180,
                    })
                  }
                  className="flex-1"
                />
                <div className="font-mono text-[0.75rem] w-10 text-right">
                  {Math.round((lens.rotationOffset * 180) / Math.PI) % 360}°
                </div>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Field of view (°)</Label>
        <div className="flex items-center gap-3">
          <Slider
            min={20}
            max={360}
            step={1}
            value={[device.fovDegrees]}
            onValueChange={(v) => onChange({ fovDegrees: pickValue(v) })}
            className="flex-1"
          />
          <div className="font-mono text-sm w-12 text-right">
            {device.fovDegrees}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Range (m)</Label>
        <div className="flex items-center gap-3">
          <Slider
            min={1}
            max={60}
            step={0.5}
            value={[device.rangeMeters]}
            onValueChange={(v) => onChange({ rangeMeters: pickValue(v) })}
            className="flex-1"
          />
          <div className="font-mono text-sm w-12 text-right">
            {device.rangeMeters.toFixed(1)}
          </div>
        </div>
      </div>
    </>
  );
}

const LENS_COLORS = ["#34d399", "#38bdf8", "#f97316", "#e879f9", "#facc15", "#2dd4bf"];
