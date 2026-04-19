/**
 * Pricing Page — Noland Earthworks Ops Dashboard
 * Full-featured Crew-Day Pricing Calculator
 * Edit Pricing modal: Labor, Equipment (add/remove), Fuel, Wear & Consumables,
 * Monthly Overhead (dropdown presets + custom), Scheduling & Margin
 * Default values calibrated to Middle & West Tennessee market (Apr 2026)
 */

import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Calculator, DollarSign, Users, Clock, TrendingUp, Info,
  FileDown, Settings, Plus, Trash2, X, ChevronDown,
  MapPin, Navigation, AlertTriangle, Save, CheckCircle,
  RefreshCw, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { loadMapScript } from "@/components/Map";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EquipmentItem {
  id: string;
  name: string;
  monthlyCost: number;
}

interface OverheadItem {
  id: string;
  name: string;
  monthlyCost: number;
}

interface PricingConfig {
  hoursPerDay: number;
  crewMembers: number;
  wagePerHour: number;
  burdenPct: number;
  equipment: EquipmentItem[];
  machineBurnRateGPH: number;
  fuelPricePerGallon: number;
  truckFuelPerDay: number;
  teethCostPerSet: number;
  daysPerSet: number;
  annualMajorWear: number;
  miscConsumablesPerDay: number;
  overheadItems: OverheadItem[];
  workingDaysPerMonth: number;
  targetMarginPct: number;
  acresPerDay: number;
}

// ─── Overhead presets — costs calibrated to Middle/West Tennessee (Apr 2026) ──
const OVERHEAD_PRESETS: { label: string; defaultCost: number }[] = [
  { label: "Equipment Loan / Lease Payment", defaultCost: 2200 },
  { label: "Truck / Trailer Payment", defaultCost: 1400 },
  { label: "Commercial General Liability Insurance", defaultCost: 600 },
  { label: "Equipment Insurance (Inland Marine)", defaultCost: 325 },
  { label: "Workers Comp Insurance", defaultCost: 450 },
  { label: "Business Phone / Cell Plan", defaultCost: 110 },
  { label: "Software Subscriptions (CRM, Quoting, Accounting)", defaultCost: 225 },
  { label: "Website Hosting / Marketing Tools", defaultCost: 150 },
  { label: "Google Ads / ClickGrow Budget", defaultCost: 600 },
  { label: "Shop / Storage Rent", defaultCost: 400 },
  { label: "Accounting / Bookkeeping", defaultCost: 200 },
  { label: "Business Licenses & Permits", defaultCost: 50 },
  { label: "Trailer Maintenance & Tires", defaultCost: 100 },
  { label: "Truck Maintenance & Repairs", defaultCost: 300 },
  { label: "Safety Equipment (PPE, First Aid)", defaultCost: 50 },
  { label: "DOT Compliance / IFTA Filing", defaultCost: 40 },
  { label: "Tax Preparation / CPA Fees", defaultCost: 125 },
  { label: "Custom Item", defaultCost: 0 },
];

// ─── Default config — Middle/West Tennessee market rates (Apr 2026) ───────────
const DEFAULT_CONFIG: PricingConfig = {
  hoursPerDay: 8,
  crewMembers: 1,
  wagePerHour: 28,
  burdenPct: 25,
  equipment: [
    { id: "default-cat-299d3", name: "CAT 299D3 XE", monthlyCost: 2200 },
  ],
  machineBurnRateGPH: 7,
  fuelPricePerGallon: 5.33,
  truckFuelPerDay: 65,
  teethCostPerSet: 2200,
  daysPerSet: 12,
  annualMajorWear: 18000,
  miscConsumablesPerDay: 35,
  overheadItems: [],
  workingDaysPerMonth: 20,
  targetMarginPct: 30,
  acresPerDay: 1,
};

