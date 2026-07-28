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
import { useState, useMemo } from "react";
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
  RefreshCw, ChevronRight, MapPin, Phone, Mail, User, X, Globe
} from "lucide-react";
import { WebsiteRequestsSection } from "./Quotes";

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
  depositPaidCents: number | null;
  depositPaidAt: Date | null;
  convertedJobId: number | null;
  convertedToJobAt: Date | null;
  createdAt: Date;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ quote }: { quote: NativeQuote }) {
  if (quote.convertedToJobAt) return <Badge className="bg-purple-600 text-white text-xs">Converted to Job</Badge>;
  if (quote.depositPaidAt) return <Badge className="bg-green-600 text-white text-xs">Deposit Paid</Badge>;
  if (quote.clientAction === "approved") return <Badge className="bg-emerald-600 text-white text-xs">Approved</Badge>;
  if (quote.clientAction === "declined") return <Badge className="bg-red-600 text-white text-xs">Declined</Badge>;
  if (quote.clientAction === "changes_requested") return <Badge className="bg-orange-500 text-white text-xs">Changes Requested</Badge>;
  if (quote.portalViewedAt) return <Badge className="bg-blue-500 text-white text-xs">Viewed</Badge>;
  if (quote.portalSentAt) return <Badge className="bg-sky-600 text-white text-xs">Sent</Badge>;
  if (quote.status === "web_request") return <Badge className="bg-cyan-600 text-white text-xs">Web Request</Badge>;
  if (quote.status === "invoiced") return <Badge className="bg-amber-600 text-white text-xs">Invoiced</Badge>;
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
  const duplicateMutation = trpc.nativeQuotes.duplicate.useMutation({
    onSuccess: () => { utils.nativeQuotes.list.invalidate(); toast.success("Quote duplicated"); },
    onError: (e) => toast.error("Error: " + e.message),
  });

  let lineItems: LineItem[] = [];
  try { lineItems = JSON.parse(quote.lineItems); } catch { lineItems = []; }

  const portalUrl = quote.portalToken ? `${window.location.origin}/quote/${quote.portalToken}` : null;

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

          <p className="text-[11px] text-muted-foreground">Created {new Date(quote.createdAt).toLocaleDateString()}</p>
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

// ─── Main section ─────────────────────────────────────────────────────────────
export function NativeAllQuotesSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
  const importMutation = trpc.nativeQuotes.importFromJobber.useMutation({
    onSuccess: (result) => {
      toast.success(`Imported ${result.imported} quote${result.imported !== 1 ? "s" : ""} from Jobber${result.skipped > 0 ? ` (${result.skipped} already existed, skipped)` : "."}`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const { data, isLoading, refetch, isFetching } = trpc.nativeQuotes.list.useQuery({
    search: search || undefined,
    status: statusFilter,
    limit: 100,
    offset: 0,
  });

  const quotes = (data?.quotes ?? []) as NativeQuote[];

  // Status counts
  const counts = useMemo(() => {
    const all = quotes.length;
    const webRequest = quotes.filter(q => q.status === "web_request").length;
    const draft = quotes.filter(q => q.status === "draft" && !q.portalSentAt && !q.convertedToJobAt).length;
    const sent = quotes.filter(q => q.portalSentAt && !q.clientAction && !q.convertedToJobAt && q.status !== "web_request").length;
    const approved = quotes.filter(q => q.clientAction === "approved" && !q.convertedToJobAt).length;
    const converted = quotes.filter(q => q.convertedToJobAt).length;
    return { all, webRequest, draft, sent, approved, converted };
  }, [quotes]);

  const statuses = [
    { value: "all", label: "All", count: counts.all },
    { value: "web_request", label: "Web Requests", count: counts.webRequest },
    { value: "draft", label: "Draft", count: counts.draft },
    { value: "sent", label: "Sent", count: counts.sent },
    { value: "approved", label: "Approved", count: counts.approved },
    { value: "invoiced", label: "Converted", count: counts.converted },
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
                <Badge variant="secondary" className="text-xs">{counts.all} total</Badge>
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
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                title="Import all quotes from Jobber into All Quotes"
              >
                {importMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                )}
                Import Jobber
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

          {/* Table */}
          {!isLoading && quotes.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Title</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Total</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote, idx) => (
                      <tr
                        key={quote.id}
                        onClick={() => setSelectedQuote(quote)}
                        className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer ${
                          idx % 2 === 0 ? "" : "bg-secondary/5"
                        } ${selectedQuote?.id === quote.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                      >
                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                          <div className="flex items-center gap-1.5">
                            {quote.title || "Untitled Quote"}
                            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          <div>{quote.clientName}</div>
                          {quote.propertyAddress && (
                            <div className="text-[11px] text-muted-foreground/60 truncate max-w-[160px]">{quote.propertyAddress}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <div className="flex items-center justify-end gap-1 text-foreground font-medium">
                            <DollarSign className="w-3 h-3 text-green-500" />
                            {(quote.totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge quote={quote} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {new Date(quote.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); setEditQuote(quote); }}
                              title="Edit quote"
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setSelectedQuote(quote); }}
                              title="View details"
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>{/* end left column */}

        {/* ── RIGHT: Website Requests (2/5 width on xl) — sticky ── */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-4">
            <WebsiteRequestsSection
              onBuildQuote={(prefill) => {
                setCreatePrefill({
                  clientName: prefill.clientName,
                  clientPhone: prefill.clientPhone,
                  clientEmail: prefill.clientEmail,
                  propertyAddress: prefill.clientAddress,
                  serviceType: prefill.jobType,
                  clientMessage: prefill.message,
                });
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
