"use client";

import { useMemo, useRef, useState } from "react";
import {
  Banknote,
  Loader2,
  Palette,
  Printer,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useActiveFloor,
  useCurrentDesign,
  useDesignStore,
} from "@/lib/store";
import { computeQuote, formatUSD } from "@/lib/pricing";
import { runAIQuote, summarizeFloorForQuote } from "@/lib/ai-quote";
import { planCabling } from "@/lib/cabling";
import { cn } from "@/lib/utils";

interface QuoteDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function QuoteDrawer({ open, onClose }: QuoteDrawerProps) {
  const design = useCurrentDesign();
  const floor = useActiveFloor();
  const quoteSettings = useDesignStore((s) => s.quoteSettings);
  const updateQuoteSettings = useDesignStore((s) => s.updateQuoteSettings);

  // Auto-route cabling so the BoM's cabling line reflects real run lengths
  // instead of a flat per-device estimate.
  const cabling = useMemo(
    () => (floor ? planCabling(floor) : null),
    [floor],
  );

  const breakdown = useMemo(() => {
    if (!floor) return null;
    return computeQuote(floor, {
      ...quoteSettings,
      autoCabling: cabling
        ? {
            totalLengthM: cabling.totalLengthM,
            cameraRuns: cabling.cameraRuns,
            readerRuns: cabling.readerRuns,
          }
        : undefined,
    });
  }, [floor, quoteSettings, cabling]);

  // AI Quote dialog state
  const [aiQuoteRunning, setAiQuoteRunning] = useState(false);
  const [locationDraft, setLocationDraft] = useState(
    quoteSettings.projectLocation,
  );

  // Tabbed sections within the redesigned drawer.
  const [tab, setTab] = useState<"overview" | "rates" | "branding">("overview");