// ─── PDF generation ───────────────────────────────────────────────────────────

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
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #f97316; padding-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .est-meta { text-align: right; }
    .est-meta .est-no { font-size: 18px; font-weight: 700; color: #f97316; }
    .est-meta .est-date { font-size: 12px; color: #666; margin-top: 2px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #f97316; margin-bottom: 8px; }
    .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-block p { font-size: 13px; color: #333; margin-top: 2px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #f97316; color: #fff; font-size: 11px; font-weight: 600; text-align: left; padding: 8px 12px; }
    .items-table td { font-size: 12px; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    .items-table tr:nth-child(even) td { background: #fafafa; }
    .items-table td.right { text-align: right; font-weight: 600; }
    .totals { margin-left: auto; width: 280px; margin-bottom: 32px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
    .totals-row.total { font-weight: 800; font-size: 16px; border-bottom: none; border-top: 2px solid #f97316; padding-top: 10px; margin-top: 4px; }
    .totals-row.total span:last-child { color: #f97316; }
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
      <p>Middle &amp; West Tennessee</p>
    </div>
  </div>
  <div class="section-title">Scope of Work</div>
  <table class="items-table" style="margin-top: 8px;">
    <thead>
      <tr><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th></tr>
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
    <p style="margin-top:6px;">Questions? Contact us at <strong>jonnoland@nolandearthworks.com</strong></p>
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
  if (!doc) return;
  doc.open(); doc.write(html); doc.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 400);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NumInput({
  value, onChange, min = 0, max = 999999, step = 1, className = "",
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; className?: string;
}) {
  return (
    <input
      type="number"
      value={value === 0 ? "" : value}
      placeholder="0"
      onChange={e => onChange(Number(e.target.value))}
      min={min} max={max} step={step}
      className={cn(
        "bg-[#1a1a1a] border border-white/10 rounded-md px-2 py-1.5 text-xs text-right text-white outline-none focus:border-orange-500/60 transition-colors w-full",
        className,
      )}
    />
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-xs text-white/60">{children}</span>
      {hint && (
        <div className="group relative">
          <Info className="w-3 h-3 text-white/30 cursor-help" />
          <div className="absolute left-5 top-0 w-48 bg-[#1a1a1a] border border-white/10 rounded-md p-2 text-[10px] text-white/60 hidden group-hover:block z-50 shadow-xl">
            {hint}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, color = "text-orange-400" }: { label: string; color?: string }) {
  return <div className={cn("text-sm font-bold mb-3", color)}>{label}</div>;
}

// ─── Edit Pricing Modal ───────────────────────────────────────────────────────

function EditPricingModal({
  config, onSave, onClose,
}: {
  config: PricingConfig;
  onSave: (c: PricingConfig) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<PricingConfig>(JSON.parse(JSON.stringify(config)));
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [presetPrice, setPresetPrice] = useState(0);

  const set = <K extends keyof PricingConfig>(key: K, val: PricingConfig[K]) =>
    setDraft(d => ({ ...d, [key]: val }));

  // Derived for live preview inside modal
  const laborCostPerDay = draft.hoursPerDay * draft.crewMembers * draft.wagePerHour * (1 + draft.burdenPct / 100);
  const equipCostPerDay = draft.workingDaysPerMonth > 0
    ? draft.equipment.reduce((s, e) => s + e.monthlyCost, 0) / draft.workingDaysPerMonth : 0;
  const fuelCostPerDay = draft.machineBurnRateGPH * draft.hoursPerDay * draft.fuelPricePerGallon + draft.truckFuelPerDay;
  const teethPerDay = draft.daysPerSet > 0 ? draft.teethCostPerSet / draft.daysPerSet : 0;
  const wearPerDay = teethPerDay + draft.annualMajorWear / (draft.workingDaysPerMonth * 12 || 1) + draft.miscConsumablesPerDay;
  const overheadPerDay = draft.workingDaysPerMonth > 0
    ? draft.overheadItems.reduce((s, o) => s + o.monthlyCost, 0) / draft.workingDaysPerMonth : 0;
  const totalDailyCost = laborCostPerDay + equipCostPerDay + fuelCostPerDay + wearPerDay + overheadPerDay;
  const crewDayRate = totalDailyCost / (1 - draft.targetMarginPct / 100);
  const pricePerAcre = draft.acresPerDay > 0 ? crewDayRate / draft.acresPerDay : 0;

  // Equipment helpers
  const addEquipment = () =>
    setDraft(d => ({ ...d, equipment: [...d.equipment, { id: crypto.randomUUID(), name: "New Equipment", monthlyCost: 0 }] }));
  const removeEquipment = (id: string) =>
    setDraft(d => ({ ...d, equipment: d.equipment.filter(e => e.id !== id) }));
  const updateEquipment = (id: string, field: "name" | "monthlyCost", val: string | number) =>
    setDraft(d => ({ ...d, equipment: d.equipment.map(e => e.id === id ? { ...e, [field]: val } : e) }));

  // Overhead helpers
  const addOverheadFromPreset = () => {
    if (!selectedPreset) return;
    const preset = OVERHEAD_PRESETS.find(p => p.label === selectedPreset);
    if (!preset) return;
    const name = preset.label === "Custom Item" ? (customItemName.trim() || "Custom Item") : preset.label;
    setDraft(d => ({ ...d, overheadItems: [...d.overheadItems, { id: crypto.randomUUID(), name, monthlyCost: presetPrice }] }));
    setSelectedPreset(""); setCustomItemName(""); setPresetPrice(0);
  };
  const removeOverhead = (id: string) =>
    setDraft(d => ({ ...d, overheadItems: d.overheadItems.filter(o => o.id !== id) }));
  const updateOverhead = (id: string, field: keyof OverheadItem, val: string | number) =>
    setDraft(d => ({ ...d, overheadItems: d.overheadItems.map(o => o.id === id ? { ...o, [field]: val } : o) }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-white">Edit Pricing</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* LABOR */}
          <div>
            <SectionHeader label="Labor" color="text-orange-400" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel hint="Total hours worked per day">Hours Per Day</FieldLabel>
                <NumInput value={draft.hoursPerDay} onChange={v => set("hoursPerDay", v)} min={1} max={24} step={1} />
              </div>
              <div>
                <FieldLabel hint="Number of operators">Crew Members</FieldLabel>
                <NumInput value={draft.crewMembers} onChange={v => set("crewMembers", v)} min={1} max={20} step={1} />
              </div>
              <div>
                <FieldLabel hint="Operator wage before burden">Wage Per Hour</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/40">$</span>
                  <NumInput value={draft.wagePerHour} onChange={v => set("wagePerHour", v)} step={0.5} />
                  <span className="text-xs text-white/40">/hr</span>
                </div>
              </div>
              <div>
                <FieldLabel hint="Payroll taxes, WC, benefits as % of wage">Burden %</FieldLabel>
                <div className="flex items-center gap-1">
                  <NumInput value={draft.burdenPct} onChange={v => set("burdenPct", v)} max={100} step={1} />
                  <span className="text-xs text-white/40">%</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-white/40">
              Labor/day: <span className="text-orange-400 font-semibold">${laborCostPerDay.toFixed(2)}</span>
            </div>
          </div>

          {/* EQUIPMENT */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader label="Equipment" color="text-green-400" />
              <button onClick={addEquipment} className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 transition-colors">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {draft.equipment.length === 0 && (
              <p className="text-xs text-white/30 italic">No equipment added.</p>
            )}
            {draft.equipment.map(eq => (
              <div key={eq.id} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={eq.name}
                  onChange={e => updateEquipment(eq.id, "name", e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-orange-500/60 transition-colors"
                  placeholder="Equipment name"
                />
                <div className="flex items-center gap-1 w-28 shrink-0">
                  <span className="text-xs text-white/40">$</span>
                  <NumInput value={eq.monthlyCost} onChange={v => updateEquipment(eq.id, "monthlyCost", v)} step={50} />
                </div>
                <span className="text-[11px] text-white/40 shrink-0">/mo</span>
                <button onClick={() => removeEquipment(eq.id)} className="text-white/30 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {draft.equipment.length > 0 && (
              <div className="text-[11px] text-white/40 mt-1">
                Equipment/day: <span className="text-green-400 font-semibold">${equipCostPerDay.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* FUEL */}
          <div>
            <SectionHeader label="Fuel" color="text-blue-400" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel hint="Gallons per hour at full load">Machine Burn Rate (GPH)</FieldLabel>
                <div className="flex items-center gap-1">
                  <NumInput value={draft.machineBurnRateGPH} onChange={v => set("machineBurnRateGPH", v)} step={0.5} />
                  <span className="text-xs text-white/40">GPH</span>
                </div>
              </div>
              <div>
                <FieldLabel hint="Current off-road diesel price">Fuel Price Per Gallon</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/40">$</span>
                  <NumInput value={draft.fuelPricePerGallon} onChange={v => set("fuelPricePerGallon", v)} step={0.05} />
                  <span className="text-xs text-white/40">/gal</span>
                </div>
              </div>
              <div className="col-span-2">
                <FieldLabel hint="Estimated daily truck fuel cost for travel">Truck Fuel Per Day</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/40">$</span>
                  <NumInput value={draft.truckFuelPerDay} onChange={v => set("truckFuelPerDay", v)} step={5} />
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-white/40">
              Fuel/day: <span className="text-blue-400 font-semibold">${fuelCostPerDay.toFixed(2)}</span>
            </div>
          </div>

          {/* WEAR & CONSUMABLES */}
          <div>
            <SectionHeader label="Wear & Consumables" color="text-yellow-400" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel hint="Cost to replace one full set of mulcher teeth">Teeth Cost Per Set</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/40">$</span>
                  <NumInput value={draft.teethCostPerSet} onChange={v => set("teethCostPerSet", v)} step={50} />
                </div>
              </div>
              <div>
                <FieldLabel hint="Working days a set of teeth lasts">Days Per Set</FieldLabel>
                <NumInput value={draft.daysPerSet} onChange={v => set("daysPerSet", v)} min={1} max={365} step={1} />
              </div>
              <div>
                <FieldLabel hint="Annual budget for undercarriage, hydraulics, drum, tracks">Annual Major Wear</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/40">$</span>
                  <NumInput value={draft.annualMajorWear} onChange={v => set("annualMajorWear", v)} step={500} />
                </div>
              </div>
              <div>
                <FieldLabel hint="Grease, DEF, filters, and daily consumables">Misc Consumables/Day</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/40">$</span>
                  <NumInput value={draft.miscConsumablesPerDay} onChange={v => set("miscConsumablesPerDay", v)} step={5} />
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-white/40">
              Wear/day: <span className="text-yellow-400 font-semibold">${wearPerDay.toFixed(2)}</span>
            </div>
          </div>

          {/* MONTHLY OVERHEAD */}
          <div>
            <SectionHeader label="Monthly Overhead" color="text-red-400" />
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 mb-3">
              <p className="text-[11px] text-white/40 mb-2">Select a common overhead item to add:</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedPreset}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedPreset(val);
                      const found = OVERHEAD_PRESETS.find(p => p.label === val);
                      setPresetPrice(found ? found.defaultCost : 0);
                    }}
                    className="w-full appearance-none bg-[#111] border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/60 transition-colors pr-7"
                  >
                    <option value="">-- Select item --</option>
                    {OVERHEAD_PRESETS.map(p => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
                </div>
                <button
                  onClick={addOverheadFromPreset}
                  disabled={!selectedPreset}
                  className="flex items-center gap-1 bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-orange-400 text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors shrink-0"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {selectedPreset === "Custom Item" && (
                <input
                  type="text"
                  value={customItemName}
                  onChange={e => setCustomItemName(e.target.value)}
                  placeholder="Enter custom item name..."
                  className="mt-2 w-full bg-[#111] border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/60 transition-colors placeholder:text-white/20"
                />
              )}
              {selectedPreset && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-white/40 shrink-0">Monthly cost:</span>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-xs text-white/40">$</span>
                    <input
                      type="number"
                      value={presetPrice === 0 ? "" : presetPrice}
                      placeholder="0"
                      min={0} step={50}
                      onChange={e => setPresetPrice(Number(e.target.value))}
                      className="flex-1 bg-[#111] border border-white/10 rounded-md px-2 py-1.5 text-xs text-right text-white outline-none focus:border-orange-500/60 transition-colors"
                    />
                    <span className="text-[11px] text-white/40">/mo</span>
                  </div>
                </div>
              )}
            </div>
            {draft.overheadItems.length === 0 && (
              <p className="text-xs text-white/30 italic">No overhead items added yet.</p>
            )}
            {draft.overheadItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={e => updateOverhead(item.id, "name", e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-orange-500/60 transition-colors"
                />
                <div className="flex items-center gap-1 w-28 shrink-0">
                  <span className="text-xs text-white/40">$</span>
                  <NumInput value={item.monthlyCost} onChange={v => updateOverhead(item.id, "monthlyCost", v)} step={50} />
                </div>
                <button onClick={() => removeOverhead(item.id)} className="text-white/30 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {draft.overheadItems.length > 0 && (
              <div className="text-[11px] text-white/40 mt-1">
                Overhead/day: <span className="text-red-400 font-semibold">${overheadPerDay.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* SCHEDULING & MARGIN */}
          <div>
            <SectionHeader label="Scheduling & Margin" color="text-white" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel hint="Billable working days per month">Working Days/Month</FieldLabel>
                <NumInput value={draft.workingDaysPerMonth} onChange={v => set("workingDaysPerMonth", v)} min={1} max={31} step={1} />
              </div>
              <div>
                <FieldLabel hint="Target profit margin">Target Margin %</FieldLabel>
                <div className="flex items-center gap-1">
                  <NumInput value={draft.targetMarginPct} onChange={v => set("targetMarginPct", v)} min={0} max={80} step={1} />
                  <span className="text-xs text-white/40">%</span>
                </div>
              </div>
              <div>
                <FieldLabel hint="Estimated acres you can complete per day">Acres/Day</FieldLabel>
                <NumInput value={draft.acresPerDay} onChange={v => set("acresPerDay", v)} step={0.25} />
              </div>
            </div>
          </div>

          {/* LIVE SUMMARY */}
          <div className="bg-[#1a1a1a] border border-orange-500/20 rounded-lg p-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wide font-semibold mb-3">Calculated Rates</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Total Daily Cost", value: `$${totalDailyCost.toFixed(2)}` },
                { label: "Crew-Day Rate (w/ margin)", value: `$${crewDayRate.toFixed(2)}` },
                { label: "Price Per Acre", value: draft.acresPerDay > 0 ? `$${pricePerAcre.toFixed(2)}` : "—" },
                { label: "Monthly Revenue Target", value: `$${(crewDayRate * draft.workingDaysPerMonth).toFixed(0)}` },
              ].map((r, i) => (
                <div key={i} className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-white/50">{r.label}</span>
                  <span className="text-orange-400 font-bold">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="text-xs text-white/50 hover:text-white transition-colors px-4 py-2 rounded-md border border-white/10 hover:border-white/20"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); toast.success("Pricing configuration saved"); onClose(); }}
            className="text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-white px-5 py-2 rounded-md transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing Benchmarks Card (live from DB) ────────────────────────────────────────────────────────────────────────────────

/**
 * Reads pricing benchmarks from the DB (updated by the weekly pricing agent)
 * and shows the last-run status plus a manual trigger button.
 */
function PricingBenchmarksCard() {
  const utils = trpc.useUtils();

  const { data: benchmarks = [], isLoading: benchmarksLoading } =
    trpc.agents.getPricingBenchmarks.useQuery();

  const { data: agentList = [] } = trpc.agents.list.useQuery();
  const pricingAgent = agentList.find((a: any) => a.id === "pricing_update");

  const triggerRun = trpc.agents.triggerRun.useMutation({
    onSuccess: () => {
      toast.success("Pricing research started — benchmarks will update in a moment.");
      // Poll for updated benchmarks after a short delay
      setTimeout(() => utils.agents.getPricingBenchmarks.invalidate(), 8000);
      setTimeout(() => utils.agents.list.invalidate(), 8000);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Static fallback rows shown when DB has no data yet
  const FALLBACK_ROWS = [
    { serviceType: "Land Clearing",    lowPerAcre: 400, midPerAcre: 650,  highPerAcre: 1000, researchSummary: null, lastUpdatedAt: null },
    { serviceType: "Forestry Mulching", lowPerAcre: 500, midPerAcre: 800,  highPerAcre: 1200, researchSummary: null, lastUpdatedAt: null },
    { serviceType: "Brush Removal",    lowPerAcre: 250, midPerAcre: 400,  highPerAcre: 600,  researchSummary: null, lastUpdatedAt: null },
    { serviceType: "Brush Hogging",    lowPerAcre: 75,  midPerAcre: 125,  highPerAcre: 200,  researchSummary: null, lastUpdatedAt: null },
    { serviceType: "Stump Grinding",   lowPerAcre: 75,  midPerAcre: 150,  highPerAcre: 300,  researchSummary: "Per stump. Size, root spread, and access affect cost.", lastUpdatedAt: null },
    { serviceType: "Debris Hauling",   lowPerAcre: 250, midPerAcre: 450,  highPerAcre: 750,  researchSummary: "Per load. Volume, haul distance, and dump fees are primary variables.", lastUpdatedAt: null },
  ];

  const rows = benchmarks.length > 0 ? benchmarks : FALLBACK_ROWS;
  const hasLiveData = benchmarks.length > 0;

  // Most recent lastUpdatedAt across all rows
  const lastUpdated = hasLiveData
    ? benchmarks.reduce((latest: Date | null, b: any) => {
        const d = new Date(b.lastUpdatedAt);
        return !latest || d > latest ? d : latest;
      }, null as Date | null)
    : null;

  const lastRunStatus = pricingAgent?.lastRun?.status ?? null;

  return (
    <div className="ops-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Pricing Benchmarks — Middle &amp; West Tennessee
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {hasLiveData && lastUpdated
              ? `Last updated ${lastUpdated.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} by weekly agent`
              : "Per-acre market rates — updated automatically every Sunday at 6 AM"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Agent last-run status badge */}
          {lastRunStatus === "success" && (
            <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Up to date
            </span>
          )}
          {lastRunStatus === "error" && (
            <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
              <AlertCircle className="w-2.5 h-2.5" />
              Last run failed
            </span>
          )}
          {/* Manual trigger */}
          <button
            onClick={() => triggerRun.mutate({ agentId: "pricing_update" })}
            disabled={triggerRun.isPending}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-md px-3 py-1.5 transition-all disabled:opacity-50"
            title="Run pricing research now"
          >
            {triggerRun.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <RefreshCw className="w-3 h-3" />}
            {triggerRun.isPending ? "Running..." : "Update Now"}
          </button>
        </div>
      </div>

      {/* Table */}
      {benchmarksLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      ) : (
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
              {rows.map((row: any, i: number) => (
                <tr key={i} className="border-b border-border/50 last:border-0 group">
                  <td className="py-2.5 pr-4 text-xs font-semibold text-foreground">{row.serviceType}</td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">${row.lowPerAcre.toLocaleString()}/ac</td>
                  <td className="py-2.5 pr-4 text-xs text-primary font-semibold">${row.midPerAcre.toLocaleString()}/ac</td>
                  <td className="py-2.5 text-xs text-green-400">${row.highPerAcre.toLocaleString()}/ac</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Research summaries (shown when live data exists) */}
      {hasLiveData && benchmarks.some((b: any) => b.researchSummary) && (
        <div className="mt-4 space-y-2">
          {benchmarks.filter((b: any) => b.researchSummary).map((b: any, i: number) => (
            <div key={i} className="text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground/70">{b.serviceType}:</span>{" "}
              {b.researchSummary}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-3">
        {hasLiveData
          ? "Rates are researched weekly by the pricing agent using Middle & West Tennessee market data. Actual pricing varies by terrain, density, access, and site conditions. Never quote from benchmarks alone — always conduct a site visit."
          : "Static fallback rates shown — click \"Update Now\" to run the pricing agent and pull live market data for Middle & West Tennessee."}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const [config, setConfig] = useState<PricingConfig>(() => {
    try {
      const saved = localStorage.getItem("noland_pricing_config");
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });
  const [showModal, setShowModal] = useState(false);
  const [jobAcres, setJobAcres] = useState(10);
  const [crewDaysNeeded, setCrewDaysNeeded] = useState(2);
  const [clientName, setClientName] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [jobType, setJobType] = useState("Land Clearing");

  // ─── Distance Pricing state ────────────────────────────────────────────────
  // Business origin: Vanleer, TN (Jon's base of operations)
  const ORIGIN = "Vanleer, TN 37181";
  const [distAddress, setDistAddress] = useState("");
  const [distResult, setDistResult] = useState<{
    distanceMiles: number;
    durationText: string;
    surcharge: number;
    adjustedDayRate: number;
    adjustedJobTotal: number;
    adjustedPricePerAcre: number;
  } | null>(null);
  const [distLoading, setDistLoading] = useState(false);
  const [distError, setDistError] = useState("");
  const [showSaveQuoteModal, setShowSaveQuoteModal] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  // Mobilization surcharge tiers (per crew-day)
  const MOB_TIERS = [
    { maxMiles: 30,  label: "Local (0–30 mi)",       surcharge: 0 },
    { maxMiles: 50,  label: "Near (31–50 mi)",        surcharge: 150 },
    { maxMiles: 75,  label: "Regional (51–75 mi)",    surcharge: 300 },
    { maxMiles: 100, label: "Extended (76–100 mi)",   surcharge: 500 },
    { maxMiles: 999, label: "Long-Haul (100+ mi)",    surcharge: 750 },
  ];

  const getMobTier = (miles: number) =>
    MOB_TIERS.find(t => miles <= t.maxMiles) ?? MOB_TIERS[MOB_TIERS.length - 1];

  // Initialize map once Maps API is loaded
  const initDistanceMap = useCallback(() => {
    if (!mapContainerRef.current || !window.google?.maps || mapRef.current) return;
    const map = new window.google.maps.Map(mapContainerRef.current, {
      zoom: 7,
      center: { lat: 36.25, lng: -87.5 }, // Centered on Middle TN
      mapTypeId: "roadmap",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapRef.current = map;
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: "#f97316", strokeWeight: 4 },
    });
    setMapReady(true);
  }, []);

  // Load Maps script and init map when the distance section is first rendered
  // Use the shared singleton loader from Map.tsx to prevent duplicate script injection
  useEffect(() => {
    loadMapScript()
      .then(() => initDistanceMap())
      .catch((err) => console.error("Could not load Google Maps for distance calculator:", err));
  }, [initDistanceMap]);

  // calculateDistance is defined after derived values to avoid hoisting issues — see below

  useEffect(() => {
    localStorage.setItem("noland_pricing_config", JSON.stringify(config));
  }, [config]);

  // Derived values
  const laborCostPerDay = config.hoursPerDay * config.crewMembers * config.wagePerHour * (1 + config.burdenPct / 100);
  const equipmentCostPerDay = config.workingDaysPerMonth > 0
    ? config.equipment.reduce((s, e) => s + e.monthlyCost, 0) / config.workingDaysPerMonth : 0;
  const machineFuelPerDay = config.machineBurnRateGPH * config.hoursPerDay * config.fuelPricePerGallon;
  const fuelCostPerDay = machineFuelPerDay + config.truckFuelPerDay;
  const teethCostPerDay = config.daysPerSet > 0 ? config.teethCostPerSet / config.daysPerSet : 0;
  const annualWearPerDay = config.annualMajorWear / (config.workingDaysPerMonth * 12 || 1);
  const wearCostPerDay = teethCostPerDay + annualWearPerDay + config.miscConsumablesPerDay;
  const totalMonthlyOverhead = config.overheadItems.reduce((s, o) => s + o.monthlyCost, 0);
  const overheadPerDay = config.workingDaysPerMonth > 0 ? totalMonthlyOverhead / config.workingDaysPerMonth : 0;
  const totalDailyCost = laborCostPerDay + equipmentCostPerDay + fuelCostPerDay + wearCostPerDay + overheadPerDay;
  const crewDayRate = totalDailyCost / (1 - config.targetMarginPct / 100);
  const jobTotal = crewDayRate * crewDaysNeeded;
  const pricePerAcre = jobAcres > 0 ? jobTotal / jobAcres : 0;
  const jobProfit = jobTotal - totalDailyCost * crewDaysNeeded;

  // ─── Distance calculation (uses crewDayRate, declared above) ───────────────────────────────
  const calculateDistance = async () => {
    if (!distAddress.trim()) { setDistError("Enter a job site address."); return; }
    if (!window.google?.maps) { setDistError("Map not loaded yet. Try again in a moment."); return; }
    setDistLoading(true);
    setDistError("");
    setDistResult(null);
    try {
      const svc = new window.google.maps.DirectionsService();
      const result = await svc.route({
        origin: ORIGIN,
        destination: distAddress,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      const leg = result.routes[0]?.legs[0];
      if (!leg) throw new Error("No route found.");
      const miles = (leg.distance?.value ?? 0) / 1609.344;
      const tier = getMobTier(miles);
      const adjDayRate = crewDayRate + tier.surcharge;
      const adjJobTotal = adjDayRate * crewDaysNeeded;
      setDistResult({
        distanceMiles: Math.round(miles * 10) / 10,
        durationText: leg.duration?.text ?? "",
        surcharge: tier.surcharge,
        adjustedDayRate: adjDayRate,
        adjustedJobTotal: adjJobTotal,
        adjustedPricePerAcre: jobAcres > 0 ? adjJobTotal / jobAcres : 0,
      });
      directionsRendererRef.current?.setDirections(result);
      if (!jobAddress) setJobAddress(distAddress);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not calculate route.";
      setDistError(msg.includes("ZERO_RESULTS") ? "No driving route found to that address." : msg);
    } finally {
      setDistLoading(false);
    }
  };

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
          min={min} max={max} step={step}
          className="w-24 bg-secondary/50 border border-border rounded-md px-2 py-1 text-xs text-right text-foreground outline-none focus:border-primary/50 transition-colors"
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Pricing Calculator" subtitle="Crew-Day Rate & Job Estimator">
      {showModal && (
        <EditPricingModal config={config} onSave={setConfig} onClose={() => setShowModal(false)} />
      )}

      <div className="p-6 space-y-5">

        {/* Daily Cost Breakdown */}
        <div className="ops-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Daily Cost Breakdown</h3>
                <p className="text-xs text-muted-foreground">Calculated from your pricing configuration</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-md transition-colors border border-primary/20"
            >
              <Settings className="w-3.5 h-3.5" />
              Edit Pricing
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Labor", value: laborCostPerDay, color: "text-orange-400" },
              { label: "Equipment", value: equipmentCostPerDay, color: "text-green-400" },
              { label: "Fuel", value: fuelCostPerDay, color: "text-blue-400" },
              { label: "Wear", value: wearCostPerDay, color: "text-yellow-400" },
              { label: "Overhead", value: overheadPerDay, color: "text-red-400" },
            ].map((item, i) => (
              <div key={i} className="bg-secondary/30 rounded-lg p-3 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{item.label}</div>
                <div className={cn("text-sm font-bold", item.color)}>${item.value.toFixed(0)}</div>
                <div className="text-[10px] text-muted-foreground">/day</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs font-semibold text-foreground">Total Daily Cost</span>
            <span className="text-lg font-bold text-primary">${totalDailyCost.toFixed(0)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Margin slider */}
          <div className="ops-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-md bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Margin Target</h3>
                <p className="text-xs text-muted-foreground">Set your profit margin goal</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Target Margin</span>
              <span className="text-sm font-bold text-primary">{config.targetMarginPct}%</span>
            </div>
            <input
              type="range" min={10} max={60}
              value={config.targetMarginPct}
              onChange={e => setConfig(c => ({ ...c, targetMarginPct: Number(e.target.value) }))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>10%</span><span>60%</span>
            </div>
          </div>

          {/* Job estimator */}
          <div className="ops-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-md bg-primary/10">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Job Estimator</h3>
                <p className="text-xs text-muted-foreground">Calculate price for a specific job</p>
              </div>
            </div>
            <InputRow label="Job Size (acres)" value={jobAcres} onChange={setJobAcres} prefix="" min={1} max={500} step={1} />
            <InputRow label="Crew-Days Needed" value={crewDaysNeeded} onChange={setCrewDaysNeeded} prefix="" min={0.5} max={30} step={0.5} />
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Crew-Day Rate", value: `$${crewDayRate.toFixed(0)}`, icon: Users, sub: "per crew-day" },
            { label: "Job Total", value: `$${jobTotal.toFixed(0)}`, icon: DollarSign, sub: `${crewDaysNeeded} crew-days` },
            { label: "Price Per Acre", value: `$${pricePerAcre.toFixed(0)}`, icon: TrendingUp, sub: `${jobAcres} acres` },
            { label: "Job Profit", value: `$${jobProfit.toFixed(0)}`, icon: TrendingUp, sub: `${config.targetMarginPct}% margin` },
          ].map((result, i) => (
            <div key={i} className={cn("ops-card p-5", i === 1 && "border-primary/30 ops-orange-glow")}>
              <div className="flex items-center gap-2 mb-3">
                <result.icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{result.label}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{result.value}</div>
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
              <h3 className="text-sm font-semibold text-foreground">Generate Client Estimate</h3>
              <p className="text-xs text-muted-foreground">Fill in client details and export a professional PDF estimate</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Client Name</label>
              <input
                type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Job Site Address</label>
              <input
                type="text" value={jobAddress} onChange={e => setJobAddress(e.target.value)}
                placeholder="e.g. 1234 Ranch Rd, Nashville TN"
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Job Type</label>
              <select
                value={jobType} onChange={e => setJobType(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
              >
                <option>Land Clearing</option>
                <option>Forestry Mulching</option>
                <option>Brush Removal</option>
                <option>Brush Hogging</option>
                <option>Right-of-Way Clearing</option>
                <option>Site Preparation</option>
              </select>
            </div>
          </div>

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
                  <div className={cn("text-sm font-bold mt-0.5", i === 3 ? "text-primary" : "text-foreground")}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              generateEstimatePDF({ clientName, jobAddress, jobType, jobAcres, crewDaysNeeded, crewDayRate, jobTotal, pricePerAcre, jobProfit, targetMargin: config.targetMarginPct, totalDailyCost });
              toast.success("Estimate PDF ready — check your print dialog");
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-5 py-2.5 rounded-md transition-all active:scale-[0.99]"
          >
            <FileDown className="w-3.5 h-3.5" />
            Generate Estimate PDF
          </button>
          <p className="text-[11px] text-muted-foreground mt-2">
            Opens your browser's print dialog — save as PDF or print directly.
          </p>
        </div>

        {/* Distance-Based Mobilization Pricing */}
        <div className="ops-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-md bg-primary/10">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Distance Pricing Adjustment</h3>
              <p className="text-xs text-muted-foreground">Calculates drive distance from Vanleer, TN and applies a mobilization surcharge to your crew-day rate</p>
            </div>
          </div>

          {/* Address input + Calculate button */}
          <div className="flex gap-2 mt-4 mb-5">
            <input
              type="text"
              value={distAddress}
              onChange={e => { setDistAddress(e.target.value); setDistResult(null); setDistError(""); }}
              onKeyDown={e => e.key === "Enter" && calculateDistance()}
              placeholder="Enter job site address (e.g. 1234 Hwy 46, Dickson TN)"
              className="flex-1 bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
            />
            <button
              onClick={calculateDistance}
              disabled={distLoading || !distAddress.trim()}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all whitespace-nowrap"
            >
              <Navigation className="w-3.5 h-3.5" />
              {distLoading ? "Calculating..." : "Calculate"}
            </button>
          </div>

          {/* Error */}
          {distError && (
            <div className="flex items-center gap-2 text-xs text-red-400 mb-4">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {distError}
            </div>
          )}

          {/* Map */}
          <div
            ref={mapContainerRef}
            className="w-full rounded-lg overflow-hidden mb-5"
            style={{ height: "280px", background: "#1a1a1a", border: "1px solid rgba(249,115,22,0.2)" }}
          />
          {!mapReady && (
            <p className="text-[11px] text-muted-foreground text-center -mt-4 mb-4">Loading map...</p>
          )}

          {/* Mobilization Tiers Reference Table */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mobilization Surcharge Tiers (per crew-day)</p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2 pr-4">Distance Band</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2 pr-4">Surcharge / Day</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2">Adjusted Day Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {MOB_TIERS.map((tier, i) => {
                    const isActive = distResult && getMobTier(distResult.distanceMiles).maxMiles === tier.maxMiles;
                    return (
                      <tr key={i} className={cn(
                        "border-b border-border/50 last:border-0 transition-colors",
                        isActive && "bg-primary/10",
                      )}>
                        <td className={cn("py-2.5 pr-4 text-xs font-semibold", isActive ? "text-primary" : "text-foreground")}>
                          {tier.label}
                          {isActive && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">Active</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                          {tier.surcharge === 0 ? "No surcharge" : `+$${tier.surcharge}`}
                        </td>
                        <td className="py-2.5 text-xs text-foreground">
                          ${(crewDayRate + tier.surcharge).toFixed(0)}/day
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Result summary */}
          {distResult && (
            <div className="bg-secondary/40 rounded-lg p-4 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-foreground">Distance Result</span>
                <span className="text-xs text-muted-foreground">{distResult.distanceMiles} mi &bull; {distResult.durationText} drive</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: "Drive Distance", value: `${distResult.distanceMiles} mi`, color: "text-foreground" },
                  { label: "Mob Surcharge", value: distResult.surcharge === 0 ? "None" : `+$${distResult.surcharge}/day`, color: distResult.surcharge === 0 ? "text-green-400" : "text-yellow-400" },
                  { label: "Adjusted Day Rate", value: `$${distResult.adjustedDayRate.toFixed(0)}`, color: "text-primary" },
                  { label: `Adjusted Job Total (${crewDaysNeeded} days)`, value: `$${distResult.adjustedJobTotal.toFixed(0)}`, color: "text-primary" },
                ].map((item, i) => (
                  <div key={i} className="bg-secondary/50 rounded-md p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{item.label}</div>
                    <div className={cn("text-sm font-bold", item.color)}>{item.value}</div>
                  </div>
                ))}
              </div>
              {distResult.surcharge > 0 && (
                <p className="text-[11px] text-muted-foreground mt-3">
                  Base rate ${crewDayRate.toFixed(0)}/day + ${distResult.surcharge} mobilization = <strong className="text-primary">${distResult.adjustedDayRate.toFixed(0)}/day</strong> &bull; {jobAcres} acres @ <strong className="text-primary">${distResult.adjustedPricePerAcre.toFixed(0)}/ac</strong>
                </p>
              )}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
                {savedQuoteId ? (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Quote saved &mdash;
                    <Link href="/ops/quotes" className="underline hover:text-green-300 transition-colors">View in Quotes</Link>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveQuoteModal(true)}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save as Quote
                  </button>
                )}
                <span className="text-[11px] text-muted-foreground">Saves all pricing details as a formal quote record</span>
              </div>
            </div>
          )}

          {/* Save as Quote Modal */}
          {showSaveQuoteModal && distResult && (
            <SaveQuoteModal
              distResult={distResult}
              crewDayRate={crewDayRate}
              crewDaysNeeded={crewDaysNeeded}
              jobAcres={jobAcres}
              jobType={jobType}
              jobAddress={distAddress}
              targetMarginPct={config.targetMarginPct}
              prefillClientName={clientName}
              onClose={() => setShowSaveQuoteModal(false)}
              onSaved={(id) => { setSavedQuoteId(id); setShowSaveQuoteModal(false); toast.success("Quote saved."); }}
            />
          )}
        </div>

        {/* Pricing Benchmarks — live from DB, updated by weekly agent */}
        <PricingBenchmarksCard />

      </div>
    </DashboardLayout>
  );
}

// ─── Save Quote Modal ─────────────────────────────────────────────────────────

interface SaveQuoteModalProps {
  distResult: {
    distanceMiles: number;
    durationText: string;
    surcharge: number;
    adjustedDayRate: number;
    adjustedJobTotal: number;
    adjustedPricePerAcre: number;
  };
  crewDayRate: number;
  crewDaysNeeded: number;
  jobAcres: number;
  jobType: string;
  jobAddress: string;
  targetMarginPct: number;
  prefillClientName: string;
  onClose: () => void;
  onSaved: (id: number) => void;
}

function SaveQuoteModal({
  distResult, crewDayRate, crewDaysNeeded, jobAcres,
  jobType, jobAddress, targetMarginPct, prefillClientName,
  onClose, onSaved,
}: SaveQuoteModalProps) {
  const [clientName, setClientName] = useState(prefillClientName || "");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const createMutation = trpc.ops.distanceQuotes.create.useMutation();

  const handleSave = async () => {
    if (!clientName.trim()) { toast.error("Client name is required."); return; }
    setSaving(true);
    try {
      const result = await createMutation.mutateAsync({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        jobType: jobType || "Forestry Mulching",
        jobAddress: jobAddress,
        jobAcres: Math.round(jobAcres),
        crewDaysNeeded: Math.round(crewDaysNeeded),
        notes: notes.trim() || undefined,
        distanceMiles: distResult.distanceMiles,
        driveDuration: distResult.durationText,
        baseDayRateCents: Math.round(crewDayRate * 100),
        mobSurchargeCents: Math.round(distResult.surcharge * 100),
        adjustedDayRateCents: Math.round(distResult.adjustedDayRate * 100),
        adjustedJobTotalCents: Math.round(distResult.adjustedJobTotal * 100),
        pricePerAcreCents: Math.round(distResult.adjustedPricePerAcre * 100),
        targetMarginPct: Math.round(targetMarginPct),
      });
      onSaved(result.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save quote.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-foreground">Save as Quote</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pricing summary */}
        <div className="px-5 pt-4 pb-3">
          <div className="bg-secondary/40 rounded-lg p-3 grid grid-cols-2 gap-2 text-center mb-4">
            {[
              { label: "Job Address", value: jobAddress || "—", span: true },
              { label: "Distance", value: `${distResult.distanceMiles} mi (${distResult.durationText})` },
              { label: "Mob Surcharge", value: distResult.surcharge === 0 ? "None" : `+$${distResult.surcharge}/day` },
              { label: "Adjusted Day Rate", value: `$${distResult.adjustedDayRate.toFixed(0)}/day` },
              { label: "Job Total", value: `$${distResult.adjustedJobTotal.toFixed(0)}` },
            ].map((item, i) => (
              <div key={i} className={cn("bg-secondary/50 rounded-md p-2", item.span ? "col-span-2" : "")}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{item.label}</div>
                <div className="text-xs font-semibold text-primary truncate">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Client fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Client Name <span className="text-red-400">*</span></label>
              <input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Phone</label>
                <input
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="(615) 555-0100"
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Email</label>
                <input
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Site conditions, special requirements, follow-up notes..."
                rows={3}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !clientName.trim()}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-5 py-2 rounded-md transition-all"
          >
            {saving ? "Saving..." : <><Save className="w-3.5 h-3.5" /> Save Quote</>}
          </button>
        </div>
      </div>
    </div>
  );
}
