"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  ChevronDown,
  ChevronRight,
  Printer,
  Sparkles,
} from "lucide-react";
import { useActiveFloor, useDesignStore } from "@/lib/store";
import { planCabling } from "@/lib/cabling";
import { computeQuote, formatUSD } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Compact "live quote" card that sits at the top of the AI chat panel.
 *
 * Why: the user wants to discuss pricing with the agent WITHOUT leaving
 * the chat — so we surface the headline numbers (grand total + hero
 * breakdown) right inside the chat tab. The AI's tools already write
 * back to the same store, so as the agent edits rates, adds line items,
 * or removes devices, this card reanimates immediately.
 *
 * Three states:
 *   • collapsed (default) — single row with grand total + a chevron
 *   • expanded            — adds the three-stat hero + a BoM peek
 *   • prints the full standalone QuoteDrawer for export
 */
export function InlineQuoteCard({ onOpenFullQuote }: { onOpenFullQuote: () => void }) {
  const floor = useActiveFloor();
  const quoteSettings = useDesignStore((s) => s.quoteSettings);
  const [expanded, setExpanded] = useState(false);

  // Recompute on every render of the panel — cheap with memoization and
  // ensures the numbers always reflect the latest store mutations from
  // the AI's tool calls.
  const breakdown = useMemo(() => {
    if (!floor) return null;
    const cabling = planCabling(floor);
    return computeQuote(floor, {
      ...quoteSettings,
      autoCabling: {
        totalLengthM: cabling.totalLengthM,
        cameraRuns: cabling.cameraRuns,
        readerRuns: cabling.readerRuns,
      },
    });
  }, [floor, quoteSettings]);

  if (!floor || !breakdown) return null;

  // Hide the card until the user has placed at least one device. Before
  // that, the "grand total" is just commissioning + tax-on-commissioning
  // (~$900) which is confusing — there's no project to price yet.
  if (breakdown.rows.length === 0) return null;

  const deviceCount = breakdown.rows.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="mx-3 mt-3 rounded-xl border border-border/70 bg-gradient-to-br from-primary/[0.05] to-transparent">
      {/* Compact header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-foreground/[0.02] rounded-xl transition-colors"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Banknote className="size-3.5" strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <div className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Live quote
            </div>
            <div className="text-[1.05rem] font-semibold tracking-[-0.01em] tabular-nums">
              {formatUSD(breakdown.grandTotal)}
              <span className="ml-1.5 text-[0.7rem] font-normal text-muted-foreground">
                · {deviceCount} device{deviceCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded body — hero stats + small BoM peek + actions */}
      {expanded && (
        <div className="border-t border-border/50 px-3 pb-3">
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Hardware" value={formatUSD(breakdown.hardwareSubtotal)} />
            <Stat
              label="Labor"
              value={formatUSD(
                breakdown.laborSubtotal +
                  breakdown.cablingSubtotal +
                  breakdown.commissioningFee,
              )}
            />
            <Stat label="Tax" value={formatUSD(breakdown.taxAmount)} />
          </div>

          {breakdown.rows.length > 0 && (
            <div className="mt-3 rounded-lg border border-border/50 bg-background/40 max-h-[180px] overflow-y-auto">
              <table className="w-full text-[0.72rem]">
                <tbody>
                  {breakdown.rows.map((r) => (
                    <tr
                      key={r.modelId}
                      className="border-b border-border/30 last:border-b-0"
                    >
                      <td className="px-2 py-1.5">
                        <div className="font-medium truncate">{r.displayName}</div>
                        <div className="text-[0.62rem] text-muted-foreground">
                          {r.vendor}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right text-muted-foreground tabular-nums">
                        ×{r.quantity}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[0.7rem]">
                        {formatUSD(r.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {quoteSettings.extraLineItems.length > 0 && (
            <div className="mt-2 space-y-1 px-1">
              {quoteSettings.extraLineItems.map((li, i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between text-[0.7rem]"
                >
                  <span className="inline-flex items-center gap-1.5 text-foreground/80">
                    <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wider text-muted-foreground">
                      {li.category}
                    </span>
                    <span className="truncate">{li.description}</span>
                  </span>
                  <span className="font-mono text-foreground/80 tabular-nums">
                    {formatUSD(li.quantity * li.unitCost)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenFullQuote}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1 text-[0.7rem] font-medium hover:bg-foreground/[0.05] transition-colors"
            >
              <Printer className="size-3" strokeWidth={2.2} />
              Print quote
            </button>
            <div
              className={cn(
                "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-medium",
                quoteSettings.aiAdjusted
                  ? "bg-primary/12 text-primary"
                  : "bg-muted/40 text-muted-foreground",
              )}
            >
              <Sparkles className="size-2.5" />
              {quoteSettings.aiAdjusted
                ? `AI tuned · ${quoteSettings.projectLocation || "region set"}`
                : "Ask AI to audit pricing"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-2 py-1.5">
      <div className="text-[0.56rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[0.78rem] font-medium tabular-nums">
        {value}
      </div>
    </div>
  );
}
