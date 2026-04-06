/**
 * Pricing Page — Noland Earthworks
 * Crew-Day Pricing Calculator for land clearing jobs
 * Includes "Generate Estimate PDF" button for client delivery
 */

import DashboardLayout from "@/components/OpsDashboardLayout";
import { useState } from "react";
import { Calculator, DollarSign, Users, Clock, TrendingUp, Info, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── PDF generation (uses browser's built-in print API via a hidden iframe) ───
function generateEstimatePDF(params: {
  clientName: string;
  jobAddress: string;
  jobType: string;
  jobAcres: number;
  crewDaysNeeded: number;
  crewDayRate: number;
  jobTotal: number;
  pricePerAcre: number;
  jobProfit: number;
  targetMargin: number;
  totalDailyCost: number;
}) {
  const {
    clientName, jobAddress, jobType, jobAcres, crewDaysNeeded,
    crewDayRate, jobTotal, pricePerAcre, targetMargin,
  } = params;

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const estimateNo = `EST-${Date.now().toString().slice(-6)}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Estimate ${estimateNo} — Noland Earthworks</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; }
    .page { max-width: 700px; margin: 0 auto; padding: 48px 40px; }
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #f97316; padding-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .logo .orange { color: #f97316; }
    .logo .sub { font-size: 11px; font-weight: 400; color: #666; margin-top: 2px; }
    .est-meta { text-align: right; }
    .est-meta .est-no { font-size: 18px; font-weight: 700; color: #f97316; }
    .est-meta .est-date { font-size: 12px; color: #666; margin-top: 2px; }
    /* Client info */
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #f97316; margin-bottom: 8px; }
    .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-block p { font-size: 13px; color: #333; margin-top: 2px; }
    /* Line items */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #f97316; color: #fff; font-size: 11px; font-weight: 600; text-align: left; padding: 8px 12px; }
    .items-table td { font-size: 12px; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    .items-table tr:nth-child(even) td { background: #fafafa; }
    .items-table td.right { text-align: right; font-weight: 600; }
    /* Totals */
    .totals { margin-left: auto; width: 280px; margin-bottom: 32px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
    .totals-row.total { font-weight: 800; font-size: 16px; border-bottom: none; border-top: 2px solid #f97316; padding-top: 10px; margin-top: 4px; }
    .totals-row.total span:last-child { color: #f97316; }
    /* Footer */
    .footer { border-top: 1px solid #e5e5e5; padding-top: 20px; font-size: 11px; color: #888; }
    .footer strong { color: #333; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">
      <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/S4PPJthPzHXph6Nqq4scSB/noland-earthworks-logo_3844d4ef.jpg" alt="Noland Earthworks" style="height:64px;width:auto;object-fit:contain;" />
    </div>
    <div class="est-meta">
      <div class="est-no">${estimateNo}</div>
      <div class="est-date">Date: ${today}</div>
      <div class="est-date">Valid for 30 days</div>
    </div>
  </div>

  <div class="client-grid">
    <div class="info-block">
      <div class="section-title">Prepared For</div>
      <p><strong>${clientName || "Client Name"}</strong></p>
      <p>${jobAddress || "Job Site Address"}</p>
    </div>
    <div class="info-block">
      <div class="section-title">Prepared By</div>
      <p><strong>Noland Earthworks, LLC</strong></p>
      <p>Evergreen, CO</p>
    </div>
  </div>

  <div class="section-title">Scope of Work</div>
  <table class="items-table" style="margin-top: 8px;">
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${jobType}</td>
        <td>${crewDaysNeeded}</td>
        <td>Crew-Day</td>
        <td class="right">$${crewDayRate.toFixed(0)}</td>
        <td class="right">$${jobTotal.toFixed(0)}</td>
      </tr>
      <tr>
        <td colspan="4" style="font-size:11px; color:#888;">
          ${jobAcres} acres @ $${pricePerAcre.toFixed(0)}/acre — ${targetMargin}% margin included
        </td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>$${jobTotal.toFixed(0)}</span></div>
    <div class="totals-row"><span>Tax (0%)</span><span>$0</span></div>
    <div class="totals-row total"><span>Total</span><span>$${jobTotal.toFixed(0)}</span></div>
  </div>

  <div class="footer">
    <p><strong>Terms:</strong> 50% deposit required to schedule. Balance due upon completion.</p>
    <p style="margin-top:6px;"><strong>Note:</strong> This estimate is based on ${jobAcres} acres requiring ${crewDaysNeeded} crew-days. Final invoice may vary based on actual site conditions.</p>
    <p style="margin-top:6px;">Questions? Contact us at <strong>quotes@bearclawland.com</strong></p>
  </div>
</div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { toast.error("Could not generate PDF"); return; }
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 400);
}

export default function Pricing() {
  const [crewSize, setCrewSize] = useState(3);
  const [dailyWages, setDailyWages] = useState(1200);
  const [equipmentCost, setEquipmentCost] = useState(800);
  const [fuelCost, setFuelCost] = useState(200);
  const [overhead, setOverhead] = useState(300);
  const [targetMargin, setTargetMargin] = useState(35);
  const [jobAcres, setJobAcres] = useState(10);
  const [crewDaysNeeded, setCrewDaysNeeded] = useState(2);
  const [clientName, setClientName] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [jobType, setJobType] = useState("Land Clearing");

  const totalDailyCost = dailyWages + equipmentCost + fuelCost + overhead;
  const crewDayRate = totalDailyCost / (1 - targetMargin / 100);
  const jobTotal = crewDayRate * crewDaysNeeded;
  const pricePerAcre = jobTotal / jobAcres;
  const jobProfit = jobTotal - totalDailyCost * crewDaysNeeded;

  const InputRow = ({
    label, value, onChange, prefix = "$", min = 0, max = 10000, step = 50, hint,
  }: {
    label: string; value: number; onChange: (v: number) => void;
    prefix?: string; min?: number; max?: number; step?: number; hint?: string;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {hint && (
          <div className="group relative">
            <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
            <div className="absolute left-5 top-0 w-48 bg-popover border border-border rounded-md p-2 text-[10px] text-muted-foreground hidden group-hover:block z-10 shadow-xl">
              {hint}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-24 bg-secondary/50 border border-border rounded-md px-2 py-1 text-xs text-right text-foreground ops-metric-value outline-none focus:border-primary/50 transition-colors"
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Pricing Calculator" subtitle="Crew-Day Rate & Job Estimator">
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Cost inputs */}
          <div className="ops-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-md bg-primary/10">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Daily Cost Inputs
                </h3>
                <p className="text-xs text-muted-foreground">Your actual costs per crew-day</p>
              </div>
            </div>
            <InputRow label="Crew Wages (total/day)" value={dailyWages} onChange={setDailyWages} hint="Total wages for all crew members for one full day" />
            <InputRow label="Equipment Cost (day)" value={equipmentCost} onChange={setEquipmentCost} hint="Depreciation + maintenance per day of use" />
            <InputRow label="Fuel & Consumables" value={fuelCost} onChange={setFuelCost} hint="Fuel, oil, blades, and other consumables" step={25} />
            <InputRow label="Overhead Allocation" value={overhead} onChange={setOverhead} hint="Insurance, admin, marketing allocated per day" step={25} />
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Total Daily Cost</span>
              <span className="text-sm font-bold text-primary ops-metric-value">${totalDailyCost.toLocaleString()}</span>
            </div>
          </div>

          {/* Margin & job inputs */}
          <div className="space-y-4">
            <div className="ops-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-md bg-primary/10">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Margin Target
                  </h3>
                  <p className="text-xs text-muted-foreground">Set your profit margin goal</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Target Margin</span>
                <span className="text-sm font-bold text-primary ops-metric-value">{targetMargin}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                value={targetMargin}
                onChange={e => setTargetMargin(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>10%</span>
                <span>60%</span>
              </div>
            </div>

            <div className="ops-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-md bg-primary/10">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Job Estimator
                  </h3>
                  <p className="text-xs text-muted-foreground">Calculate price for a specific job</p>
                </div>
              </div>
              <InputRow label="Job Size (acres)" value={jobAcres} onChange={setJobAcres} prefix="" min={1} max={500} step={1} />
              <InputRow label="Crew-Days Needed" value={crewDaysNeeded} onChange={setCrewDaysNeeded} prefix="" min={0.5} max={30} step={0.5} />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Crew-Day Rate", value: `$${crewDayRate.toFixed(0)}`, icon: Users, sub: "per crew-day" },
            { label: "Job Total", value: `$${jobTotal.toFixed(0)}`, icon: DollarSign, sub: `${crewDaysNeeded} crew-days` },
            { label: "Price Per Acre", value: `$${pricePerAcre.toFixed(0)}`, icon: TrendingUp, sub: `${jobAcres} acres` },
            { label: "Job Profit", value: `$${jobProfit.toFixed(0)}`, icon: TrendingUp, sub: `${targetMargin}% margin` },
          ].map((result, i) => (
            <div key={i} className={cn("ops-card p-5", i === 1 && "border-primary/30 ops-orange-glow")}>
              <div className="flex items-center gap-2 mb-3">
                <result.icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{result.label}</span>
              </div>
              <div className="text-2xl font-bold text-foreground ops-metric-value">{result.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{result.sub}</div>
            </div>
          ))}
        </div>

        {/* PDF Estimate Generator */}
        <div className="ops-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-md bg-primary/10">
              <FileDown className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Generate Client Estimate
              </h3>
              <p className="text-xs text-muted-foreground">Fill in client details and export a professional PDF estimate</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Job Site Address</label>
              <input
                type="text"
                value={jobAddress}
                onChange={e => setJobAddress(e.target.value)}
                placeholder="e.g. 1234 Ranch Rd, Bastrop TX"
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Job Type</label>
              <select
                value={jobType}
                onChange={e => setJobType(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
              >
                <option>Land Clearing</option>
                <option>Forestry Mulching</option>
                <option>Brush Removal</option>
                <option>Stump Grinding</option>
                <option>Wildfire Mitigation</option>
              </select>
            </div>
          </div>

          {/* Estimate preview summary */}
          <div className="bg-secondary/30 rounded-lg p-4 mb-4 border border-border/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: "Service", value: jobType },
                { label: "Job Size", value: `${jobAcres} acres` },
                { label: "Duration", value: `${crewDaysNeeded} crew-days` },
                { label: "Total Price", value: `$${jobTotal.toFixed(0)}` },
              ].map((item, i) => (
                <div key={i}>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</div>
                  <div className={cn("text-sm font-bold mt-0.5 ops-metric-value", i === 3 ? "text-primary" : "text-foreground")}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              generateEstimatePDF({
                clientName, jobAddress, jobType, jobAcres, crewDaysNeeded,
                crewDayRate, jobTotal, pricePerAcre, jobProfit, targetMargin, totalDailyCost,
              });
              toast.success("Estimate PDF ready — check your print dialog");
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-5 py-2.5 rounded-md transition-all active:scale-[0.99]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <FileDown className="w-3.5 h-3.5" />
            Generate Estimate PDF
          </button>
          <p className="text-[11px] text-muted-foreground mt-2">
            Opens your browser's print dialog — save as PDF or print directly.
          </p>
        </div>

        {/* Pricing guide */}
        <div className="ops-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Pricing Benchmarks — Central Texas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2 pr-4">Job Type</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2 pr-4">Low</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2 pr-4">Market Rate</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2">Premium</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: "Land Clearing", low: "$400", mid: "$600", high: "$900" },
                  { type: "Forestry Mulching", low: "$500", mid: "$750", high: "$1,100" },
                  { type: "Brush Removal", low: "$300", mid: "$450", high: "$650" },
                  { type: "Stump Grinding", low: "$150", mid: "$250", high: "$400" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 text-xs font-semibold text-foreground">{row.type}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground ops-metric-value">{row.low}/ac</td>
                    <td className="py-2.5 pr-4 text-xs text-primary font-semibold ops-metric-value">{row.mid}/ac</td>
                    <td className="py-2.5 text-xs text-green-400 ops-metric-value">{row.high}/ac</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
