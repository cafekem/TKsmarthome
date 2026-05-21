"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";

interface Shortcut {
  key: string;
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: "V", label: "Select" },
  { key: "W", label: "Draw wall" },
  { key: "C", label: "Calibrate" },
  { key: "F", label: "Fit to content" },
  { key: "Del", label: "Remove selected" },
  { key: "Esc", label: "Cancel / deselect" },
];

export function ShortcutsHint() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Keyboard shortcuts"
        className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1.5 text-[0.72rem] text-muted-foreground backdrop-blur-xl ring-1 ring-black/[0.04] dark:ring-white/[0.05] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.12)] transition-colors hover:text-foreground"
      >
        <Keyboard className="size-3.5" strokeWidth={1.7} />
        <kbd className="rounded border border-border/40 bg-background/40 px-1 py-px font-mono text-[10px]">
          ?
        </kbd>
      </button>

      {open && (
        <div className="absolute bottom-12 right-3 z-30 w-64 rounded-xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-[0.82rem] font-semibold tracking-[-0.005em] text-foreground">
              Shortcuts
            </div>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ?
            </kbd>
          </div>
          <div className="space-y-1.5">
            {SHORTCUTS.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground">{s.label}</span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
