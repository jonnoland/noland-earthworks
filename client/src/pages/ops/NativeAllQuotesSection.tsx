/**
 * NativeAllQuotesSection — replaces the Jobber Quotes tab.
 *
 * Features:
 *   - Paginated list with search + status filter
 *   - Create Quote modal (Jobber-style form with line items)
 *   - Edit quote inline
 *   - Duplicate quote
 *   - Delete quote
 *   - Send Portal Link (email to client)
 *   - Collect Deposit (Stripe Checkout)
 *   - Convert to Job
 *   - Portal status badges (sent / viewed / approved / declined / deposit paid)
 */
import React, { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, Copy, Send, CreditCard, Briefcase,
  Eye, CheckCircle, XCircle, DollarSign,
  FileText, ExternalLink, Sparkles, Info, AlertTriangle,
  RefreshCw, ChevronRight, MapPin, Phone, Mail, User, Users, X, Globe,
  Loader2, Clock, ChevronDown, ChevronUp, ArchiveRestore, Pencil,
  ArrowRight, Ban
} from "lucide-react";
import { MapView } from "@/components/Map";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
}

interface NativeQuote {
  id: number;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  propertyAddress: string | null;
  title: string;
  internalNotes: string | null;
  clientMessage: string | null;
  lineItems: string;
  totalCents: number;
  estimatedDuration: string | null;
  acreage: string | null;
  serviceType: string | null;
  status: string;
  portalToken: string | null;
  portalSentAt: Date | null;
  portalViewedAt: Date | null;
  clientAction: string | null;
  clientActionAt: Date | null;
  signedAt: Date | null;
  signatureDataUrl: string | null;
  signatureTypedText: string | null;
  changeRequestNote: string | null;
  changeRequestAt: Date | null;
  declineNote: string | null;
  depositPaidCents: number | null;
  depositPaidAt: Date | null;
  convertedJobId: number | null;
  convertedToJobAt: Date | null;
  createdAt: Date;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ quote }: { quote: NativeQuote }) {
  if (quote.convertedToJobAt || quote.status === "invoiced") return <Badge className="bg-purple-600 text-white text-xs">Converted to Job</Badge>;
  if (quote.depositPaidAt) return <Badge className="bg-green-600 text-white text-xs">Deposit Paid</Badge>;
  if (quote.clientAction === "approved" || quote.status === "approved") return <Badge className="bg-emerald-600 text-white text-xs">Approved</Badge>;
  if (quote.clientAction === "declined" || quote.status === "declined") return <Badge className="bg-red-600 text-white text-xs">Declined</Badge>;
  if (quote.clientAction === "changes_requested") return <Badge className="bg-orange-500 text-white text-xs">Changes Requested</Badge>;
  if (quote.status === "cancelled") return <Badge className="bg-zinc-500 text-white text-xs">Cancelled</Badge>;
  if (quote.portalViewedAt) return <Badge className="bg-blue-500 text-white text-xs">Viewed</Badge>;
  if (quote.portalSentAt || quote.status === "sent") return <Badge className="bg-sky-600 text-white text-xs">Sent</Badge>;
  if (quote.status === "web_request") return <Badge className="bg-cyan-600 text-white text-xs">Web Request</Badge>;
  return <Badge className="bg-zinc-600 text-white text-xs">Draft</Badge>;
}

