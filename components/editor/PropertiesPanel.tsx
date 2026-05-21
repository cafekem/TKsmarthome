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
import type {
  CameraDevice,
  Device,
  DevicePhoto,
  Door,
  InstallStatus,
} from "@/types/design";
import { getProduct } from "@/lib/catalog";
import { formatUSD } from "@/lib/pricing";
import { DevicePhotoStrip } from "./DevicePhotoStrip";
import { CameraDORIPanel } from "./CameraDORIPanel";
import { cn } from "@/lib/utils";

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
  const updateDoor = useDesignStore((s) => s.updateDoor);
  const removeDoor = useDesignStore((s) => s.removeDoor);

  const selected: Device | null =
    floor?.devices.find((d) => d.id === selectedId) ?? null;
  // Doors share the `selectedDeviceId` slot so the canvas can highlight either
  // entity uniformly. Look it up here when no device matched.
  const selectedDoor: Door | null = selected
    ? null
    : (floor?.doors ?? []).find((d) => d.id === selectedId) ?? null;

  return (
    <aside className="flex h-full w-full flex-col border-l border-border/70 bg-sidebar">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5">
        <div className="flex flex-col">
          <div className="text-[0.92rem] font-semibold tracking-[-0.01em] text-foreground">
            {selected
              ? selected.type === "camera"
                ? "Camera"
                : selected.type === "reader"
                  ? "Reader"
                  : selected.type === "sensor"
                    ? "Sensor"
                    : "Network device"
              : selectedDoor
                ? "Door"
                : floor
                  ? "Floor settings"
                  : "Properties"}
          </div>
          {(selected || selectedDoor) && (
            <div className="mt-0.5 text-[0.74rem] text-muted-foreground">
              {(selected?.label || selectedDoor?.label) ?? "Untitled"}
            </div>
          )}
        </div>
        {selected && (
          <div
            className="size-2 rounded-full"
            style={{
              backgroundColor:
                selected.type === "camera"
                  ? "#3b82f6"
                  : selected.type === "reader"
                    ? "#0ea5e9"
                    : selected.type === "sensor"
                      ? "#f59e0b"
                      : "#a78bfa",
            }}
            aria-hidden="true"
          />
        )}
        {selectedDoor && (
          <div
            className={cn(
              "size-2 rounded-full",
              selectedDoor.locked ? "bg-rose-500" : "bg-emerald-500",
            )}
            aria-hidden="true"
          />
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
          ) : selectedDoor && floor ? (
            <DoorForm
              door={selectedDoor}
              onChange={(partial) =>
                updateDoor(floor.id, selectedDoor.id, partial)
              }
              onDelete={() => removeDoor(floor.id, selectedDoor.id)}
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

      <div className="flex gap-2.5 rounded-lg bg-primary/[0.06] border border-primary/15 p-3 text-[0.78rem] text-foreground/75 leading-relaxed">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 mt-0.5 shrink-0 text-primary"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <span>
          Drag a device from the left to place it. Click any placed device to
          edit its properties.
        </span>
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

      <InstallStatusPicker device={device} onChange={onChange} />

      <CriticalDatesFields device={device} onChange={onChange} />

      <DevicePhotosSection device={device} />

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

      {device.type === "network" && (
        <NetworkDeviceFields device={device} onChange={onChange} />
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

      {/* DORI calculator — only shown for single-lens cameras at the moment */}
      <CameraDORIPanel
        fovDegrees={device.fovDegrees}
        rangeMeters={device.rangeMeters}
        resolution={device.resolution}
      />
    </>
  );
}

/* ── Install status picker (segmented control) ─────────────────────────── */

const STATUS_OPTIONS: { value: InstallStatus; label: string; tone: string }[] = [
  { value: "proposed", label: "Proposed", tone: "bg-foreground/60" },
  { value: "installed", label: "Installed", tone: "bg-emerald-500" },
  { value: "decommissioned", label: "Retired", tone: "bg-rose-500" },
];

function InstallStatusPicker({
  device,
  onChange,
}: {
  device: Device;
  onChange: (partial: Partial<Device>) => void;
}) {
  const current = device.installStatus ?? "proposed";
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Install status</Label>
      <div className="flex items-center gap-px rounded-md bg-foreground/[0.05] p-0.5">
        {STATUS_OPTIONS.map(({ value, label, tone }) => {
          const active = current === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() =>
                onChange({ installStatus: value } as Partial<Device>)
              }
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 rounded px-2 py-1 text-[0.74rem] font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-[0_1px_2px_-1px_rgba(0,0,0,0.18)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full", tone)} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Critical dates ────────────────────────────────────────────────────── */

function CriticalDatesFields({
  device,
  onChange,
}: {
  device: Device;
  onChange: (partial: Partial<Device>) => void;
}) {
  return (
    <details className="group rounded-lg border border-border/60 bg-card/30">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[0.78rem] font-medium text-foreground/85 transition-colors hover:bg-foreground/[0.03]">
        <span>Critical dates</span>
        <span className="text-[0.7rem] text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="grid grid-cols-1 gap-2.5 px-3 pb-3 pt-1">
        <DateField
          label="Warranty until"
          value={device.warrantyUntil ?? ""}
          onChange={(v) =>
            onChange({ warrantyUntil: v || undefined } as Partial<Device>)
          }
        />
        <DateField
          label="Last inspection"
          value={device.lastInspectionAt ?? ""}
          onChange={(v) =>
            onChange({ lastInspectionAt: v || undefined } as Partial<Device>)
          }
        />
        <DateField
          label="End of life"
          value={device.endOfLifeAt ?? ""}
          onChange={(v) =>
            onChange({ endOfLifeAt: v || undefined } as Partial<Device>)
          }
        />
      </div>
    </details>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[0.74rem] text-muted-foreground">{label}</Label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background/40 px-2 py-1 text-[0.78rem] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      />
    </div>
  );
}

/* ── Photos attached to a device ───────────────────────────────────────── */

function DevicePhotosSection({ device }: { device: Device }) {
  const floor = useActiveFloor();
  const addDevicePhoto = useDesignStore((s) => s.addDevicePhoto);
  const removeDevicePhoto = useDesignStore((s) => s.removeDevicePhoto);
  const updateDevice = useDesignStore((s) => s.updateDevice);
  if (!floor) return null;
  return (
    <DevicePhotoStrip
      photos={device.photos ?? []}
      onAdd={(photo) => addDevicePhoto(floor.id, device.id, photo)}
      onRemove={(photoId) => removeDevicePhoto(floor.id, device.id, photoId)}
      onUpdateCaption={(photoId, caption) => {
        const updatedPhotos: DevicePhoto[] = (device.photos ?? []).map((p) =>
          p.id === photoId ? { ...p, caption } : p,
        );
        updateDevice(floor.id, device.id, {
          photos: updatedPhotos,
        } as Partial<Device>);
      }}
    />
  );
}

const LENS_COLORS = ["#3b82f6", "#06b6d4", "#f97316", "#e879f9", "#facc15", "#10b981"];

/* ── Door form ─────────────────────────────────────────────────────────
   Properties for a placed door: width, lock state, label, notes, and the
   reader it's controlled by. */
function DoorForm({
  door,
  onChange,
  onDelete,
}: {
  door: Door;
  onChange: (partial: Partial<Door>) => void;
  onDelete: () => void;
}) {
  const floor = useActiveFloor();
  const updateDeviceFn = useDesignStore((s) => s.updateDevice);
  const readers = (floor?.devices ?? []).filter((d) => d.type === "reader");
  const controllingReader = readers.find(
    (r) => r.type === "reader" && r.controlsDoorId === door.id,
  );

  function setControllingReader(readerId: string | null) {
    if (!floor) return;
    // Clear any existing reader that controls this door
    for (const r of readers) {
      if (
        r.type === "reader" &&
        r.controlsDoorId === door.id &&
        r.id !== readerId
      ) {
        updateDeviceFn(floor.id, r.id, { controlsDoorId: undefined });
      }
    }
    if (readerId) {
      updateDeviceFn(floor.id, readerId, { controlsDoorId: door.id });
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Label</Label>
        <Input
          value={door.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g. Front entry"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Lock state
        </Label>
        <div className="flex items-center gap-px rounded-md bg-foreground/[0.05] p-0.5">
          <button
            type="button"
            onClick={() => onChange({ locked: false })}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded px-2 py-1 text-[0.74rem] font-medium transition-colors",
              !door.locked
                ? "bg-card text-foreground shadow-[0_1px_2px_-1px_rgba(0,0,0,0.18)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Unlocked
          </button>
          <button
            type="button"
            onClick={() => onChange({ locked: true })}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded px-2 py-1 text-[0.74rem] font-medium transition-colors",
              door.locked
                ? "bg-card text-foreground shadow-[0_1px_2px_-1px_rgba(0,0,0,0.18)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="size-1.5 rounded-full bg-rose-500" />
            Locked
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Width (m)
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            min={0.6}
            max={2.4}
            step={0.05}
            value={[door.widthMeters]}
            onValueChange={(v) => onChange({ widthMeters: pickValue(v) })}
            className="flex-1"
          />
          <div className="font-mono text-sm w-12 text-right">
            {door.widthMeters.toFixed(2)}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Controlled by reader
        </Label>
        <select
          value={controllingReader?.id ?? ""}
          onChange={(e) =>
            setControllingReader(e.target.value ? e.target.value : null)
          }
          className="w-full rounded-md border border-border bg-background/40 px-2 py-1.5 text-[0.85rem] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        >
          <option value="">— None —</option>
          {readers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label || `Reader ${r.id.slice(-4)}`}
            </option>
          ))}
        </select>
        {readers.length === 0 && (
          <div className="text-[0.7rem] text-muted-foreground/70">
            Drop a card or biometric reader onto the canvas to link it here.
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Input
          value={door.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Anything to remember…"
        />
      </div>

      <Separator />

      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
        Remove door
      </Button>
    </div>
  );
}

/* ── Network device fields ─────────────────────────────────────────────
   Subtype-aware: access-points get coverage radius + Wi-Fi standard,
   switches get port count + PoE budget, NVRs get channels + storage +
   retention. Replaces the previous bare "coverage only" block. */
function NetworkDeviceFields({
  device,
  onChange,
}: {
  device: Extract<Device, { type: "network" }>;
  onChange: (partial: Partial<Device>) => void;
}) {
  const subtype = device.networkType;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[0.78rem] font-medium text-foreground/85">
          {subtype === "nvr"
            ? "Recorder specs"
            : subtype === "switch"
              ? "Switch specs"
              : "Wireless coverage"}
        </div>
        <span className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[0.62rem] uppercase tracking-wider text-muted-foreground">
          {subtype === "access-point" ? "AP" : subtype === "nvr" ? "NVR" : "Switch"}
        </span>
      </div>

      {subtype === "access-point" && (
        <>
          <NumberSlider
            label="Coverage radius (m)"
            min={1}
            max={50}
            step={0.5}
            value={device.coverageMeters ?? 15}
            display={(v) => v.toFixed(1)}
            onChange={(v) =>
              onChange({ coverageMeters: v } as Partial<Device>)
            }
          />
          <SelectField
            label="Wi-Fi standard"
            value={device.wifiStandard ?? "Wi-Fi 6"}
            options={["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"]}
            onChange={(v) =>
              onChange({ wifiStandard: v } as Partial<Device>)
            }
          />
        </>
      )}

      {subtype === "switch" && (
        <>
          <NumberSlider
            label="Port count"
            min={4}
            max={48}
            step={4}
            value={device.portCount ?? 24}
            display={(v) => `${Math.round(v)}`}
            onChange={(v) =>
              onChange({ portCount: Math.round(v) } as Partial<Device>)
            }
          />
          <NumberSlider
            label="PoE budget (W)"
            min={0}
            max={1000}
            step={30}
            value={device.poeBudgetW ?? 370}
            display={(v) => `${Math.round(v)} W`}
            onChange={(v) =>
              onChange({ poeBudgetW: Math.round(v) } as Partial<Device>)
            }
          />
          <PoeSummary
            portCount={device.portCount ?? 24}
            poeBudgetW={device.poeBudgetW ?? 370}
          />
        </>
      )}

      {subtype === "nvr" && (
        <>
          <NumberSlider
            label="Channels"
            min={4}
            max={128}
            step={4}
            value={device.portCount ?? 32}
            display={(v) => `${Math.round(v)} ch`}
            onChange={(v) =>
              onChange({ portCount: Math.round(v) } as Partial<Device>)
            }
          />
          <NumberSlider
            label="Storage (TB)"
            min={1}
            max={120}
            step={1}
            value={device.storageTb ?? 16}
            display={(v) => `${Math.round(v)} TB`}
            onChange={(v) =>
              onChange({ storageTb: Math.round(v) } as Partial<Device>)
            }
          />
          <NumberSlider
            label="Retention (days)"
            min={7}
            max={180}
            step={1}
            value={device.retentionDays ?? 30}
            display={(v) => `${Math.round(v)} d`}
            onChange={(v) =>
              onChange({ retentionDays: Math.round(v) } as Partial<Device>)
            }
          />
        </>
      )}
    </div>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="font-mono text-[0.78rem] text-foreground/90 tabular-nums">
          {display(value)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(pickValue(v))}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background/40 px-2 py-1.5 text-[0.85rem] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Quick "is this switch realistic?" summary for the user.
 *  - Estimates average power per PoE+ camera (~25 W) so the user sees
 *    "supports ~14 PoE+ cameras" rather than just a raw 370 W number.
 */
function PoeSummary({
  portCount,
  poeBudgetW,
}: {
  portCount: number;
  poeBudgetW: number;
}) {
  const poeCameras = Math.floor(poeBudgetW / 25);
  const usableCameras = Math.min(poeCameras, portCount);
  return (
    <div className="rounded-md bg-foreground/[0.04] px-2.5 py-1.5 text-[0.72rem] leading-snug text-muted-foreground">
      Supports ~{usableCameras} PoE+ cameras (25 W ea) ·{" "}
      {portCount - usableCameras > 0
        ? `${portCount - usableCameras} ports left for non-PoE`
        : "all ports loaded"}
    </div>
  );
}
