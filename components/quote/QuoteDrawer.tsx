"use client";

import { useMemo } from "react";
import { Printer, X } from "lucide-react";
import {
  useActiveFloor,
  useCurrentDesign,
  useDesignStore,
} from "@/lib/store";
import { computeQuote, formatUSD } from "@/lib/pricing";
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

  const breakdown = useMemo(
    () => (floor ? computeQuote(floor, quoteSettings) : null),
    [floor, quoteSettings]
  );

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
        <div className="flex items-center justify-between border-b border-border px-6 py-4 print:hidden">
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Quote
            </div>
            <div className="mt-0.5 text-lg font-medium tracking-[-0.01em]">
              {design?.name ?? "Untitled design"}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 btn-lift shadow-[0_4px_14px_-6px_oklch(0.78_0.135_158/55%)]"
            >
              <Printer className="size-3.5" />
              Print to PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/70"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div
          id="quote-print-root"
          className="px-6 py-5 space-y-6 print:px-12 print:py-10"
        >
          {/* Header for print */}
          <div className="hidden print:block">
            <div className="flex items-end justify-between border-b border-black/20 pb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-black/50">
                  Quote — Security System Design
                </div>
                <div className="mt-1 text-2xl font-medium">
                  {design?.name ?? "Untitled design"}
                </div>
                <div className="mt-0.5 text-sm text-black/60">
                  Floor: {floor?.name ?? "—"}
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
          </div>

          {/* Client + prepared-by inputs (screen only) */}
          <div className="grid grid-cols-2 gap-3 print:hidden">
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
                  label="Cabling, connectors, terminations"
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

          {/* Editable rates (screen only) */}
          <section className="print:hidden">
            <SectionHeading>Rates</SectionHeading>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
          </section>

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

          {/* Footer note (print) */}
          <div className="hidden print:block text-[0.72rem] text-black/55 pt-6 border-t border-black/15">
            Estimate valid for 30 days from date of issue. Pricing reflects
            standard distributor rates and is subject to availability. Final
            invoice may vary based on on-site conditions and material lead
            times. Generated by DeeperVision.
          </div>
        </div>
      </aside>
    </>
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
}: {
  label: string;
  value: number;
  bold?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between px-3 py-2.5 text-sm",
        divider && "border-b border-border/60 print:border-black/10"
      )}
    >
      <span className={bold ? "font-medium" : "text-muted-foreground print:text-black/70"}>
        {label}
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