// ─── Line item row editor ─────────────────────────────────────────────────────
function LineItemRow({
  item, index, onChange, onRemove
}: {
  item: LineItem;
  index: number;
  onChange: (i: number, field: keyof LineItem, val: string | number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-5">
        <Input
          placeholder="Description"
          value={item.description}
          onChange={e => onChange(index, "description", e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-sm"
        />
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          placeholder="Qty"
          value={item.qty}
          min={1}
          onChange={e => onChange(index, "qty", parseFloat(e.target.value) || 1)}
          className="bg-zinc-800 border-zinc-700 text-sm"
        />
      </div>
      <div className="col-span-3">
        <Input
          type="number"
          placeholder="Unit price"
          value={item.unitPriceCents / 100}
          min={0}
          step={0.01}
          onChange={e => onChange(index, "unitPriceCents", Math.round((parseFloat(e.target.value) || 0) * 100))}
          className="bg-zinc-800 border-zinc-700 text-sm"
        />
      </div>
      <div className="col-span-1 text-right text-sm text-amber-400 font-medium">
        ${((item.qty * item.unitPriceCents) / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}
      </div>
      <div className="col-span-1 flex justify-end">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => onRemove(index)}>
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────
const SERVICE_TYPES = [
  "Forestry Mulching", "Land Clearing", "Brush Hogging",
  "Right-of-Way Clearing", "Trail Cutting", "Lot Clearing", "Pasture Reclamation"
];

const DEFAULT_LINE_ITEMS: LineItem[] = [
  { description: "Forestry Mulching", qty: 1, unitPriceCents: 0, totalCents: 0 }
];

interface QuoteFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  propertyAddress: string;
  title: string;
  serviceType: string;
  acreage: string;
  estimatedDuration: string;
  clientMessage: string;
  internalNotes: string;
  lineItems: LineItem[];
}

function QuoteFormModal({
  open,
  onClose,
  editQuote,
  onSaved,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  editQuote?: NativeQuote | null;
  onSaved: () => void;
  prefill?: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    propertyAddress?: string;
    serviceType?: string;
    clientMessage?: string;
  };
}) {
  const utils = trpc.useUtils();

  const blankForm = (): QuoteFormData => ({
    clientName: prefill?.clientName ?? "",
    clientEmail: prefill?.clientEmail ?? "",
    clientPhone: prefill?.clientPhone ?? "",
    propertyAddress: prefill?.propertyAddress ?? "",
    title: "",
    serviceType: prefill?.serviceType ?? "Forestry Mulching",
    acreage: "",
    estimatedDuration: "",
    clientMessage: prefill?.clientMessage ?? "",
    internalNotes: "",
    lineItems: DEFAULT_LINE_ITEMS.map(li => ({ ...li })),
  });

  const [form, setForm] = useState<QuoteFormData>(() => {
    if (editQuote) {
      let items: LineItem[] = [];
      try { items = JSON.parse(editQuote.lineItems); } catch { items = []; }
      return {
        clientName: editQuote.clientName,
        clientEmail: editQuote.clientEmail ?? "",
        clientPhone: editQuote.clientPhone ?? "",
        propertyAddress: editQuote.propertyAddress ?? "",
        title: editQuote.title,
        serviceType: editQuote.serviceType ?? "Forestry Mulching",
        acreage: editQuote.acreage ?? "",
        estimatedDuration: editQuote.estimatedDuration ?? "",
        clientMessage: editQuote.clientMessage ?? "",
        internalNotes: editQuote.internalNotes ?? "",
        lineItems: items.length > 0 ? items : DEFAULT_LINE_ITEMS.map(li => ({ ...li })),
      };
    }
    return blankForm();
  });

  const totalCents = useMemo(
    () => form.lineItems.reduce((sum, li) => sum + li.qty * li.unitPriceCents, 0),
    [form.lineItems]
  );

  // ── AI Suggest ────────────────────────────────────────────────────────────
  const [aiPanel, setAiPanel] = useState<"closed" | "open" | "loading" | "result">("closed");
  const [aiTerrain, setAiTerrain] = useState("flat");
  const [aiDensity, setAiDensity] = useState("moderate");
  const [aiAccess, setAiAccess] = useState("easy");
  // Editable multipliers — override the server-computed values before applying
  const [editTerrainMult, setEditTerrainMult] = useState<string>("");
  const [editAccessMult, setEditAccessMult] = useState<string>("");
  const [copyDone, setCopyDone] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    title: string;
    estimatedDuration: string;
    clientMessage: string;
    lineItems: LineItem[];
    totalCents: number;
    belowMinimum: boolean;
    minimumJobCents: number;
    breakdown: {
      baseRatePerAcre: number;
      baseRateLow: number;
      baseRateHigh: number;
      terrainMultiplier: number;
      accessMultiplier: number;
      densityKey: string;
      acreage: number;
      rawTotalBeforeMinimum: number;
      minimumJobApplied: boolean;
      mobilizationFee: number;
    };
  } | null>(null);

  const aiSuggestMutation = trpc.nativeQuotes.aiSuggest.useMutation({
    onSuccess: (data) => {
      setAiSuggestion(data);
      setEditTerrainMult(data.breakdown.terrainMultiplier.toFixed(2));
      setEditAccessMult(data.breakdown.accessMultiplier.toFixed(2));
      setCopyDone(false);
      setAiPanel("result");
    },
    onError: (e) => {
      setAiPanel("open");
      toast.error("AI suggestion failed: " + e.message);
    },
  });

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    // Recalculate total using editable multipliers if they differ from server values
    const tMult = parseFloat(editTerrainMult) || aiSuggestion.breakdown.terrainMultiplier;
    const aMult = parseFloat(editAccessMult) || aiSuggestion.breakdown.accessMultiplier;
    const serverTMult = aiSuggestion.breakdown.terrainMultiplier;
    const serverAMult = aiSuggestion.breakdown.accessMultiplier;
    const multipliersChanged = tMult !== serverTMult || aMult !== serverAMult;
    let lineItems = aiSuggestion.lineItems;
    if (multipliersChanged && lineItems.length > 0) {
      // Scale line item prices proportionally
      const scale = (tMult * aMult) / (serverTMult * serverAMult);
      lineItems = lineItems.map(li => ({
        ...li,
        unitPriceCents: Math.round(li.unitPriceCents * scale),
        totalCents: Math.round(li.unitPriceCents * scale * li.qty),
      }));
    }
    setForm(prev => ({
      ...prev,
      title: prev.title || aiSuggestion.title,
      estimatedDuration: aiSuggestion.estimatedDuration || prev.estimatedDuration,
      clientMessage: aiSuggestion.clientMessage || prev.clientMessage,
      lineItems: lineItems.length > 0 ? lineItems : prev.lineItems,
    }));
    setAiPanel("closed");
    setAiSuggestion(null);
    toast.success("AI suggestion applied to quote");
  };

  const handleAiSuggest = () => {
    const acreage = parseFloat(form.acreage);
    if (!form.serviceType) { toast.error("Select a service type first"); return; }
    if (!form.acreage || isNaN(acreage) || acreage <= 0) { toast.error("Enter acreage first"); return; }
    setAiPanel("loading");
    aiSuggestMutation.mutate({
      serviceType: form.serviceType,
      acreage,
      terrain: aiTerrain,
      density: aiDensity,
      access: aiAccess,
      notes: form.internalNotes || undefined,
    });
  };

  const createMutation = trpc.nativeQuotes.create.useMutation({
    onSuccess: () => {
      utils.nativeQuotes.list.invalidate();
      toast.success("Quote created");
      onSaved();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const updateMutation = trpc.nativeQuotes.update.useMutation({
    onSuccess: () => {
      utils.nativeQuotes.list.invalidate();
      toast.success("Quote updated");
      onSaved();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const handleLineItemChange = (i: number, field: keyof LineItem, val: string | number) => {
    setForm(prev => {
      const items = [...prev.lineItems];
      items[i] = { ...items[i], [field]: val, totalCents: items[i].qty * items[i].unitPriceCents };
      return { ...prev, lineItems: items };
    });
  };

  const handleSubmit = () => {
    if (!form.clientName.trim()) { toast.error("Client name required"); return; }
    if (!form.title.trim()) { toast.error("Quote title required"); return; }
    const payload = {
      clientName: form.clientName,
      clientEmail: form.clientEmail || undefined,
      clientPhone: form.clientPhone || undefined,
      propertyAddress: form.propertyAddress || undefined,
      title: form.title,
      serviceType: form.serviceType || undefined,
      acreage: form.acreage || undefined,
      estimatedDuration: form.estimatedDuration || undefined,
      clientMessage: form.clientMessage || undefined,
      internalNotes: form.internalNotes || undefined,
      lineItems: form.lineItems,
      totalCents,
    };
    if (editQuote) {
      updateMutation.mutate({ id: editQuote.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-700 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-400">{editQuote ? "Edit Quote" : "New Quote"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Client info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Client Name *</Label>
              <Input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                className="bg-zinc-800 border-zinc-700" placeholder="John Smith" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Quote Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="bg-zinc-800 border-zinc-700" placeholder="Forestry Mulching — 5 Acres" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Client Email</Label>
              <Input type="email" value={form.clientEmail} onChange={e => setForm(p => ({ ...p, clientEmail: e.target.value }))}
                className="bg-zinc-800 border-zinc-700" placeholder="client@email.com" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Client Phone</Label>
              <Input value={form.clientPhone} onChange={e => setForm(p => ({ ...p, clientPhone: e.target.value }))}
                className="bg-zinc-800 border-zinc-700" placeholder="615-555-0100" />
            </div>
          </div>

          {/* Property + service */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-zinc-400 text-xs mb-1 block">Property Address</Label>
              <Input value={form.propertyAddress} onChange={e => setForm(p => ({ ...p, propertyAddress: e.target.value }))}
                className="bg-zinc-800 border-zinc-700" placeholder="123 Rural Rd, Vanleer, TN 37181" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Service Type</Label>
              <Select value={form.serviceType} onValueChange={v => setForm(p => ({ ...p, serviceType: v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-zinc-400 text-xs mb-1 block">Acreage</Label>
                <Input value={form.acreage} onChange={e => setForm(p => ({ ...p, acreage: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700" placeholder="5.2" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs mb-1 block">Est. Duration</Label>
                <Input value={form.estimatedDuration} onChange={e => setForm(p => ({ ...p, estimatedDuration: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700" placeholder="1–2 days" />
              </div>
            </div>
          </div>

          {/* AI Suggest panel */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">AI Suggest</span>
                <span className="text-xs text-zinc-500">Auto-fill line items, duration, and client message</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                onClick={() => setAiPanel(p => p === "closed" ? "open" : "closed")}
                type="button"
              >
                {aiPanel === "closed" ? "Configure" : "Hide"}
              </Button>
            </div>
            {aiPanel !== "closed" && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Terrain</Label>
                    <Select value={aiTerrain} onValueChange={setAiTerrain}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="flat">Flat</SelectItem>
                        <SelectItem value="rolling">Rolling</SelectItem>
                        <SelectItem value="steep">Steep</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Vegetation Density</Label>
                    <Select value={aiDensity} onValueChange={setAiDensity}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="heavy">Heavy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Site Access</Label>
                    <Select value={aiAccess} onValueChange={setAiAccess}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="difficult">Difficult</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Requires service type and acreage to be filled in above.</p>
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-8 text-xs"
                  onClick={handleAiSuggest}
                  disabled={aiPanel === "loading"}
                  type="button"
                >
                  {aiPanel === "loading" ? (
                    <><span className="animate-spin mr-2">&#9696;</span>Generating suggestion...</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate AI Suggestion</>
                  )}
                </Button>
              </div>
            )}

            {/* Result panel — shown after generation */}
            {aiPanel === "result" && aiSuggestion && (
              <div className="mt-3 space-y-3">
                {/* Below-minimum warning */}
                {aiSuggestion.belowMinimum && (
                  <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-300">
                      Suggested total (${(aiSuggestion.totalCents / 100).toLocaleString()}) is below the minimum job total
                      of ${(aiSuggestion.minimumJobCents / 100).toLocaleString()}. Review line items before applying.
                    </p>
                  </div>
                )}

                {/* Price breakdown with editable multipliers + copy button */}
                <div className="rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-300">How the AI calculated this price</span>
                    </div>
                    <button
                      type="button"
                      title="Copy breakdown to clipboard"
                      className="text-zinc-500 hover:text-zinc-200 transition-colors"
                      onClick={() => {
                        const tMult = parseFloat(editTerrainMult) || aiSuggestion.breakdown.terrainMultiplier;
                        const aMult = parseFloat(editAccessMult) || aiSuggestion.breakdown.accessMultiplier;
                        const text = [
                          `AI Price Breakdown`,
                          `Service: ${form.serviceType}`,
                          `Acreage: ${aiSuggestion.breakdown.acreage} acres`,
                          `Base rate range: $${aiSuggestion.breakdown.baseRateLow.toLocaleString()} – $${aiSuggestion.breakdown.baseRateHigh.toLocaleString()}/acre`,
                          `Mid-point rate: $${aiSuggestion.breakdown.baseRatePerAcre.toLocaleString()}/acre`,
                          `Terrain multiplier: x${tMult.toFixed(2)} (${aiTerrain})`,
                          `Access multiplier: x${aMult.toFixed(2)} (${aiAccess})`,
                          `Raw total: $${aiSuggestion.breakdown.rawTotalBeforeMinimum.toLocaleString()}`,
                          aiSuggestion.breakdown.minimumJobApplied ? `Minimum job applied: Yes — bumped to $${(aiSuggestion.minimumJobCents / 100).toLocaleString()}` : null,
                          `Suggested total: $${(aiSuggestion.totalCents / 100).toLocaleString()}`,
                        ].filter(Boolean).join('\n');
                        navigator.clipboard.writeText(text).then(() => {
                          setCopyDone(true);
                          setTimeout(() => setCopyDone(false), 2000);
                        });
                      }}
                    >
                      {copyDone
                        ? <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                        : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <span className="text-zinc-500">Base rate range</span>
                    <span className="text-zinc-200">${aiSuggestion.breakdown.baseRateLow.toLocaleString()} – ${aiSuggestion.breakdown.baseRateHigh.toLocaleString()}/acre</span>
                    <span className="text-zinc-500">Mid-point rate</span>
                    <span className="text-zinc-200">${aiSuggestion.breakdown.baseRatePerAcre.toLocaleString()}/acre</span>

                    {/* Editable terrain multiplier */}
                    <div className="flex items-center gap-1 text-zinc-500">
                      <span>Terrain multiplier</span>
                      <span
                        title={`How terrain difficulty affects the base rate.\n\nFlat: x1.00 (no adjustment)\nRolling: x1.10–1.20 (moderate slope, some repositioning)\nSteep: x1.30–1.50 (significant slope, slower progress, higher wear)`}
                        className="cursor-help text-zinc-600 hover:text-zinc-400"
                      >
                        <Info className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0.5"
                        max="3"
                        value={editTerrainMult}
                        onChange={e => setEditTerrainMult(e.target.value)}
                        className="w-16 h-5 text-xs bg-zinc-700 border border-zinc-600 rounded px-1 text-zinc-200 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-zinc-400">({aiTerrain})</span>
                    </div>

                    {/* Editable access multiplier */}
                    <div className="flex items-center gap-1 text-zinc-500">
                      <span>Access multiplier</span>
                      <span
                        title={`How site access affects the base rate.\n\nEasy: x1.00 (clear entry, no obstacles)\nModerate: x1.10–1.20 (narrow gate, soft ground, some maneuvering)\nDifficult: x1.25–1.40 (tight access, wet/soft soil, significant obstacles)`}
                        className="cursor-help text-zinc-600 hover:text-zinc-400"
                      >
                        <Info className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0.5"
                        max="3"
                        value={editAccessMult}
                        onChange={e => setEditAccessMult(e.target.value)}
                        className="w-16 h-5 text-xs bg-zinc-700 border border-zinc-600 rounded px-1 text-zinc-200 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-zinc-400">({aiAccess})</span>
                    </div>

                    <span className="text-zinc-500">Acreage</span>
                    <span className="text-zinc-200">{aiSuggestion.breakdown.acreage} acres</span>
                    <span className="text-zinc-500">Raw total</span>
                    <span className="text-zinc-200">${aiSuggestion.breakdown.rawTotalBeforeMinimum.toLocaleString()}</span>
                    {aiSuggestion.breakdown.minimumJobApplied && (
                      <>
                        <span className="text-zinc-500">Minimum job applied</span>
                        <span className="text-amber-400">Yes — bumped to ${(aiSuggestion.minimumJobCents / 100).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Suggested total */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-zinc-400">Suggested total</span>
                  <span className={`text-lg font-bold ${aiSuggestion.belowMinimum ? "text-red-400" : "text-amber-400"}`}>
                    ${(aiSuggestion.totalCents / 100).toLocaleString()}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold h-8 text-xs"
                    onClick={applyAiSuggestion}
                    type="button"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Apply to Quote
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-xs border-zinc-600 text-zinc-400 hover:bg-zinc-800"
                    onClick={() => { setAiPanel("open"); setAiSuggestion(null); }}
                    type="button"
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-zinc-400 text-xs">Line Items</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-600"
                onClick={() => setForm(p => ({ ...p, lineItems: [...p.lineItems, { description: "", qty: 1, unitPriceCents: 0, totalCents: 0 }] }))}>
                <Plus className="h-3 w-3 mr-1" /> Add Line
              </Button>
            </div>
            <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-zinc-500 px-1">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-3">Unit Price ($)</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1" />
            </div>
            <div className="space-y-2">
              {form.lineItems.map((li, i) => (
                <LineItemRow key={i} item={li} index={i}
                  onChange={handleLineItemChange}
                  onRemove={i2 => setForm(p => ({ ...p, lineItems: p.lineItems.filter((_, idx) => idx !== i2) }))} />
              ))}
            </div>
            <div className="flex justify-end mt-3 pr-9">
              <span className="text-sm text-zinc-400 mr-2">Total:</span>
              <span className="text-lg font-bold text-amber-400">
                ${(totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Client Message (shown on portal)</Label>
              <Textarea value={form.clientMessage} onChange={e => setForm(p => ({ ...p, clientMessage: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-sm" rows={3}
                placeholder="Thank you for the opportunity. Here is the quote for your property..." />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Internal Notes (not shown to client)</Label>
              <Textarea value={form.internalNotes} onChange={e => setForm(p => ({ ...p, internalNotes: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-sm" rows={3}
                placeholder="Steep slope on north side, gate code 1234..." />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-zinc-600" onClick={onClose}>Cancel</Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Saving..." : editQuote ? "Save Changes" : "Create Quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Send Portal dialog ───────────────────────────────────────────────────────
function SendPortalDialog({ quote, onClose }: { quote: NativeQuote; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");

  const sendMutation = trpc.nativeQuotes.sendPortal.useMutation({
    onSuccess: (data) => {
      utils.nativeQuotes.list.invalidate();
      toast.success(`Portal link sent — email sent to ${quote.clientEmail}`);
      if (data.portalUrl) {
        navigator.clipboard.writeText(data.portalUrl).catch(() => {});
      }
      onClose();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Send Portal Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-zinc-300">
            A branded email with a secure quote link will be sent to <span className="text-amber-400">{quote.clientEmail}</span>.
          </p>
          <div>
            <Label className="text-zinc-400 text-xs mb-1 block">Personal Note (optional)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-sm" rows={3}
              placeholder="Let me know if you have any questions about the scope..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-600" onClick={onClose}>Cancel</Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={() => sendMutation.mutate({ id: quote.id, personalNote: note, origin: window.location.origin })}
            disabled={sendMutation.isPending}>
            {sendMutation.isPending ? "Sending..." : "Send Portal Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Deposit dialog ───────────────────────────────────────────────────────────
function DepositDialog({ quote, onClose }: { quote: NativeQuote; onClose: () => void }) {
  const [pct, setPct] = useState(25);

  const depositMutation = trpc.nativeQuotes.createDepositSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
        toast.success("Checkout opened: Stripe checkout opened in a new tab.");
      }
      onClose();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const depositCents = Math.round(quote.totalCents * pct / 100);
  const balanceCents = quote.totalCents - depositCents;

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Collect Deposit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            {[25, 33, 50].map(p => (
              <Button key={p} size="sm" variant={pct === p ? "default" : "outline"}
                className={pct === p ? "bg-amber-500 text-black" : "border-zinc-600"}
                onClick={() => setPct(p)}>{p}%</Button>
            ))}
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-zinc-400">Quote total</span><span>${(quote.totalCents / 100).toLocaleString()}</span></div>
            <div className="flex justify-between text-amber-400 font-semibold"><span>Deposit ({pct}%)</span><span>${(depositCents / 100).toLocaleString()}</span></div>
            <div className="flex justify-between text-zinc-400"><span>Balance due on completion</span><span>${(balanceCents / 100).toLocaleString()}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-600" onClick={onClose}>Cancel</Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={() => depositMutation.mutate({ id: quote.id, depositPct: pct, origin: window.location.origin })}
            disabled={depositMutation.isPending}>
            {depositMutation.isPending ? "Creating..." : "Open Checkout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Convert to Job dialog ────────────────────────────────────────────────────
function ConvertToJobDialog({ quote, onClose }: { quote: NativeQuote; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [date, setDate] = useState("");

  const convertMutation = trpc.nativeQuotes.convertToJob.useMutation({
    onSuccess: () => {
      utils.nativeQuotes.list.invalidate();
      toast.success("Converted to job: A new job record has been created.");
      onClose();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Convert to Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-zinc-300">This will create a job record for <span className="text-amber-400">{quote.clientName}</span>.</p>
          <div>
            <Label className="text-zinc-400 text-xs mb-1 block">Scheduled Date (optional)</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-zinc-800 border-zinc-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-600" onClick={onClose}>Cancel</Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            onClick={() => convertMutation.mutate({ id: quote.id, scheduledDate: date || undefined })}
            disabled={convertMutation.isPending}>
            {convertMutation.isPending ? "Converting..." : "Convert to Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Native Quote Detail Panel ────────────────────────────────────────────────
function NativeQuoteDetailPanel({
  quote,
  onClose,
  onEdit,
  onRefresh,
}: {
  quote: NativeQuote;
  onClose: () => void;
  onEdit: (q: NativeQuote) => void;
  onRefresh: () => void;
}) {
  const utils = trpc.useUtils();
  const [showSendPortal, setShowSendPortal] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const deleteMutation = trpc.nativeQuotes.delete.useMutation({
    onSuccess: () => { utils.nativeQuotes.list.invalidate(); toast.success("Quote deleted"); onClose(); },
    onError: (e) => toast.error("Error: " + e.message),
  });
  const updateStatusMutation = trpc.nativeQuotes.update.useMutation({
    onSuccess: () => { utils.nativeQuotes.list.invalidate(); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  // Valid transitions map for the detail panel (mirrors PIPELINE_STAGES in main section)
  const PANEL_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
    web_request: [
      { value: "draft", label: "Draft" },
      { value: "declined", label: "Declined" },
      { value: "cancelled", label: "Cancelled" },
    ],
    draft: [
      { value: "sent", label: "Sent" },
      { value: "declined", label: "Declined" },
      { value: "cancelled", label: "Cancelled" },
    ],
    sent: [
      { value: "approved", label: "Approved" },
      { value: "declined", label: "Declined" },
      { value: "cancelled", label: "Cancelled" },
    ],
    approved: [
      { value: "invoiced", label: "Invoiced" },
      { value: "cancelled", label: "Cancelled" },
    ],
    invoiced: [],
    declined: [{ value: "draft", label: "Restore to Draft" }],
    cancelled: [{ value: "draft", label: "Restore to Draft" }],
  };

  // Derive current stage key for the panel
  const panelStageKey = (() => {
    if (quote.convertedToJobAt) return "invoiced";
    if (quote.clientAction === "declined") return "declined";
    if (quote.status === "cancelled") return "cancelled";
    if (quote.clientAction === "approved" || quote.depositPaidAt) return "approved";
    if (quote.portalSentAt) return "sent";
    if (quote.status === "web_request") return "web_request";
    return "draft";
  })();

  const panelValidTransitions = PANEL_TRANSITIONS[panelStageKey] ?? [];

  const duplicateMutation = trpc.nativeQuotes.duplicate.useMutation({
    onSuccess: () => { utils.nativeQuotes.list.invalidate(); toast.success("Quote duplicated"); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  let lineItems: LineItem[] = [];
  try { lineItems = JSON.parse(quote.lineItems); } catch { lineItems = []; }

  const portalUrl = quote.portalToken ? `${window.location.origin}/quote/${quote.portalToken}` : null;

  // ── Satellite imagery ─────────────────────────────────────────────────────
  const { data: satData, isLoading: satLoading } = trpc.ops.quotes.satelliteImage.useQuery(
    { address: quote.propertyAddress! },
    { enabled: !!quote.propertyAddress, staleTime: 1000 * 60 * 10 }
  );

  // ── Link to Lead ──────────────────────────────────────────────────────────
  const [showLinkLeadPicker, setShowLinkLeadPicker] = useState(false);
  const [leadPickerSearch, setLeadPickerSearch] = useState("");
  const { data: linkedLead } = trpc.ops.getLeadByNativeQuoteId.useQuery(
    { nativeQuoteId: quote.id },
    { retry: false, staleTime: 1000 * 60 * 5 }
  );
  const { data: unlinkedLeads = [] } = trpc.ops.getUnlinkedLeads.useQuery(
    undefined,
    { enabled: showLinkLeadPicker, retry: false }
  );
  const filteredLeads = (unlinkedLeads as any[]).filter((l: any) => {
    if (!leadPickerSearch) return true;
    const q = leadPickerSearch.toLowerCase();
    return (l.name ?? "").toLowerCase().includes(q) || (l.address ?? "").toLowerCase().includes(q);
  });
  const linkQuoteToLead = trpc.ops.linkNativeQuoteToLead.useMutation({
    onSuccess: () => {
      toast.success("Quote linked to lead.");
      setShowLinkLeadPicker(false);
      utils.ops.getLeadByNativeQuoteId.invalidate({ nativeQuoteId: quote.id });
      utils.ops.leads.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to link quote to lead."),
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">{quote.title}</span>
            <StatusBadge quote={quote} />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Satellite imagery strip */}
        {quote.propertyAddress && (
          <div className="relative w-full h-36 bg-secondary/20 overflow-hidden shrink-0">
            {satLoading && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading satellite view...
              </div>
            )}
            {satData?.url && (
              <>
                <img
                  src={satData.url}
                  alt={`Satellite view of ${quote.propertyAddress}`}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-black/60 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[11px] text-white/90 truncate">{quote.propertyAddress}</span>
                </div>
              </>
            )}
            {!satLoading && !satData?.url && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {quote.propertyAddress}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Web Request banner */}
          {quote.status === "web_request" && (
            <div className="rounded-lg border border-cyan-600/40 bg-cyan-950/30 p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-cyan-300 mb-0.5">Website Request</p>
                  <p className="text-xs text-muted-foreground">This came in from the website quote form. Review the details below, then convert it to a formal quote to add pricing and send the portal.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  updateStatusMutation.mutate({ id: quote.id, status: "draft" });
                  onEdit({ ...quote, status: "draft" });
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />Convert to Quote
              </button>
            </div>
          )}
          {/* Client block */}
          <div className="rounded-lg bg-secondary/30 border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Client</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{quote.clientName}</p>
            {quote.clientPhone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />{quote.clientPhone}
              </div>
            )}
            {quote.clientEmail && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />{quote.clientEmail}
              </div>
            )}
          </div>

          {/* Property */}
          {quote.propertyAddress && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              <span>{quote.propertyAddress}</span>
            </div>
          )}

          {/* Job details */}
          <div className="rounded-lg bg-secondary/30 border border-border p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Job Details</p>
            <div className="space-y-2">
              {quote.serviceType && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium text-foreground">{quote.serviceType}</span>
                </div>
              )}
              {quote.acreage && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Acreage</span>
                  <span className="font-medium text-foreground">{quote.acreage} acres</span>
                </div>
              )}
              {quote.estimatedDuration && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Est. Duration</span>
                  <span className="font-medium text-foreground">{quote.estimatedDuration}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-border pt-2 mt-1">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-primary">${(quote.totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
              </div>
              {quote.depositPaidAt && quote.depositPaidCents && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Deposit Paid</span>
                  <span className="font-medium text-green-400">${(quote.depositPaidCents / 100).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Line Items</p>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/20 border-b border-border">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit Price</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-foreground">{li.description}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{li.qty}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">${(li.unitPriceCents / 100).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-foreground">${((li.qty * li.unitPriceCents) / 100).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Client message */}
          {quote.clientMessage && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Client Message</p>
              <p className="text-xs text-muted-foreground bg-secondary/30 rounded-md p-3 whitespace-pre-wrap">{quote.clientMessage}</p>
            </div>
          )}

          {/* Internal notes */}
          {quote.internalNotes && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Internal Notes</p>
              <p className="text-xs text-muted-foreground bg-secondary/30 rounded-md p-3 whitespace-pre-wrap">{quote.internalNotes}</p>
            </div>
          )}

          {/* Change request note */}
          {quote.changeRequestNote && (
            <div className="rounded-lg border border-amber-600/40 bg-amber-950/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-amber-400 mb-1">Change Request</p>
              <p className="text-xs text-amber-200 whitespace-pre-wrap">{quote.changeRequestNote}</p>
              {quote.changeRequestAt && (
                <p className="text-[11px] text-muted-foreground mt-1">{new Date(quote.changeRequestAt).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {/* Decline note */}
          {quote.declineNote && (
            <div className="rounded-lg border border-red-600/40 bg-red-950/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Decline Reason</p>
              <p className="text-xs text-red-200 whitespace-pre-wrap">{quote.declineNote}</p>
            </div>
          )}

          {/* Signature */}
          {quote.signedAt && (
            <div className="rounded-lg border border-emerald-600/40 bg-emerald-950/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">Client Signature</p>
              {quote.signatureDataUrl && (
                <img src={quote.signatureDataUrl} alt="Client signature" className="h-14 bg-white/10 rounded p-1 mb-1" />
              )}
              {quote.signatureTypedText && (
                <p className="text-sm font-medium text-emerald-300 italic">{quote.signatureTypedText}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">Signed {new Date(quote.signedAt).toLocaleDateString()}</p>
            </div>
          )}

          {/* Portal activity */}
          {quote.portalSentAt && (
            <div className="rounded-lg bg-secondary/30 border border-border p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Portal Activity</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-sky-400">
                  <Send className="h-3 w-3" />Sent {new Date(quote.portalSentAt).toLocaleDateString()}
                </div>
                {quote.portalViewedAt && (
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <Eye className="h-3 w-3" />Viewed {new Date(quote.portalViewedAt).toLocaleDateString()}
                  </div>
                )}
                {quote.clientAction === "approved" && (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="h-3 w-3" />Approved {quote.clientActionAt ? new Date(quote.clientActionAt).toLocaleDateString() : ""}
                  </div>
                )}
                {quote.clientAction === "declined" && (
                  <div className="flex items-center gap-1.5 text-red-400">
                    <XCircle className="h-3 w-3" />Declined
                  </div>
                )}
              </div>
              {portalUrl && (
                <button
                  className="mt-2 text-[11px] text-muted-foreground hover:text-primary transition-colors underline"
                  onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success("Link copied"); }}
                >
                  Copy portal link
                </button>
              )}
            </div>
          )}

          {/* Linked lead */}
          <div>
            {linkedLead ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Linked to lead: <span className="font-medium text-foreground">{linkedLead.name}</span></span>
              </div>
            ) : (
              <button
                onClick={() => setShowLinkLeadPicker(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Users className="w-3.5 h-3.5" />Link to Lead
              </button>
            )}
            {showLinkLeadPicker && (
              <div className="mt-2 rounded-lg border border-border bg-card p-3 space-y-2">
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={leadPickerSearch}
                  onChange={e => setLeadPickerSearch(e.target.value)}
                  className="w-full text-xs bg-secondary/30 border border-border rounded px-2 py-1.5 outline-none focus:border-primary"
                />
                {filteredLeads.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No unlinked leads found.</p>
                )}
                {filteredLeads.slice(0, 8).map((l: any) => (
                  <button
                    key={l.id}
                    onClick={() => linkQuoteToLead.mutate({ leadId: l.id, nativeQuoteId: quote.id, estimateAmount: quote.totalCents > 0 ? quote.totalCents / 100 : undefined })}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary/50 transition-colors"
                  >
                    <span className="font-medium text-foreground">{l.name}</span>
                    {l.address && <span className="text-muted-foreground ml-1.5">{l.address}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Lifecycle Timeline ─────────────────────────────────────────── */}
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Timeline</p>
            <ol className="relative border-l border-border/60 ml-1.5 space-y-3">
              {/* Created */}
              <li className="ml-4">
                <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-zinc-600 border-2 border-background" />
                <p className="text-[11px] font-medium text-foreground">Created</p>
                <p className="text-[10px] text-muted-foreground">{new Date(quote.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </li>
              {/* Sent */}
              {quote.portalSentAt && (
                <li className="ml-4">
                  <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-sky-500 border-2 border-background" />
                  <p className="text-[11px] font-medium text-foreground">Portal Sent</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(quote.portalSentAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </li>
              )}
              {/* Viewed */}
              {quote.portalViewedAt && (
                <li className="ml-4">
                  <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-background" />
                  <p className="text-[11px] font-medium text-foreground">Viewed by Client</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(quote.portalViewedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </li>
              )}
              {/* Changes Requested */}
              {quote.changeRequestAt && (
                <li className="ml-4">
                  <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-orange-500 border-2 border-background" />
                  <p className="text-[11px] font-medium text-foreground">Changes Requested</p>
                  {quote.changeRequestNote && <p className="text-[10px] text-muted-foreground italic">&ldquo;{quote.changeRequestNote}&rdquo;</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(quote.changeRequestAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </li>
              )}
              {/* Approved */}
              {(quote.clientAction === "approved" || quote.status === "approved") && quote.clientActionAt && (
                <li className="ml-4">
                  <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                  <p className="text-[11px] font-medium text-foreground">Approved by Client</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(quote.clientActionAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </li>
              )}
              {/* Declined */}
              {(quote.clientAction === "declined" || quote.status === "declined") && quote.clientActionAt && (
                <li className="ml-4">
                  <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-red-500 border-2 border-background" />
                  <p className="text-[11px] font-medium text-foreground">Declined by Client</p>
                  {quote.declineNote && <p className="text-[10px] text-muted-foreground italic">&ldquo;{quote.declineNote}&rdquo;</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(quote.clientActionAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </li>
              )}
              {/* Deposit Paid */}
              {quote.depositPaidAt && (
                <li className="ml-4">
                  <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                  <p className="text-[11px] font-medium text-foreground">Deposit Paid{quote.depositPaidCents ? ` — $${(quote.depositPaidCents / 100).toLocaleString()}` : ""}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(quote.depositPaidAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </li>
              )}
              {/* Converted to Job */}
              {quote.convertedToJobAt && (
                <li className="ml-4">
                  <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-purple-500 border-2 border-background" />
                  <p className="text-[11px] font-medium text-foreground">Converted to Job</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(quote.convertedToJobAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </li>
              )}
            </ol>
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-border px-5 py-4 space-y-2">
          {/* Primary actions */}
          {quote.clientEmail && !quote.convertedToJobAt && (
            <button
              onClick={() => setShowSendPortal(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />Send Portal to Client
            </button>
          )}
          {quote.totalCents > 0 && !quote.depositPaidAt && !quote.convertedToJobAt && (
            <button
              onClick={() => setShowDeposit(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />Collect Deposit
            </button>
          )}
          {(quote.clientAction === "approved" || quote.depositPaidAt) && !quote.convertedToJobAt && (
            <button
              onClick={() => setShowConvert(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" />Convert to Job
            </button>
          )}
          {portalUrl && (
            <button
              onClick={() => window.open(portalUrl, "_blank")}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-muted-foreground border border-border hover:border-primary hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />View Portal
            </button>
          )}
          {/* Restore to Draft — shown when quote is declined or cancelled */}
          {(quote.clientAction === "declined" || quote.status === "cancelled") && !quote.convertedToJobAt && (
            <button
              onClick={() => {
                updateStatusMutation.mutate({ id: quote.id, status: "draft" });
                toast.success("Quote restored to draft.");
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-amber-300 border border-amber-600/40 hover:bg-amber-950/30 transition-colors"
            >
              <ArchiveRestore className="w-3.5 h-3.5" />Restore to Draft
            </button>
          )}

          {/* Status selector — only valid next steps shown */}
          {!quote.convertedToJobAt && (
            <div className="space-y-1.5 py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground shrink-0">Current stage:</span>
                <span className="text-[11px] font-semibold text-foreground capitalize">{panelStageKey.replace(/_/g, " ")}</span>
              </div>
              {panelValidTransitions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0">Move to:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {panelValidTransitions.map(t => (
                      <button
                        key={t.value}
                        onClick={() => {
                          updateStatusMutation.mutate({ id: quote.id, status: t.value });
                          toast.success(`Moved to ${t.label}.`);
                        }}
                        disabled={updateStatusMutation.isPending}
                        className="text-[11px] px-2 py-0.5 rounded border border-border bg-secondary/40 text-foreground hover:bg-primary/20 hover:border-primary transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {panelValidTransitions.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No further transitions available.</p>
              )}
            </div>
          )}

          {/* Secondary row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-3">
              <button
                onClick={() => onEdit(quote)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />Edit
              </button>
              <button
                onClick={() => duplicateMutation.mutate({ id: quote.id })}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />Duplicate
              </button>
            </div>
            <button
              onClick={() => { if (confirm("Delete this quote?")) deleteMutation.mutate({ id: quote.id }); }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />Delete
            </button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showSendPortal && <SendPortalDialog quote={quote} onClose={() => setShowSendPortal(false)} />}
      {showDeposit && <DepositDialog quote={quote} onClose={() => setShowDeposit(false)} />}
      {showConvert && <ConvertToJobDialog quote={quote} onClose={() => setShowConvert(false)} />}
    </>
  );
}

// ─── Interactive Web Request Map ──────────────────────────────────────────────
// Replaces the static satellite thumbnail with a zoomable/pannable Google Map.
function WebReqInteractiveMap({
  lat, lng, address,
}: {
  lat?: number;
  lng?: number;
  address?: string;
}) {
  const mapRef = useRef<google.maps.Map | null>(null);
  // If no explicit pin, geocode the address to get coordinates
  const geocodeQuery = trpc.ops.quotes.satelliteImage.useQuery(
    { address: address! },
    { enabled: lat == null && !!address, retry: false, staleTime: 1000 * 60 * 30 }
  );

  const resolvedLat = lat ?? geocodeQuery.data?.lat ?? null;
  const resolvedLng = lng ?? geocodeQuery.data?.lng ?? null;

  const isResolving = lat == null && geocodeQuery.isLoading;

  if (isResolving) {
    return (
      <div className="w-full h-52 rounded bg-zinc-800 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!resolvedLat || !resolvedLng) {
    return (
      <div className="w-full h-52 rounded bg-zinc-800 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Map unavailable — no coordinates</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded overflow-hidden border border-border">
      <MapView
        className="w-full h-52"
        initialCenter={{ lat: resolvedLat, lng: resolvedLng }}
        initialZoom={17}
        onMapReady={(map) => {
          mapRef.current = map;
          // Set satellite view
          map.setMapTypeId("satellite");
          // Drop a marker at the property pin
          new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: resolvedLat, lng: resolvedLng },
            title: "Property",
          });
        }}
      />
    </div>
  );
}

// ─── Inline Web Requests Panel ──────────────────────────────────────────────
function InlineWebRequestsPanel({
  onBuildQuote,
}: {
  onBuildQuote: (prefill: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    propertyAddress?: string;
    serviceType?: string;
    clientMessage?: string;
  }) => void;
}) {
  const { data, isLoading, refetch, isFetching } = trpc.ops.quotes.list.useQuery(
    { limit: 50 },
    { retry: false }
  );
  const deleteReq = trpc.ops.quotes.delete.useMutation({
    onSuccess: () => { toast.success("Request deleted."); refetch(); },
    onError: () => toast.error("Failed to delete request."),
  });
  type WebReq = {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    service?: string | null;
    message?: string | null;
    acreage?: string | null;
    county?: string | null;
    aiScore?: string | null;
    aiSummary?: string | null;
    aiFlags?: string | null;
    estimatedRange?: string | null;
    nativeQuoteId?: number | null;
    propertyPinLat?: string | null;
    propertyPinLng?: string | null;
    createdAt: Date | string;
  };
  const list = (data ?? []) as WebReq[];
  const utils = trpc.useUtils();
  const [expandedMapId, setExpandedMapId] = useState<number | null>(null);
  // Inline estimate edit state
  const [editingEstimateId, setEditingEstimateId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const updateQuoteMutation = trpc.nativeQuotes.update.useMutation({
    onSuccess: () => {
      toast.success("Estimate updated.");
      setEditingEstimateId(null);
      utils.nativeQuotes.list.invalidate();
    },
    onError: (e) => toast.error("Update failed: " + e.message),
  });
  const handleSaveEstimate = (req: WebReq) => {
    if (!req.nativeQuoteId) return;
    const cents = Math.round(parseFloat(editPrice.replace(/[$,]/g, "")) * 100);
    if (isNaN(cents) || cents < 0) { toast.error("Enter a valid price."); return; }
    const desc = editDesc.trim() || req.service || "Forestry Mulching";
    updateQuoteMutation.mutate({
      id: req.nativeQuoteId,
      totalCents: cents,
      lineItems: [{ description: desc, qty: 1, unitPriceCents: cents, totalCents: cents }],
    });
  };

  return (
    <div className="ops-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Website Requests</h2>
          {!isLoading && list.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">{list.length}</span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-8">
          <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No website requests yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {list.map((req) => {
            const hasPin = !!req.propertyPinLat && !!req.propertyPinLng;
            const addressStr = [req.street, req.city, req.state].filter(Boolean).join(", ");
            const hasMap = hasPin || !!addressStr;
            const isMapOpen = expandedMapId === req.id;
            const isEditingEstimate = editingEstimateId === req.id;
            return (
              <div key={req.id} className="rounded-md border border-border bg-card/50 p-3 space-y-2">
                {/* Row 1: Name + AI score badge + map toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{req.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[req.service, req.county, req.acreage ? `${req.acreage} ac` : undefined].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* AI score badge — uses correct enum values: strong/marginal/weak */}
                    {req.aiScore && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                        req.aiScore === "strong"
                          ? "bg-green-500/15 text-green-400 border-green-500/25"
                          : req.aiScore === "marginal"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                          : "bg-red-500/15 text-red-400 border-red-500/25"
                      }`}>
                        {req.aiScore.charAt(0).toUpperCase() + req.aiScore.slice(1)}
                      </span>
                    )}
                    {/* AI estimate display */}
                    {req.estimatedRange && (
                      <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {req.estimatedRange}
                      </span>
                    )}
                    {/* Map toggle */}
                    {hasMap && (
                      <button
                        onClick={() => setExpandedMapId(isMapOpen ? null : req.id)}
                        className={`h-5 w-5 flex items-center justify-center rounded transition-colors ${
                          isMapOpen ? "text-primary bg-primary/15" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                        }`}
                        title={isMapOpen ? "Hide map" : "Show property map"}
                      >
                        <MapPin className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Summary — visible on card face */}
                {req.aiSummary && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-amber-500/30 pl-2">
                    {req.aiSummary}
                  </p>
                )}

                {/* Expandable interactive map */}
                {isMapOpen && hasMap && (
                  <WebReqInteractiveMap
                    lat={hasPin ? parseFloat(req.propertyPinLat!) : undefined}
                    lng={hasPin ? parseFloat(req.propertyPinLng!) : undefined}
                    address={!hasPin ? addressStr : undefined}
                  />
                )}

                {req.message && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{req.message}</p>
                )}

                {/* Inline estimate editor */}
                {isEditingEstimate && req.nativeQuoteId && (
                  <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                    <p className="text-[11px] font-semibold text-amber-400">Override AI Estimate</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Price ($)</label>
                        <Input
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          placeholder="e.g. 3500"
                          className="h-7 text-xs bg-zinc-800 border-zinc-700"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Description</label>
                        <Input
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder={req.service || "Forestry Mulching"}
                          className="h-7 text-xs bg-zinc-800 border-zinc-700"
                        />
                      </div>
                    </div>
                    <div className="flex gap-1.5 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2"
                        onClick={() => setEditingEstimateId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-6 text-xs px-2 gap-1"
                        disabled={updateQuoteMutation.isPending}
                        onClick={() => handleSaveEstimate(req)}
                      >
                        {updateQuoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                {/* Footer row: date + action buttons */}
                <div className="flex items-center justify-between pt-0.5">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {/* Edit estimate button — only shown when a native quote exists */}
                    {req.nativeQuoteId && (
                      <button
                        onClick={() => {
                          if (isEditingEstimate) {
                            setEditingEstimateId(null);
                          } else {
                            setEditingEstimateId(req.id);
                            setEditPrice("");
                            setEditDesc(req.service ?? "");
                          }
                        }}
                        className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                          isEditingEstimate ? "text-amber-400 bg-amber-400/10" : "text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10"
                        }`}
                        title="Edit estimate"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    <Button
                      size="sm"
                      className="h-6 text-xs px-2 gap-1"
                      onClick={() => onBuildQuote({
                        clientName: req.name,
                        clientPhone: req.phone ?? undefined,
                        clientEmail: req.email ?? undefined,
                        propertyAddress: [req.street, req.city].filter(Boolean).join(", ") || undefined,
                        serviceType: req.service ?? undefined,
                        clientMessage: req.message ?? undefined,
                      })}
                    >
                      <Plus className="w-3 h-3" />
                      Build Quote
                    </Button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete request from ${req.name}?`)) {
                          deleteReq.mutate({ id: req.id });
                        }
                      }}
                      disabled={deleteReq.isPending}
                      className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete request"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ─── Main section ─────────────────────────────────────────────────────────────
export function NativeAllQuotesSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // Dollar value range filter (empty string = no constraint)
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  // Date created range filter (empty string = no constraint)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<{
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    propertyAddress?: string;
    serviceType?: string;
    clientMessage?: string;
  } | undefined>(undefined);
  const [editQuote, setEditQuote] = useState<NativeQuote | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<NativeQuote | null>(null);
  // ── Stale quotes follow-up ──────────────────────────────────────────────────
  const [showStalePanel, setShowStalePanel] = useState(false);
  const [staleFollowUpDrafts, setStaleFollowUpDrafts] = useState<Record<number, string>>({});
  const [draftingFor, setDraftingFor] = useState<number | null>(null);
  const { data: staleQuotes = [] } = trpc.ops.getStaleQuotes.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const draftFollowUpMutation = trpc.ops.draftQuoteFollowUp.useMutation({
    onSuccess: (result, variables) => {
      setStaleFollowUpDrafts(prev => ({ ...prev, [variables.quoteId]: result.draft }));
      setDraftingFor(null);
    },
    onError: (err) => { toast.error(err.message); setDraftingFor(null); },
  });

  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.nativeQuotes.update.useMutation({
    onSuccess: () => { utils.nativeQuotes.list.invalidate(); },
    onError: (e) => toast.error("Failed to update status: " + e.message),
  });

  // Always fetch all quotes — pipeline stages are derived from multiple fields
  // (clientAction, portalSentAt, depositPaidAt, convertedToJobAt), not just the
  // status column. Filtering by status alone at the DB level returns wrong results
  // for Sent/Approved/Declined stages.
  const listInput = useMemo(() => {
    const base: { status: string; limit: number; offset: number; search?: string } = {
      status: "all",
      limit: 500,
      offset: 0,
    };
    if (search) base.search = search;
    return base;
  }, [search]);
  const { data, isLoading, refetch, isFetching } = trpc.nativeQuotes.list.useQuery(listInput, {
    refetchOnMount: true,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const quotes = (data?.quotes ?? []) as NativeQuote[];

  // ── Pipeline stage definitions ────────────────────────────────────────────
  // Each stage has: a key used to classify quotes, display label, color tokens,
  // the set of valid next statuses the user can move to from this stage,
  // and a contextual action label shown on the card.
  type PipelineStage = {
    key: string;
    label: string;
    description: string;
    color: string;        // Tailwind border/text accent
    bgColor: string;      // Tailwind bg accent
    badgeColor: string;   // Badge background
    nextStatuses: string[];
    actionLabel?: string;
    actionIcon?: React.ReactNode;
    terminal?: boolean;
  };

  const PIPELINE_STAGES: PipelineStage[] = [
    {
      key: "web_request",
      label: "Web Request",
      description: "Came in from the website. Review and build a formal quote.",
      color: "text-cyan-400",
      bgColor: "bg-cyan-950/30",
      badgeColor: "bg-cyan-600",
      nextStatuses: ["draft", "declined", "cancelled"],
      actionLabel: "Build Quote",
      actionIcon: <FileText className="w-3 h-3" />,
    },
    {
      key: "draft",
      label: "Draft",
      description: "Quote is being prepared. Add pricing and line items, then send.",
      color: "text-zinc-400",
      bgColor: "bg-zinc-800/30",
      badgeColor: "bg-zinc-600",
      nextStatuses: ["sent", "declined", "cancelled"],
      actionLabel: "Send to Client",
      actionIcon: <Send className="w-3 h-3" />,
    },
    {
      key: "sent",
      label: "Sent",
      description: "Portal link sent to client. Waiting for their response.",
      color: "text-sky-400",
      bgColor: "bg-sky-950/30",
      badgeColor: "bg-sky-600",
      nextStatuses: ["approved", "declined", "cancelled"],
      actionLabel: "Follow Up",
      actionIcon: <Send className="w-3 h-3" />,
    },
    {
      key: "approved",
      label: "Approved",
      description: "Client approved the quote. Collect deposit or convert to job.",
      color: "text-emerald-400",
      bgColor: "bg-emerald-950/30",
      badgeColor: "bg-emerald-600",
      nextStatuses: ["invoiced", "cancelled"],
      actionLabel: "Convert to Job",
      actionIcon: <Briefcase className="w-3 h-3" />,
    },
    {
      key: "invoiced",
      label: "Converted / Invoiced",
      description: "Job created. Invoice sent or pending.",
      color: "text-amber-400",
      bgColor: "bg-amber-950/30",
      badgeColor: "bg-amber-600",
      nextStatuses: [],
    },
    {
      key: "declined",
      label: "Declined",
      description: "Client declined. Can be restored to draft.",
      color: "text-red-400",
      bgColor: "bg-red-950/20",
      badgeColor: "bg-red-600",
      nextStatuses: ["draft"],
      terminal: true,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      description: "Quote cancelled. Can be restored to draft.",
      color: "text-zinc-500",
      bgColor: "bg-zinc-900/30",
      badgeColor: "bg-zinc-700",
      nextStatuses: ["draft"],
      terminal: true,
    },
  ];

  // Classify each quote into a pipeline stage key.
  // Uses both the status column (written by update mutation) AND the lifecycle
  // fields (clientAction, portalSentAt, depositPaidAt, convertedToJobAt) so that
  // quotes are correctly classified regardless of which path set the state.
  const getStageKey = (q: NativeQuote): string => {
    if (q.convertedToJobAt || q.status === "invoiced") return "invoiced";
    if (q.clientAction === "declined" || q.status === "declined") return "declined";
    if (q.status === "cancelled") return "cancelled";
    if (q.clientAction === "approved" || q.depositPaidAt || q.status === "approved") return "approved";
    if (q.portalSentAt || q.status === "sent") return "sent";
    if (q.status === "web_request") return "web_request";
    return "draft";
  };

  // Derived filter values
  const minCents = minValue !== "" ? Math.round(parseFloat(minValue) * 100) : null;
  const maxCents = maxValue !== "" ? Math.round(parseFloat(maxValue) * 100) : null;
  const dateFromMs = dateFrom !== "" ? new Date(dateFrom + "T00:00:00").getTime() : null;
  const dateToMs = dateTo !== "" ? new Date(dateTo + "T23:59:59").getTime() : null;

  // Group quotes by stage, applying all active filters
  const pipelineGroups = useMemo(() => {
    const groups: Record<string, NativeQuote[]> = {};
    PIPELINE_STAGES.forEach(s => { groups[s.key] = []; });
    quotes.forEach(q => {
      // Dollar value filter
      if (minCents !== null && q.totalCents < minCents) return;
      if (maxCents !== null && q.totalCents > maxCents) return;
      // Date created filter
      const createdMs = new Date(q.createdAt).getTime();
      if (dateFromMs !== null && createdMs < dateFromMs) return;
      if (dateToMs !== null && createdMs > dateToMs) return;
      const key = getStageKey(q);
      if (groups[key]) groups[key].push(q);
      else groups["draft"].push(q);
    });
    return groups;
  }, [quotes, minCents, maxCents, dateFromMs, dateToMs]);

  // Total counts for header
  const totalCount = quotes.length;
  const activeCount = quotes.filter(q => !q.convertedToJobAt && q.status !== "cancelled" && q.clientAction !== "declined").length;

  // Filter: if statusFilter is "all", show all stages; otherwise show just that stage
  const visibleStages = statusFilter === "all"
    ? PIPELINE_STAGES
    : PIPELINE_STAGES.filter(s => s.key === statusFilter);

  const statuses = [
    { value: "all", label: "All", count: totalCount },
    ...PIPELINE_STAGES.filter(s => !s.terminal).map(s => ({ value: s.key, label: s.label, count: pipelineGroups[s.key]?.length ?? 0 })),
    { value: "declined", label: "Declined", count: pipelineGroups["declined"]?.length ?? 0 },
    { value: "cancelled", label: "Cancelled", count: pipelineGroups["cancelled"]?.length ?? 0 },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* ── Two-column grid: left = Quotes table, right = Website Requests ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        {/* ── LEFT: Quotes table (3/5 width on xl) ── */}
        <div className="xl:col-span-3 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">All Quotes</h2>
              {!isLoading && (
                <Badge variant="secondary" className="text-xs">{totalCount} total · {activeCount} active</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search quotes..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-secondary/30 border-border"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => { setCreatePrefill(undefined); setShowCreate(true); }}
              >
                <Plus className="w-3.5 h-3.5" />New Quote
              </Button>
            </div>
          </div>

          {/* Status filter pills */}
          {!isLoading && (
            <div className="space-y-2">
              {/* Stage pills */}
              <div className="flex flex-wrap gap-1.5">
                {statuses.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStatusFilter(s.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      statusFilter === s.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {s.label} ({s.count})
                  </button>
                ))}
              </div>

              {/* Dollar value + date range filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Dollar value range */}
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="number"
                    min="0"
                    placeholder="Min $"
                    value={minValue}
                    onChange={e => setMinValue(e.target.value)}
                    className="w-20 h-7 text-xs bg-secondary/30 border border-border rounded px-2 outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50"
                  />
                  <span className="text-[11px] text-muted-foreground">to</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max $"
                    value={maxValue}
                    onChange={e => setMaxValue(e.target.value)}
                    className="w-20 h-7 text-xs bg-secondary/30 border border-border rounded px-2 outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Divider */}
                <span className="text-border hidden sm:inline">|</span>

                {/* Date created range */}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="h-7 text-xs bg-secondary/30 border border-border rounded px-2 outline-none focus:border-primary text-foreground"
                    title="Created from"
                  />
                  <span className="text-[11px] text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="h-7 text-xs bg-secondary/30 border border-border rounded px-2 outline-none focus:border-primary text-foreground"
                    title="Created to"
                  />
                </div>

                {/* Clear filters — only shown when any non-default filter is active */}
                {(minValue !== "" || maxValue !== "" || dateFrom !== "" || dateTo !== "") && (
                  <button
                    onClick={() => { setMinValue(""); setMaxValue(""); setDateFrom(""); setDateTo(""); }}
                    className="flex items-center gap-1 h-7 px-2 rounded text-xs text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/60 border border-border transition-colors"
                  >
                    <X className="w-3 h-3" />Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stale quotes follow-up panel */}
          {(staleQuotes as any[]).length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-card p-4">
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setShowStalePanel(p => !p)}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-foreground">Quotes Needing Follow-Up</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">{(staleQuotes as any[]).length}</span>
                </div>
                {showStalePanel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showStalePanel && (
                <div className="mt-3 space-y-3">
                  {(staleQuotes as any[]).map((q: any) => {
                    const draft = staleFollowUpDrafts[q.id];
                    return (
                      <div key={q.id} className="rounded-md bg-secondary/20 border border-border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-foreground">{q.clientName ?? `Quote #${q.id}`}</p>
                            <p className="text-[11px] text-muted-foreground">{q.service ?? "Land clearing"} &middot; {q.daysSinceSent} days since sent</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 shrink-0"
                            disabled={draftingFor === q.id}
                            onClick={() => {
                              setDraftingFor(q.id);
                              draftFollowUpMutation.mutate({
                                quoteId: q.id,
                                clientName: q.clientName ?? "there",
                                service: q.service ?? "land management",
                                acreage: q.acreage ?? undefined,
                                daysSinceSent: q.daysSinceSent,
                              });
                            }}
                          >
                            {draftingFor === q.id ? <><Loader2 className="w-3 h-3 animate-spin" />Drafting...</> : <><Sparkles className="w-3 h-3 text-orange-400" />Draft SMS</>}
                          </Button>
                        </div>
                        {draft && (
                          <div className="rounded bg-primary/5 border border-primary/20 p-2">
                            <p className="text-xs text-foreground leading-relaxed">{draft}</p>
                            <button
                              className="text-[11px] text-primary hover:text-primary/80 mt-1.5 transition-colors"
                              onClick={() => { navigator.clipboard.writeText(draft); toast.success("Copied to clipboard."); }}
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty */}
          {!isLoading && quotes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <FileText className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== "all" ? "No quotes match your filters." : "No quotes yet. Create your first quote."}
              </p>
              {!search && statusFilter === "all" && (
                <Button size="sm" className="gap-1.5" onClick={() => { setCreatePrefill(undefined); setShowCreate(true); }}>
                  <Plus className="w-3.5 h-3.5" />Create First Quote
                </Button>
              )}
            </div>
          )}

          {/* ── Pipeline view ── */}
          {!isLoading && quotes.length > 0 && (
            <div className="space-y-3">
              {visibleStages.map(stage => {
                const stageQuotes = pipelineGroups[stage.key] ?? [];
                // When filtering, skip empty stages unless it's the active filter
                if (statusFilter === "all" && stageQuotes.length === 0) return null;
                return (
                  <div key={stage.key} className={`rounded-lg border border-border overflow-hidden`}>
                    {/* Stage header */}
                    {(() => {
                      const stageTotalCents = stageQuotes.reduce((sum, q) => sum + (q.totalCents ?? 0), 0);
                      const stageTotalFormatted = stageTotalCents > 0
                        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(stageTotalCents / 100)
                        : null;
                      return (
                        <div className={`flex items-center justify-between px-4 py-2.5 border-b border-border ${stage.bgColor}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs font-semibold uppercase tracking-wider shrink-0 ${stage.color}`}>{stage.label}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0 ${stage.badgeColor}`}>{stageQuotes.length}</span>
                            {stageTotalFormatted && (
                              <span className="text-[11px] font-semibold text-foreground/80 shrink-0">{stageTotalFormatted}</span>
                            )}
                            <span className="text-[11px] text-muted-foreground hidden lg:inline truncate">{stage.description}</span>
                          </div>
                          {/* Flow arrow — shows valid next stages */}
                          {stage.nextStatuses.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                              <ArrowRight className="w-3 h-3" />
                              <span>{stage.nextStatuses.map(s => PIPELINE_STAGES.find(p => p.key === s)?.label ?? s).join(" / ")}</span>
                            </div>
                          )}
                          {stage.nextStatuses.length === 0 && !stage.terminal && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0"><CheckCircle className="w-3 h-3" />Terminal</span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Quotes in this stage */}
                    {stageQuotes.length === 0 ? (
                      <div className="px-4 py-3 text-[11px] text-muted-foreground/50 italic">No quotes in this stage.</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {stageQuotes.map(quote => {
                          const currentStage = PIPELINE_STAGES.find(s => s.key === stage.key)!;
                          const validNextStatuses = currentStage.nextStatuses;
                          return (
                            <div
                              key={quote.id}
                              className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer text-xs ${
                                selectedQuote?.id === quote.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                              }`}
                              onClick={() => setSelectedQuote(quote)}
                            >
                              {/* Quote info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-foreground truncate">{quote.title || "Untitled Quote"}</span>
                                  <span className="text-muted-foreground/40">#</span>
                                  <span className="text-muted-foreground/60 text-[11px]">{quote.id}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {quote.clientName}
                                  {quote.propertyAddress && <span className="text-muted-foreground/50"> · {quote.propertyAddress}</span>}
                                </div>
                              </div>

                              {/* Total */}
                              {quote.totalCents > 0 && (
                                <div className="shrink-0 flex items-center gap-0.5 text-foreground font-medium">
                                  <DollarSign className="w-3 h-3 text-green-500" />
                                  {(quote.totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                                </div>
                              )}

                              {/* Date */}
                              <div className="shrink-0 text-[11px] text-muted-foreground hidden md:block">
                                {new Date(quote.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </div>

                              {/* Status move dropdown — only valid next steps */}
                              {!quote.convertedToJobAt && validNextStatuses.length > 0 && (
                                <div onClick={e => e.stopPropagation()} className="shrink-0">
                                  <select
                                    defaultValue=""
                                    onChange={e => {
                                      if (!e.target.value) return;
                                      updateStatusMutation.mutate({ id: quote.id, status: e.target.value });
                                      toast.success(`Moved to ${e.target.value.replace(/_/g, " ")}`);
                                      e.target.value = "";
                                    }}
                                    disabled={updateStatusMutation.isPending}
                                    className="text-[11px] bg-secondary/40 border border-border rounded px-1.5 py-0.5 text-muted-foreground focus:outline-none focus:border-primary cursor-pointer"
                                  >
                                    <option value="">Move to…</option>
                                    {validNextStatuses.map(s => {
                                      const nextStage = PIPELINE_STAGES.find(p => p.key === s);
                                      return <option key={s} value={s}>{nextStage?.label ?? s}</option>;
                                    })}
                                  </select>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="shrink-0 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                {/* Copy portal link — only shown when a portal link exists */}
                                {quote.portalToken && (
                                  <button
                                    onClick={() => {
                                      const url = `${window.location.origin}/quote/${quote.portalToken}`;
                                      navigator.clipboard.writeText(url).then(() => {
                                        toast.success("Portal link copied to clipboard.");
                                      }).catch(() => {
                                        toast.error("Could not copy link.");
                                      });
                                    }}
                                    title="Copy portal link"
                                    className="text-sky-400 hover:text-sky-300 transition-colors p-0.5 rounded"
                                  >
                                    <Globe className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditQuote(quote)}
                                  title="Edit"
                                  className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedQuote(quote)}
                                  title="View details"
                                  className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>{/* end left column */}

        {/* ── RIGHT: Website Requests (2/5 width on xl) — sticky ── */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-4">
            <InlineWebRequestsPanel
              onBuildQuote={(prefill) => {
                setCreatePrefill(prefill);
                setShowCreate(true);
              }}
            />
          </div>
        </div>{/* end right column */}
      </div>{/* end two-column grid */}

      {/* Detail panel */}
      {selectedQuote && (
        <NativeQuoteDetailPanel
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onEdit={q => { setSelectedQuote(null); setEditQuote(q); }}
          onRefresh={refetch}
        />
      )}

      {/* Modals */}
      {showCreate && (
        <QuoteFormModal
          open
          onClose={() => { setShowCreate(false); setCreatePrefill(undefined); }}
          onSaved={() => { setShowCreate(false); setCreatePrefill(undefined); refetch(); }}
          prefill={createPrefill}
        />
      )}
      {editQuote && (
        <QuoteFormModal open editQuote={editQuote} onClose={() => setEditQuote(null)} onSaved={() => { setEditQuote(null); refetch(); }} />
      )}
    </div>
  );
}
