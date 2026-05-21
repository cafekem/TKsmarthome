"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useActiveFloor, useCurrentDesign, useDesignStore } from "@/lib/store";
import { runAIAdvisor, type AdvisorFinding } from "@/lib/ai-advisor";
import { cn } from "@/lib/utils";
import type { Device, DeviceType } from "@/types/design";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SEVERITY_TONE = {
  critical: {
    icon: ShieldAlert,
    badgeClass:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30",
    dot: "bg-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
    dot: "bg-amber-500",
  },
  suggestion: {
    icon: Zap,
    badgeClass:
      "bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/30",
    dot: "bg-sky-500",
  },
} as const;

export function AIAdvisorPanel({ open, onClose }: Props) {
  const design = useCurrentDesign();
  const floor = useActiveFloor();
  const addDevice = useDesignStore((s) => s.addDevice);
  const updateDevice = useDesignStore((s) => s.updateDevice);
  const removeDevice = useDesignStore((s) => s.removeDevice);

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [findings, setFindings] = useState<AdvisorFinding[]>([]);
  const [summary, setSummary] = useState("");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Reset when the panel reopens
  useEffect(() => {
    if (open) {
      setFindings([]);
      setSummary("");
      setAppliedIds(new Set());
      setDismissedIds(new Set());
      setPhase("idle");
    }
  }, [open]);

  async function handleRun() {
    if (!floor || !design) return;
    setPhase("running");
    try {
      const result = await runAIAdvisor({
        designName: design.name,
        floor,
      });
      setFindings(result.findings);
      setSummary(result.summary);
      setPhase("done");
      if (result.findings.length === 0) {
        toast.success("No issues found", {
          description: "The design looks solid by Claude's read.",
        });
      } else {
        toast.success(
          `${result.findings.length} finding${result.findings.length === 1 ? "" : "s"}`,
          { description: result.summary || undefined },
        );
      }
    } catch (err) {
      setPhase("idle");
      toast.error("Coverage analysis failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function applyFinding(f: AdvisorFinding) {
    if (!floor) return;
    const a = f.suggestedAction;
    if (a.kind === "add-device") {
      const created = addDevice(floor.id, a.deviceType, { x: a.x, y: a.y });
      if (created) {
        const partial: Partial<Device> = {
          label: a.label,
          rotation: (a.rotationDegrees * Math.PI) / 180,
          notes: a.rationale,
        } as Partial<Device>;
        if (a.subtype) {
          if (a.deviceType === "camera") {
            (partial as Partial<Extract<Device, { type: "camera" }>>).cameraType =
              a.subtype as never;
          } else if (a.deviceType === "reader") {
            (partial as Partial<Extract<Device, { type: "reader" }>>).readerType =
              a.subtype as never;
          } else if (a.deviceType === "sensor") {
            (partial as Partial<Extract<Device, { type: "sensor" }>>).sensorType =
              a.subtype as never;
          } else if (a.deviceType === "network") {
            (
              partial as Partial<Extract<Device, { type: "network" }>>
            ).networkType = a.subtype as never;
          }
        }
        updateDevice(floor.id, created.id, partial);
      }
    } else if (a.kind === "remove-device") {
      removeDevice(floor.id, a.deviceId);
    } else if (a.kind === "rotate-device") {
      updateDevice(floor.id, a.deviceId, {
        rotation: (a.newRotationDegrees * Math.PI) / 180,
      });
    } else if (a.kind === "move-device") {
      updateDevice(floor.id, a.deviceId, {
        position: { x: a.newX, y: a.newY },
      });
    }
    setAppliedIds((prev) => new Set(prev).add(f.id));
    toast.success("Applied", { description: f.title });
  }

  function dismiss(f: AdvisorFinding) {
    setDismissedIds((prev) => new Set(prev).add(f.id));
  }

  function actionLabel(action: AdvisorFinding["suggestedAction"]): string {
    switch (action.kind) {
      case "add-device":
        return `Add ${action.subtype ? action.subtype : action.deviceType}`;
      case "remove-device":
        return "Remove device";
      case "rotate-device":
        return `Rotate to ${action.newRotationDegrees.toFixed(0)}°`;
      case "move-device":
        return "Move device";
      default:
        return "Manual review";
    }
  }

  if (!open) return null;

  const visibleFindings = findings.filter((f) => !dismissedIds.has(f.id));

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close advisor"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Sparkles className="size-4" strokeWidth={1.7} />
            </div>
            <div>
              <div className="text-[0.95rem] font-semibold tracking-[-0.01em]">
                Coverage Advisor
              </div>
              <div className="text-[0.74rem] text-muted-foreground">
                Claude reviews your design for gaps, redundancies, and risks.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {phase === "idle" && (
            <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-6" />
              </div>
              <div className="space-y-2">
                <div className="text-[1.05rem] font-medium tracking-[-0.01em]">
                  Analyze the current design
                </div>
                <div className="mx-auto max-w-[20rem] text-[0.86rem] text-muted-foreground leading-relaxed">
                  Claude will look for blind spots, FOV redundancies, missing
                  sensors, and compliance gaps. Each finding comes with a
                  one-click fix you can apply or dismiss.
                </div>
              </div>
              <button
                type="button"
                onClick={handleRun}
                disabled={
                  !floor ||
                  (floor.devices.length === 0 && floor.walls.length === 0)
                }
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[0.9rem] font-medium text-primary-foreground shadow-[0_6px_18px_-8px_oklch(0.55_0.17_245/55%)] hover:bg-primary/90 disabled:opacity-50"
              >
                <Sparkles className="size-3.5" />
                Run analysis
              </button>
              {!floor ||
                (floor.devices.length === 0 && (
                  <div className="text-[0.74rem] text-muted-foreground/70 max-w-xs">
                    Place at least one device first so the advisor has
                    something to evaluate.
                  </div>
                ))}
            </div>
          )}

          {phase === "running" && (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="relative flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Loader2 className="size-6 animate-spin" strokeWidth={1.7} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[0.95rem] font-medium tracking-[-0.005em]">
                  Analyzing coverage…
                </div>
                <div className="text-[0.74rem] text-muted-foreground">
                  Usually 10–25 seconds.
                </div>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-3 p-4">
              {summary && (
                <div className="rounded-lg border border-border/60 bg-foreground/[0.03] p-3 text-[0.84rem] text-foreground/80">
                  {summary}
                </div>
              )}

              {visibleFindings.length === 0 && findings.length > 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-center text-[0.85rem] text-emerald-700 dark:text-emerald-300">
                  All findings handled. Run again any time after you tweak the
                  design.
                </div>
              )}

              {findings.length === 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-center">
                  <div className="text-[0.95rem] font-medium text-emerald-700 dark:text-emerald-300">
                    No issues found
                  </div>
                  <div className="mt-1 text-[0.76rem] text-emerald-700/80 dark:text-emerald-300/80">
                    Design reads clean. Try editing and re-running to catch
                    regressions.
                  </div>
                </div>
              )}

              {visibleFindings.map((f) => {
                const tone = SEVERITY_TONE[f.severity];
                const applied = appliedIds.has(f.id);
                const Icon = tone.icon;
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "rounded-xl border bg-card/40 p-3 transition-opacity",
                      applied
                        ? "border-emerald-500/30 bg-emerald-500/[0.04] opacity-70"
                        : "border-border/70",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-5 items-center justify-center rounded-md",
                          tone.badgeClass,
                          "ring-1",
                        )}
                      >
                        <Icon className="size-3" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[0.88rem] font-medium tracking-[-0.005em] text-foreground">
                          {f.title}
                        </div>
                        <div className="mt-0.5 text-[0.78rem] text-muted-foreground leading-relaxed">
                          {f.description}
                        </div>
                        {f.suggestedAction.rationale && (
                          <div className="mt-1.5 text-[0.74rem] text-foreground/70 leading-relaxed">
                            <span className="text-muted-foreground">
                              Suggested:{" "}
                            </span>
                            {f.suggestedAction.rationale}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 pl-7">
                      {!applied && f.suggestedAction.kind !== "manual-review" && (
                        <button
                          type="button"
                          onClick={() => applyFinding(f)}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[0.76rem] font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          <Check className="size-3" />
                          {actionLabel(f.suggestedAction)}
                        </button>
                      )}
                      {applied && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 text-[0.76rem] font-medium text-emerald-700 dark:text-emerald-300">
                          <Check className="size-3" />
                          Applied
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => dismiss(f)}
                        className="rounded-md px-2 py-1 text-[0.76rem] text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === "done" && findings.length > 0 && (
          <div className="border-t border-border/70 px-4 py-3 flex items-center justify-between">
            <div className="text-[0.76rem] text-muted-foreground">
              {visibleFindings.length} active · {appliedIds.size} applied ·{" "}
              {dismissedIds.size} dismissed
            </div>
            <button
              type="button"
              onClick={handleRun}
              className="text-[0.78rem] font-medium text-primary hover:text-primary/80"
            >
              Re-analyze
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

// Type-only re-exports kept for now; future expansion may use these directly.
export type { Device, DeviceType };
