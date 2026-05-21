"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DORI_DESCRIPTIONS,
  DORI_LABELS,
  DORI_THRESHOLDS_PX_PER_M,
  classifyAtDistance,
  doriDistances,
  horizontalPixelsFromResolution,
  type DoriTask,
} from "@/lib/dori";

interface Props {
  fovDegrees: number;
  rangeMeters: number;
  resolution?: string;
}

const TASK_ORDER: DoriTask[] = ["detect", "observe", "recognize", "identify"];

// Color tone per task — escalates from neutral to "alert" green to indicate
// the strictness/quality of the task.
const TASK_TONE: Record<DoriTask, string> = {
  detect: "bg-foreground/40",
  observe: "bg-amber-500/85",
  recognize: "bg-sky-500/90",
  identify: "bg-emerald-500",
};

/**
 * DORI calculator panel for camera devices. Two modes:
 *
 *  • "What can my camera do?" — given resolution + FOV, show the maximum
 *    distance at which each DORI task is achievable.
 *
 *  • "At a distance X, what do I get?" — slider for distance, with the
 *    resulting task class highlighted in real time.
 *
 * Uses the per-IEC 62676-4 thresholds. Honest about its own limitations
 * (we infer horizontal pixel count from a friendly resolution string).
 */
export function CameraDORIPanel({
  fovDegrees,
  rangeMeters,
  resolution,
}: Props) {
  const horizontalPixels = horizontalPixelsFromResolution(resolution);

  const [distance, setDistance] = useState(() =>
    Math.max(2, Math.min(rangeMeters, rangeMeters * 0.5)),
  );

  if (!horizontalPixels || fovDegrees <= 0) {
    return (
      <details className="group rounded-lg border border-border/60 bg-card/30">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[0.78rem] font-medium text-foreground/85 transition-colors hover:bg-foreground/[0.03]">
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="size-3.5 text-muted-foreground" />
            DORI calculator
          </span>
          <span className="text-[0.7rem] text-muted-foreground transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="px-3 pb-3 pt-1 text-[0.74rem] text-muted-foreground leading-relaxed">
          Set the camera resolution (e.g. <code>1080p</code> or{" "}
          <code>4K</code>) to compute DORI distances.
        </div>
      </details>
    );
  }

  const distances = doriDistances({ horizontalPixels, fovDegrees });
  const liveResult = classifyAtDistance({
    horizontalPixels,
    fovDegrees,
    distanceM: distance,
  });

  // Slider runs from 1 m to ~max + 10% so we can show the "drops off" effect
  const sliderMax = Math.max(distances.detect * 1.1, rangeMeters * 1.1, 10);

  return (
    <details className="group rounded-lg border border-border/60 bg-card/30" open>
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[0.78rem] font-medium text-foreground/85 transition-colors hover:bg-foreground/[0.03]">
        <span className="inline-flex items-center gap-1.5">
          <Ruler className="size-3.5 text-muted-foreground" />
          DORI calculator
        </span>
        <span className="text-[0.7rem] text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="space-y-3 px-3 pb-3 pt-1">
        {/* Per-task max distances */}
        <div className="space-y-1.5">
          {TASK_ORDER.map((task) => (
            <div
              key={task}
              className="flex items-center gap-2 text-[0.78rem]"
              title={DORI_DESCRIPTIONS[task]}
            >
              <span
                className={cn(
                  "inline-block size-1.5 rounded-full",
                  TASK_TONE[task],
                )}
                aria-hidden
              />
              <span className="w-[5.5rem] text-foreground/85">
                {DORI_LABELS[task]}
              </span>
              <span className="flex-1 text-[0.7rem] text-muted-foreground">
                ≥ {DORI_THRESHOLDS_PX_PER_M[task]} px/m
              </span>
              <span className="tabular-nums font-medium">
                ≤ {distances[task].toFixed(1)} m
              </span>
            </div>
          ))}
        </div>

        {/* Live distance slider */}
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-[0.74rem]">
            <span className="text-muted-foreground">At distance</span>
            <span className="tabular-nums font-medium text-foreground/90">
              {distance.toFixed(1)} m
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={sliderMax}
            step={0.5}
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex items-center gap-2 text-[0.78rem]">
            <span className="text-muted-foreground">→</span>
            {liveResult.task ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
                  liveResult.task === "identify"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : liveResult.task === "recognize"
                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                      : liveResult.task === "observe"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-foreground/10 text-foreground/80",
                )}
              >
                {DORI_LABELS[liveResult.task]}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
                Below Detect threshold
              </span>
            )}
            <span className="text-muted-foreground tabular-nums">
              · {liveResult.pxPerM.toFixed(0)} px/m
            </span>
          </div>
        </div>

        <div className="text-[0.7rem] text-muted-foreground/70 leading-snug">
          Thresholds per IEC 62676-4. Computed from {resolution ?? "—"} ·{" "}
          {horizontalPixels} horizontal px ·{" "}
          {fovDegrees.toFixed(0)}° FOV.
        </div>
      </div>
    </details>
  );
}
