"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { loadImageMeta, runAISurvey } from "@/lib/ai-survey";
import { applySurveyToActiveFloor } from "@/lib/ai-apply";

type Phase = "upload" | "configure" | "running" | "done";

const STATUS_STEPS: { label: string; minDuration: number }[] = [
  { label: "Reading floor plan…", minDuration: 1500 },
  { label: "Measuring scale and identifying rooms…", minDuration: 2500 },
  { label: "Tracing walls and openings…", minDuration: 3000 },
  { label: "Placing cameras, readers, and sensors…", minDuration: 3500 },
  { label: "Finalizing design…", minDuration: 1000 },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AISurveyDialog({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [buildingType, setBuildingType] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [statusStepIndex, setStatusStepIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycle through status messages while the request is in-flight so the user
  // sees progress even though the real request runs as a single round-trip.
  useEffect(() => {
    if (phase !== "running") return;
    setStatusStepIndex(0);
    let cancelled = false;
    let i = 0;
    function next() {
      if (cancelled) return;
      const step = STATUS_STEPS[i];
      if (!step) return;
      window.setTimeout(() => {
        if (cancelled) return;
        i = Math.min(i + 1, STATUS_STEPS.length - 1);
        setStatusStepIndex(i);
        if (i < STATUS_STEPS.length - 1) next();
      }, step.minDuration);
    }
    next();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // Reset state when the dialog closes
  useEffect(() => {
    if (!open) {
      // Slight delay so the close animation doesn't flash empty state
      const t = window.setTimeout(() => {
        setPhase("upload");
        setFile(null);
        setImagePreview(null);
        setBuildingType("");
        setProjectNotes("");
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  function handleFileChosen(f: File | null) {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(f);
    setPhase("configure");
  }

  async function handleRun() {
    if (!file) return;
    setPhase("running");
    try {
      const meta = await loadImageMeta(file);
      const survey = await runAISurvey({
        imageBase64: meta.base64,
        imageMediaType: meta.mediaType,
        imageWidth: meta.width,
        imageHeight: meta.height,
        buildingType: buildingType.trim() || undefined,
        projectNotes: projectNotes.trim() || undefined,
      });
      const { wallsAdded, devicesAdded } = applySurveyToActiveFloor(
        survey,
        meta.base64,
      );
      setPhase("done");
      toast.success("AI survey applied", {
        description: `Generated ${wallsAdded} walls and ${devicesAdded} devices. Edit anything you want — your design is fully editable.`,
      });
      // Auto-close after a brief moment so user can see the result
      window.setTimeout(() => onClose(), 1400);
    } catch (err) {
      console.error(err);
      setPhase("configure");
      toast.error("AI survey failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={phase === "running" ? undefined : onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-md"
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-[0_25px_80px_-20px_rgba(0,0,0,0.4)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Sparkles className="size-4" strokeWidth={1.7} />
            </div>
            <div>
              <div className="text-[0.95rem] font-semibold tracking-[-0.01em]">
                Generate design with AI
              </div>
              <div className="text-[0.74rem] text-muted-foreground">
                Upload a floor plan — Claude proposes walls and devices.
              </div>
            </div>
          </div>
          {phase !== "running" && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {phase === "upload" && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-foreground/[0.02] py-10 transition-colors hover:bg-foreground/[0.04] hover:border-primary/40"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-foreground/[0.05]">
                <UploadCloud
                  className="size-5 text-muted-foreground"
                  strokeWidth={1.6}
                />
              </div>
              <div className="text-center">
                <div className="text-[0.92rem] font-medium">
                  Drop in a floor plan
                </div>
                <div className="mt-0.5 text-[0.76rem] text-muted-foreground">
                  PNG, JPG, or WebP. PDFs aren&rsquo;t supported yet — export
                  the page as an image first.
                </div>
              </div>
            </button>
          )}

          {phase === "configure" && imagePreview && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-lg ring-1 ring-border bg-foreground/[0.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Uploaded floor plan"
                  className="max-h-56 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setImagePreview(null);
                    setPhase("upload");
                  }}
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-[0.72rem] text-muted-foreground backdrop-blur hover:text-foreground"
                >
                  <X className="size-3" /> Change
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[0.78rem] font-medium text-foreground/85">
                  Building type{" "}
                  <span className="text-muted-foreground/70 font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                  placeholder="e.g. medical clinic, warehouse, school"
                  className="w-full rounded-md border border-border bg-background/40 px-3 py-2 text-[0.85rem] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[0.78rem] font-medium text-foreground/85">
                  Special instructions{" "}
                  <span className="text-muted-foreground/70 font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  placeholder="e.g. focus on perimeter security, customer requested 4K cameras at entries"
                  rows={3}
                  className="w-full rounded-md border border-border bg-background/40 px-3 py-2 text-[0.85rem] outline-none resize-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-[0.76rem] text-foreground/75">
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Heads up:
                </span>{" "}
                running this will replace any walls and devices on the active
                floor. The output is a starting point — you should review and
                refine it.
              </div>
            </div>
          )}

          {phase === "running" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="relative flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Loader2 className="size-6 animate-spin" strokeWidth={1.7} />
                </div>
              </div>
              <div className="space-y-1 text-center">
                <div className="text-[0.92rem] font-medium tracking-[-0.005em]">
                  {STATUS_STEPS[statusStepIndex]?.label ?? "Working…"}
                </div>
                <div className="text-[0.74rem] text-muted-foreground">
                  Usually takes 10–30 seconds.
                </div>
              </div>
              <div className="mt-2 flex gap-1">
                {STATUS_STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 w-6 rounded-full transition-colors",
                      i <= statusStepIndex
                        ? "bg-primary"
                        : "bg-foreground/[0.08]",
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div className="text-[0.92rem] font-medium">Design applied</div>
              <div className="text-[0.76rem] text-muted-foreground max-w-xs">
                Closing — your new design is on the canvas. Edit anything you
                want.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === "configure" && (
          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-[0.85rem] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={!file}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-[0.85rem] font-medium text-primary-foreground shadow-[0_4px_14px_-6px_oklch(0.55_0.17_245/55%)] hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles className="size-3.5" />
              Generate design
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFileChosen(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
