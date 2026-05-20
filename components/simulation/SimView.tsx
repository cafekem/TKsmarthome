"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { Scene3D } from "@/components/scene3d/Scene3D";
import { useActiveFloor } from "@/lib/store";
import { useSimStore } from "@/lib/sim-store";
import { cn } from "@/lib/utils";
import { positionOnPath } from "@/lib/detection";

export function SimView() {
  const floor = useActiveFloor();
  const path = floor?.simPath ?? [];
  const hasPath = path.length >= 2;

  if (!floor || !hasPath) {
    return <NoPathState />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Scene3D showSim />
      <SimControls />
      <DetectionFeed />
      <AfterActionReport />
    </div>
  );
}

function SimControls() {
  const floor = useActiveFloor();
  const running = useSimStore((s) => s.running);
  const speed = useSimStore((s) => s.speed);
  const t = useSimStore((s) => s.t);
  const play = useSimStore((s) => s.play);
  const pause = useSimStore((s) => s.pause);
  const reset = useSimStore((s) => s.reset);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const detectingCameras = useSimStore((s) => s.detectingCameras);
  const coveredTime = useSimStore((s) => s.coveredTime);
  const blindTime = useSimStore((s) => s.blindTime);

  const doneAt = useMemo(() => {
    if (!floor || !floor.simPath) return 0;
    const { doneAt } = positionOnPath(floor.simPath, 0, 1.4, floor.scale);
    return doneAt;
  }, [floor?.simPath, floor?.scale, floor]);

  const progress = doneAt > 0 ? Math.min(1, t / doneAt) : 0;
  const detectionCount = detectingCameras.size;
  const totalElapsed = coveredTime + blindTime;
  const coveragePct =
    totalElapsed > 0.001 ? Math.round((coveredTime / totalElapsed) * 100) : 0;

  return (
    <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
      <div className="flex min-w-[520px] flex-col gap-2.5 rounded-2xl border border-border bg-card/92 px-4 py-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (running ? pause() : play())}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg btn-lift",
              "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/14%),0_4px_16px_-6px_oklch(0.78_0.135_158/55%)] hover:bg-primary/90"
            )}
            aria-label={running ? "Pause" : "Play"}
          >
            {running ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="size-4 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground btn-lift hover:text-foreground hover:bg-card/70"
            aria-label="Restart"
          >
            <RotateCcw className="size-4" />
          </button>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between text-[0.72rem] font-mono text-muted-foreground">
              <span>
                <span className="uppercase tracking-[0.08em] opacity-70">t </span>
                <span className="text-foreground/90">{t.toFixed(1)}s</span>
              </span>
              <span>
                <span className="uppercase tracking-[0.08em] opacity-70">
                  total{" "}
                </span>
                <span className="text-foreground/90">{doneAt.toFixed(1)}s</span>
              </span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-background/60">
              <div
                className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-background/40 p-0.5">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[0.7rem] font-mono transition-colors",
                  speed === s
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-[0.78rem]">
          <div className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Activity className="size-3.5 text-primary" />
            <span>
              Subject walks the demo path. Camera cones light up green on
              detection.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.7rem] font-mono",
                coveragePct >= 80
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : coveragePct >= 50
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-400"
              )}
            >
              <Timer className="size-3" />
              {coveragePct}% covered
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.7rem] font-mono",
                detectionCount > 0
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-400"
              )}
            >
              {detectionCount > 0 ? (
                <>
                  <Zap className="size-3" />
                  {detectionCount} on subject
                </>
              ) : (
                <>
                  <ShieldAlert className="size-3" />
                  Blind
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetectionFeed() {
  const events = useSimStore((s) => s.events);
  const floor = useActiveFloor();
  if (events.length === 0) return null;
  const recent = events.slice(-8).reverse();
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30 w-72 space-y-1.5">
      <div className="rounded-lg border border-border bg-card/85 px-3 py-2 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Live detection feed
          </div>
          <span className="font-mono text-[0.65rem] text-muted-foreground">
            {events.length}
          </span>
        </div>
        <div className="space-y-1">
          {recent.map((ev, idx) => {
            const device = floor?.devices.find((d) => d.id === ev.deviceId);
            const tone =
              ev.type === "detected"
                ? "text-emerald-400"
                : ev.type === "lost"
                  ? "text-amber-400"
                  : "text-rose-400";
            return (
              <div
                key={`${ev.deviceId}-${idx}-${ev.timestamp}`}
                className="flex items-baseline gap-2 text-[0.78rem]"
              >
                <span className="font-mono text-[0.7rem] text-muted-foreground">
                  {ev.timestamp.toFixed(1)}s
                </span>
                <span className={cn("font-medium", tone)}>
                  {ev.type === "detected" && "detected"}
                  {ev.type === "lost" && "lost"}
                  {ev.type === "triggered" && "triggered"}
                </span>
                <span className="truncate text-muted-foreground">
                  {device?.label ?? ev.deviceId}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AfterActionReport() {
  const finished = useSimStore((s) => s.finished);
  const reset = useSimStore((s) => s.reset);
  const play = useSimStore((s) => s.play);
  const floor = useActiveFloor();
  const coverageByCamera = useSimStore((s) => s.coverageByCamera);
  const coveredTime = useSimStore((s) => s.coveredTime);
  const blindTime = useSimStore((s) => s.blindTime);
  const firstDetectionAt = useSimStore((s) => s.firstDetectionAt);
  const longestBlindInterval = useSimStore((s) => s.longestBlindInterval);
  const events = useSimStore((s) => s.events);

  if (!finished || !floor) return null;

  const totalTime = coveredTime + blindTime;
  const coveragePct =
    totalTime > 0.001 ? Math.round((coveredTime / totalTime) * 100) : 0;
  const cameras = floor.devices.filter((d) => d.type === "camera");
  // Per-camera entries sorted by observed time desc
  const perCamera = cameras
    .map((c) => ({
      id: c.id,
      label: c.label,
      observed: coverageByCamera[c.id] ?? 0,
    }))
    .sort((a, b) => b.observed - a.observed);

  const verdict =
    coveragePct >= 85
      ? {
          label: "Strong coverage",
          tone: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
          icon: CheckCircle2,
        }
      : coveragePct >= 60
        ? {
            label: "Acceptable, with gaps",
            tone: "text-amber-400 border-amber-500/40 bg-amber-500/10",
            icon: AlertTriangle,
          }
        : {
            label: "Significant blind spots",
            tone: "text-rose-400 border-rose-500/40 bg-rose-500/10",
            icon: ShieldAlert,
          };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/65 backdrop-blur-sm">
      <div className="w-[640px] max-w-[92vw] rounded-2xl border border-border surface-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              After-action report
            </div>
            <div className="mt-1 text-xl font-medium tracking-[-0.01em]">
              <span className="font-serif-italic text-primary">{floor.name}</span>
              {" "}— subject walk-through
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/70"
            aria-label="Close report"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[0.85rem] font-medium",
              verdict.tone
            )}
          >
            <verdict.icon className="size-4" />
            {verdict.label} — <span className="font-mono">{coveragePct}%</span>
            <span className="opacity-70">covered</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Total run"
              value={`${totalTime.toFixed(1)}s`}
              mono
            />
            <Stat
              label="Time on subject"
              value={`${coveredTime.toFixed(1)}s`}
              mono
              tone="emerald"
            />
            <Stat
              label="Blind time"
              value={`${blindTime.toFixed(1)}s`}
              mono
              tone={blindTime > 0 ? "rose" : "neutral"}
            />
            <Stat
              label="First detect"
              value={
                firstDetectionAt !== null
                  ? `${firstDetectionAt.toFixed(1)}s`
                  : "never"
              }
              mono
              tone={firstDetectionAt === null ? "rose" : "neutral"}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Per-camera observation
              </div>
              <div className="font-mono text-[0.7rem] text-muted-foreground">
                {events.length} events
              </div>
            </div>
            <div className="space-y-1.5">
              {perCamera.map((c) => {
                const pctOfRun =
                  totalTime > 0
                    ? Math.round((c.observed / totalTime) * 100)
                    : 0;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-md border border-border/70 bg-card/40 px-3 py-1.5"
                  >
                    <div className="flex-1 truncate text-[0.85rem]">
                      {c.label}
                    </div>
                    <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-background/70">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0",
                          pctOfRun >= 60
                            ? "bg-primary"
                            : pctOfRun >= 25
                              ? "bg-amber-500"
                              : "bg-rose-500/80"
                        )}
                        style={{ width: `${Math.min(100, pctOfRun)}%` }}
                      />
                    </div>
                    <div className="w-20 text-right font-mono text-[0.78rem] text-muted-foreground">
                      {c.observed.toFixed(1)}s
                    </div>
                    <div className="w-10 text-right font-mono text-[0.78rem] text-foreground/85">
                      {pctOfRun}%
                    </div>
                  </div>
                );
              })}
              {perCamera.length === 0 && (
                <div className="text-sm text-muted-foreground py-2">
                  No cameras placed in the design.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Longest blind interval
            </div>
            <div className="font-mono text-foreground/90">
              {longestBlindInterval.toFixed(1)}s
            </div>
            <div className="mt-1 text-[0.78rem] text-muted-foreground">
              {longestBlindInterval > 5
                ? "A subject can move significantly without being observed. Consider repositioning a camera or adding coverage."
                : longestBlindInterval > 1.5
                  ? "Short gap in coverage; usually acceptable for non-critical zones."
                  : "Continuous coverage maintained throughout."}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-border bg-card/40 px-3 py-1.5 text-sm text-foreground hover:bg-card/70 btn-lift"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setTimeout(() => play(), 0);
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 btn-lift shadow-[0_4px_18px_-8px_oklch(0.78_0.135_158/55%)]"
          >
            Re-run simulation
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  tone = "neutral",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "neutral" | "emerald" | "rose";
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/40 px-3 py-2.5">
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          mono ? "font-mono" : "",
          "mt-0.5 text-[1.1rem] tracking-tight",
          tone === "emerald" && "text-emerald-400",
          tone === "rose" && "text-rose-400"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function NoPathState() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-canvas">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 50%, var(--canvas-accent), transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bg-grid-fine pointer-events-none opacity-30" />
      <div className="relative max-w-md text-center px-8">
        <div className="inline-flex items-center justify-center rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
          <AlertTriangle className="size-7 text-primary" />
        </div>
        <h3 className="mt-5 text-2xl font-medium tracking-[-0.01em]">
          No simulation path on this floor
        </h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Load the{" "}
          <span className="font-serif-italic text-foreground/80">demo office</span>{" "}
          (Switch to 2D and press &ldquo;Load demo office&rdquo;) to see a
          subject walk a preset path through the building with cameras picking
          them up in real time. Custom path drawing comes in the next
          milestone.
        </p>
      </div>
    </div>
  );
}