  async function runAIEstimate() {
    if (!floor || !design) return;
    const loc = locationDraft.trim();
    if (!loc) {
      toast.error("Add a project location first (ZIP or city, state).");
      return;
    }
    setAiQuoteRunning(true);
    try {
      const summary = summarizeFloorForQuote(floor);
      const result = await runAIQuote({
        designName: design.name,
        location: loc,
        deviceCounts: summary.deviceCounts,
        floorAreaSqMeters: summary.floorAreaSqMeters,
        wallCount: summary.wallCount,
      });
      updateQuoteSettings({
        projectLocation: loc,
        laborRate: result.rates.laborHourly,
        cablingPerCamera: result.rates.cablingPerCamera,
        cablingPerReader: result.rates.cablingPerReader,
        commissioningFee: result.rates.commissioningFee,
        taxPct: result.rates.taxPercentage,
        markupPct: result.rates.suggestedMarkupPct,
        regionalNotes: result.regionalNotes,
        benchmark: result.benchmark,
        narrative: result.narrative,
        extraLineItems: result.extraLineItems,
        aiAdjusted: true,
      });
      toast.success("Quote updated with location-aware pricing", {
        description: result.benchmark || "Rates adjusted for this region.",
      });
    } catch (err) {
      toast.error("AI estimate failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setAiQuoteRunning(false);
    }
  }

  function clearAIEstimate() {
    updateQuoteSettings({
      aiAdjusted: false,
      regionalNotes: "",
      benchmark: "",
      narrative: "",
      extraLineItems: [],
    });
    toast.success("AI adjustments cleared", {
      description: "Reverted to manual quote settings.",
    });
  }

  if (!open) return null;

  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/65 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-[640px] overflow-y-auto bg-card shadow-2xl",
          "print:static print:inset-auto print:max-w-none print:w-full print:overflow-visible print:shadow-none print:bg-white print:text-black"
        )}
      >
        {/* Drawer header — title + print + close. Clean strip, no shadows. */}
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-3 print:hidden">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Banknote className="size-3.5 text-primary" strokeWidth={1.8} />
              Quote
            </div>
            <div className="mt-0.5 truncate text-[1.05rem] font-semibold tracking-[-0.01em]">
              {design?.name ?? "Untitled design"}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[0.82rem] font-medium text-background hover:bg-foreground/85"
            >
              <Printer className="size-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Tab strip — Overview / Rates / Branding. Print hides this. */}
        <div className="flex items-center gap-1 border-b border-border/70 bg-background/30 px-4 py-1.5 print:hidden">
          <QuoteTab active={tab === "overview"} onClick={() => setTab("overview")}>
            <Banknote className="size-3.5" strokeWidth={1.8} />
            Overview
          </QuoteTab>
          <QuoteTab active={tab === "rates"} onClick={() => setTab("rates")}>
            <SlidersHorizontal className="size-3.5" strokeWidth={1.8} />
            Rates
          </QuoteTab>
          <QuoteTab active={tab === "branding"} onClick={() => setTab("branding")}>
            <Palette className="size-3.5" strokeWidth={1.8} />
            Branding
          </QuoteTab>
        </div>

        <div
          id="quote-print-root"
          className="px-6 py-5 space-y-6 print:px-12 print:py-10"
        >
          {/* Header for print */}
          <div className="hidden print:block">
            <div
              className="flex items-end justify-between border-b pb-4"
              style={{
                borderColor: quoteSettings.brandColor || "rgba(0,0,0,0.2)",
              }}
            >
              <div className="flex items-end gap-4">
                {quoteSettings.companyLogoDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={quoteSettings.companyLogoDataUrl}
                    alt="Company logo"
                    className="max-h-16 max-w-[220px] object-contain"
                  />
                )}
                <div>
                  <div
                    className="text-xs uppercase tracking-[0.2em]"
                    style={{
                      color: quoteSettings.brandColor || "rgba(0,0,0,0.5)",
                    }}
                  >
                    Quote — Security System Design
                  </div>
                  <div className="mt-1 text-2xl font-medium">
                    {design?.name ?? "Untitled design"}
                  </div>
                  <div className="mt-0.5 text-sm text-black/60">
                    Floor: {floor?.name ?? "—"}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-black/60">Date</div>
                <div>{today}</div>
                {quoteSettings.preparedBy && (
                  <>
                    <div className="mt-2 text-black/60">Prepared by</div>
                    <div>{quoteSettings.preparedBy}</div>
                  </>
                )}
                {quoteSettings.clientName && (
                  <>
                    <div className="mt-2 text-black/60">Prepared for</div>
                    <div>{quoteSettings.clientName}</div>
                  </>
                )}
              </div>
            </div>
            {/* AI narrative paragraph — shows in the printed PDF */}
            {quoteSettings.narrative && (
              <div className="mt-5 text-[0.92rem] leading-relaxed text-black/80">
                {quoteSettings.narrative}
              </div>
            )}
          </div>

          {tab === "overview" && (
            <div className="print:hidden space-y-5">
              {/* Hero total — biggest number on the screen. */}
              {breakdown && (
                <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.06] to-transparent p-5">
                  <div className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Grand total
                  </div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <div className="text-[2.2rem] font-semibold tracking-[-0.02em]">
                      {formatUSD(breakdown.grandTotal)}
                    </div>
                    <div className="text-[0.78rem] text-muted-foreground">
                      incl. tax
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2.5">
                    <HeroStat label="Hardware" value={formatUSD(breakdown.hardwareSubtotal)} />
                    <HeroStat
                      label="Labor + cabling"
                      value={formatUSD(
                        breakdown.laborSubtotal +
                          breakdown.cablingSubtotal +
                          breakdown.commissioningFee,
                      )}
                    />
                    <HeroStat label="Tax" value={formatUSD(breakdown.taxAmount)} />
                  </div>
                </div>
              )}

              {/* Client + prepared-by */}
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Client"
                  value={quoteSettings.clientName}
                  placeholder="ACME Corp — Boston HQ"
                  onChange={(v) => updateQuoteSettings({ clientName: v })}
                />
                <Field
                  label="Prepared by"
                  value={quoteSettings.preparedBy}
                  placeholder="Your Company, Inc."
                  onChange={(v) => updateQuoteSettings({ preparedBy: v })}
                />
              </div>
              {/* AI assistant card opens directly below */}
              <section>
            <div
              className={cn(
                "rounded-xl border bg-card/40 p-4 transition-colors",
                quoteSettings.aiAdjusted
                  ? "border-primary/40 bg-primary/[0.04]"
                  : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Sparkles className="size-3.5" strokeWidth={1.7} />
                  </div>
                  <div>
                    <div className="text-[0.88rem] font-semibold tracking-[-0.01em]">
                      Location-aware AI estimate
                    </div>
                    <div className="mt-0.5 text-[0.76rem] text-muted-foreground leading-snug">
                      {quoteSettings.aiAdjusted
                        ? `Rates adjusted for ${quoteSettings.projectLocation}. Edit anything you want — your numbers are still in charge.`
                        : "Labor rates, tax, and permit costs vary widely by region. Enter a ZIP or city to get a localised quote."}
                    </div>
                  </div>
                </div>
                {quoteSettings.aiAdjusted && (
                  <button
                    type="button"
                    onClick={clearAIEstimate}
                    className="shrink-0 rounded-md px-2 py-1 text-[0.72rem] font-medium text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={locationDraft}
                  onChange={(e) => setLocationDraft(e.target.value)}
                  placeholder="e.g. Brooklyn, NY · 11201 · Austin TX"
                  disabled={aiQuoteRunning}
                  className="min-w-0 flex-1 rounded-md border border-border bg-background/50 px-3 py-1.5 text-[0.85rem] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={runAIEstimate}
                  disabled={aiQuoteRunning || !floor}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-[0.82rem] font-medium text-primary-foreground shadow-[0_4px_14px_-6px_oklch(0.55_0.17_245/55%)] hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary"
                >
                  {aiQuoteRunning ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Estimating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      {quoteSettings.aiAdjusted ? "Re-estimate" : "Get estimate"}
                    </>
                  )}
                </button>
              </div>
              {quoteSettings.aiAdjusted && quoteSettings.regionalNotes && (
                <div className="mt-3 rounded-md bg-foreground/[0.04] px-3 py-2 text-[0.76rem] text-foreground/80 leading-relaxed">
                  <span className="font-medium text-foreground/90">Note: </span>
                  {quoteSettings.regionalNotes}
                </div>
              )}
              {quoteSettings.aiAdjusted && quoteSettings.benchmark && (
                <div className="mt-2 text-[0.76rem] text-muted-foreground italic">
                  {quoteSettings.benchmark}
                </div>
              )}
            </div>
          </section>

          {/* Bill of Materials */}
          <section>
            <SectionHeading>Bill of materials</SectionHeading>
            <div className="mt-3 overflow-hidden rounded-lg border border-border print:border print:border-black/15 print:rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[0.72rem] uppercase tracking-[0.1em] text-muted-foreground print:bg-black/5 print:text-black/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Model</th>
                    <th className="px-3 py-2 text-left font-medium">Vendor</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit</th>
                    <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown && breakdown.rows.length > 0 ? (
                    breakdown.rows.map((row) => (
                      <tr
                        key={row.modelId}
                        className="border-t border-border/60 print:border-black/10"
                      >
                        <td className="px-3 py-2.5 font-medium">
                          {row.displayName}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground print:text-black/60">
                          {row.vendor}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {row.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {formatUSD(row.unitPrice)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {formatUSD(row.subtotal)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-sm text-muted-foreground"
                      >
                        No devices in this design yet. Drop something from the
                        sidebar to start.
                      </td>
                    </tr>
                  )}
                </tbody>
                {breakdown && breakdown.rows.length > 0 && (
                  <tfoot className="border-t border-border/80 bg-muted/30 text-sm print:bg-black/5 print:border-black/15">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2.5 text-right font-medium"
                      >
                        Hardware subtotal
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium">
                        {formatUSD(breakdown.hardwareSubtotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          {/* Labor + cabling + commissioning */}
          {breakdown && (
            <section>
              <SectionHeading>Labor & installation</SectionHeading>
              <div className="mt-3 rounded-lg border border-border print:border-black/15 print:rounded-md">
                <LineItem
                  label={`Installation labor (${breakdown.laborHoursTotal}h × ${formatUSD(quoteSettings.laborRate)}/h)`}
                  value={breakdown.laborSubtotal}
                />
                <LineItem
                  label={
                    cabling && cabling.totalLengthM > 0
                      ? `Cabling, connectors, terminations (auto-routed ${cabling.totalLengthM.toFixed(0)} m across ${cabling.runs.length} drops)`
                      : "Cabling, connectors, terminations"
                  }
                  value={breakdown.cablingSubtotal}
                />
                <LineItem
                  label="System commissioning & programming"
                  value={breakdown.commissioningFee}
                  divider={false}
                />
              </div>
            </section>
          )}

          {/* AI-added extra line items (permits, lift rental, premiums, etc.) */}
          {breakdown &&
            quoteSettings.extraLineItems &&
            quoteSettings.extraLineItems.length > 0 && (
              <section>
                <SectionHeading>
                  Regional &amp; project-specific
                </SectionHeading>
                <div className="mt-3 rounded-lg border border-border print:border-black/15 print:rounded-md">
                  {quoteSettings.extraLineItems.map((item, i) => {
                    const last = i === quoteSettings.extraLineItems.length - 1;
                    return (
                      <LineItem
                        key={`${item.description}-${i}`}
                        label={
                          item.quantity > 1
                            ? `${item.description} (${item.quantity} × ${formatUSD(item.unitCost)})`
                            : item.description
                        }
                        value={item.quantity * item.unitCost}
                        divider={!last}
                        smallLabel={
                          <span className="ml-2 rounded-full bg-muted/60 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                            {item.category}
                          </span>
                        }
                      />
                    );
                  })}
                </div>
              </section>
            )}

          {/* Totals */}
          {breakdown && (
            <section>
              <SectionHeading>Totals</SectionHeading>
              <div className="mt-3 rounded-lg border border-border print:border-black/15 print:rounded-md">
                <LineItem
                  label="Pre-tax subtotal"
                  value={breakdown.preTaxSubtotal - breakdown.markupAmount}
                />
                {breakdown.markupAmount > 0 && (
                  <LineItem
                    label={`Markup (${quoteSettings.markupPct}%)`}
                    value={breakdown.markupAmount}
                  />
                )}
                <LineItem
                  label={`Sales tax (${quoteSettings.taxPct}%)`}
                  value={breakdown.taxAmount}
                />
                <LineItem
                  label="Grand total"
                  value={breakdown.grandTotal}
                  bold
                  divider={false}
                />
              </div>
            </section>
          )}
            </div>
          )}

          {tab === "rates" && (
            <div className="print:hidden space-y-4">
              <div className="text-[0.78rem] text-muted-foreground leading-relaxed">
                Editable rates that feed every total. The AI quote assistant
                (back on Overview) can adjust these for your region.
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <NumberField
                  label="Labor rate ($/hr)"
                  value={quoteSettings.laborRate}
                  step={5}
                  onChange={(v) => updateQuoteSettings({ laborRate: v })}
                />
                <NumberField
                  label="Cabling / camera ($)"
                  value={quoteSettings.cablingPerCamera}
                  step={10}
                  onChange={(v) => updateQuoteSettings({ cablingPerCamera: v })}
                />
                <NumberField
                  label="Cabling / reader ($)"
                  value={quoteSettings.cablingPerReader}
                  step={10}
                  onChange={(v) => updateQuoteSettings({ cablingPerReader: v })}
                />
                <NumberField
                  label="Commissioning fee ($)"
                  value={quoteSettings.commissioningFee}
                  step={50}
                  onChange={(v) => updateQuoteSettings({ commissioningFee: v })}
                />
                <NumberField
                  label="Markup (%)"
                  value={quoteSettings.markupPct}
                  step={1}
                  onChange={(v) => updateQuoteSettings({ markupPct: v })}
                />
                <NumberField
                  label="Sales tax (%)"
                  value={quoteSettings.taxPct}
                  step={0.25}
                  onChange={(v) => updateQuoteSettings({ taxPct: v })}
                />
              </div>
            </div>
          )}

          {tab === "branding" && (
            <BrandingSection
              companyLogoDataUrl={quoteSettings.companyLogoDataUrl}
              brandColor={quoteSettings.brandColor}
              printFooter={quoteSettings.printFooter}
              onChange={updateQuoteSettings}
            />
          )}

          {/* Footer (print) — branded if a custom footer line was set */}
          <div
            className="hidden print:block text-[0.72rem] text-black/55 pt-6 border-t"
            style={{
              borderColor: quoteSettings.brandColor || "rgba(0,0,0,0.15)",
            }}
          >
            {quoteSettings.printFooter ? (
              <div className="mb-2 text-black/80">{quoteSettings.printFooter}</div>
            ) : null}
            Estimate valid for 30 days from date of issue. Pricing reflects
            standard distributor rates and is subject to availability. Final
            invoice may vary based on on-site conditions and material lead
            times.{" "}
            {quoteSettings.companyLogoDataUrl
              ? ""
              : "Generated by DeeperVision."}
          </div>
        </div>
      </aside>
    </>
  );
}

/** Tab in the redesigned drawer header. */
function QuoteTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.78rem] font-medium tracking-[-0.005em] transition-colors",
        active
          ? "bg-foreground/[0.07] text-foreground"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Small breakdown stat inside the Grand Total hero card. */
function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[0.92rem] font-medium tracking-tight">
        {value}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground print:text-black/55">
      {children}
    </div>
  );
}

function LineItem({
  label,
  value,
  bold,
  divider = true,
  smallLabel,
}: {
  label: string;
  value: number;
  bold?: boolean;
  divider?: boolean;
  smallLabel?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between px-3 py-2.5 text-sm",
        divider && "border-b border-border/60 print:border-black/10"
      )}
    >
      <span
        className={cn(
          "inline-flex items-baseline",
          bold ? "font-medium" : "text-muted-foreground print:text-black/70",
        )}
      >
        {label}
        {smallLabel}
      </span>
      <span
        className={cn(
          "font-mono",
          bold && "text-[1.1rem] font-medium tracking-tight"
        )}
      >
        {formatUSD(value)}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background/40 px-2 py-1.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

/**
 * White-label section: company logo upload + brand color + custom footer
 * line. The logo is stored as a data URL on QuoteSettings so it persists
 * with the design and applies to every PDF export.
 */
function BrandingSection({
  companyLogoDataUrl,
  brandColor,
  printFooter,
  onChange,
}: {
  companyLogoDataUrl: string;
  brandColor: string;
  printFooter: string;
  onChange: (partial: Partial<{
    companyLogoDataUrl: string;
    brandColor: string;
    printFooter: string;
  }>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogo(file: File | undefined) {
    if (!file) return;
    // Compress + cap so the design file stays small even with a 4K logo.
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const src = String(reader.result);
        const img = new Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("bad image"));
          img.src = src;
        });
        const maxEdge = 600;
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const isPng = file.type === "image/png";
        const dataUrl = canvas.toDataURL(
          isPng ? "image/png" : "image/jpeg",
          isPng ? undefined : 0.9,
        );
        onChange({ companyLogoDataUrl: dataUrl });
        toast.success("Logo added", {
          description: "Will appear on the printed PDF.",
        });
      } catch (err) {
        toast.error("Couldn't load that logo", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="print:hidden">
      <SectionHeading>Branding</SectionHeading>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {/* Logo */}
        <div className="space-y-1.5">
          <div className="text-[0.74rem] text-muted-foreground">
            Company logo
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background/40 overflow-hidden">
              {companyLogoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={companyLogoDataUrl}
                  alt="Logo preview"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-[0.65rem] text-muted-foreground/60">
                  None
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-md bg-foreground text-background px-2.5 py-1 text-[0.74rem] font-medium hover:bg-foreground/85"
              >
                {companyLogoDataUrl ? "Replace" : "Upload"}
              </button>
              {companyLogoDataUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ companyLogoDataUrl: "" })}
                  className="rounded-md px-2.5 py-1 text-[0.7rem] text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              handleLogo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {/* Brand color */}
        <div className="space-y-1.5">
          <div className="text-[0.74rem] text-muted-foreground">
            Accent color
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandColor || "#1c1d20"}
              onChange={(e) => onChange({ brandColor: e.target.value })}
              className="size-10 rounded-md border border-border bg-transparent p-1"
            />
            <input
              type="text"
              value={brandColor}
              onChange={(e) => onChange({ brandColor: e.target.value })}
              placeholder="#3b82f6"
              className="flex-1 rounded-md border border-border bg-background/40 px-2 py-1.5 font-mono text-[0.78rem] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            />
            {brandColor && (
              <button
                type="button"
                onClick={() => onChange({ brandColor: "" })}
                className="text-[0.7rem] text-muted-foreground hover:text-foreground"
                title="Clear color"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer line */}
      <div className="mt-3 space-y-1.5">
        <div className="text-[0.74rem] text-muted-foreground">
          Print footer line{" "}
          <span className="text-muted-foreground/60 font-normal">
            (optional — terms, license #, contact)
          </span>
        </div>
        <input
          type="text"
          value={printFooter}
          onChange={(e) => onChange({ printFooter: e.target.value })}
          placeholder="ACME Security Integrators · Lic #C-7234 · sales@acme.com"
          className="w-full rounded-md border border-border bg-background/40 px-2 py-1.5 text-[0.78rem] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        />
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        className="mt-1 w-full rounded-md border border-border bg-background/40 px-2 py-1.5 text-sm font-mono outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
