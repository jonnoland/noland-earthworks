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
  ChevronDown, ChevronUp, Eye, CheckCircle, XCircle, Clock, DollarSign,
  FileText, ExternalLink, Sparkles, Info, AlertTriangle
} from "lucide-react";

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
}: {
  open: boolean;
  onClose: () => void;
  editQuote?: NativeQuote | null;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();

  const blankForm = (): QuoteFormData => ({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    propertyAddress: "",
    title: "",
    serviceType: "Forestry Mulching",
    acreage: "",
    estimatedDuration: "",
    clientMessage: "",
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

// ─── Quote card ───────────────────────────────────────────────────────────────
function QuoteCard({
  quote,
  onEdit,
  onRefresh,
}: {
  quote: NativeQuote;
  onEdit: (q: NativeQuote) => void;
  onRefresh: () => void;
}) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [showSendPortal, setShowSendPortal] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showConvert, setShowConvert] = useState(false);

  const deleteMutation = trpc.nativeQuotes.delete.useMutation({
    onSuccess: () => { utils.nativeQuotes.list.invalidate(); toast.success("Quote deleted"); },
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
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-100 text-sm truncate">{quote.title}</span>
            <StatusBadge quote={quote} />
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            {quote.clientName}
            {quote.propertyAddress && <span className="ml-2 text-zinc-500">· {quote.propertyAddress}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-amber-400 font-bold text-sm">
            ${(quote.totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-zinc-500">{new Date(quote.createdAt).toLocaleDateString()}</div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-zinc-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-zinc-700 p-3 space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {quote.serviceType && <div><span className="text-zinc-500">Service:</span> <span className="text-zinc-300">{quote.serviceType}</span></div>}
            {quote.acreage && <div><span className="text-zinc-500">Acreage:</span> <span className="text-zinc-300">{quote.acreage} ac</span></div>}
            {quote.estimatedDuration && <div><span className="text-zinc-500">Est. Duration:</span> <span className="text-zinc-300">{quote.estimatedDuration}</span></div>}
            {quote.clientEmail && <div><span className="text-zinc-500">Email:</span> <span className="text-zinc-300">{quote.clientEmail}</span></div>}
            {quote.clientPhone && <div><span className="text-zinc-500">Phone:</span> <span className="text-zinc-300">{quote.clientPhone}</span></div>}
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Line Items</div>
              <div className="space-y-1">
                {lineItems.map((li, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-zinc-300">{li.description} {li.qty > 1 ? `× ${li.qty}` : ""}</span>
                    <span className="text-amber-400">${((li.qty * li.unitPriceCents) / 100).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client message */}
          {quote.clientMessage && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Client Message</div>
              <p className="text-xs text-zinc-300 bg-zinc-800 rounded p-2">{quote.clientMessage}</p>
            </div>
          )}

          {/* Internal notes */}
          {quote.internalNotes && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Internal Notes</div>
              <p className="text-xs text-zinc-400 bg-zinc-800/50 rounded p-2">{quote.internalNotes}</p>
            </div>
          )}

          {/* Portal status */}
          {quote.portalSentAt && (
            <div className="bg-zinc-800/50 rounded p-2 text-xs space-y-0.5">
              <div className="text-zinc-500 font-medium mb-1">Portal Activity</div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-sky-400"><Send className="h-3 w-3 inline mr-1" />Sent {new Date(quote.portalSentAt).toLocaleDateString()}</span>
                {quote.portalViewedAt && <span className="text-blue-400"><Eye className="h-3 w-3 inline mr-1" />Viewed {new Date(quote.portalViewedAt).toLocaleDateString()}</span>}
                {quote.clientAction === "approved" && <span className="text-emerald-400"><CheckCircle className="h-3 w-3 inline mr-1" />Approved {quote.clientActionAt ? new Date(quote.clientActionAt).toLocaleDateString() : ""}</span>}
                {quote.clientAction === "declined" && <span className="text-red-400"><XCircle className="h-3 w-3 inline mr-1" />Declined</span>}
                {quote.depositPaidAt && <span className="text-green-400"><DollarSign className="h-3 w-3 inline mr-1" />Deposit paid ${((quote.depositPaidCents ?? 0) / 100).toLocaleString()}</span>}
              </div>
              {portalUrl && (
                <button className="text-zinc-500 hover:text-zinc-300 underline mt-1 block"
                  onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success("Link copied"); }}>
                  Copy portal link
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" className="border-zinc-600 text-xs h-7" onClick={() => onEdit(quote)}>
              <Edit2 className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="outline" className="border-zinc-600 text-xs h-7" onClick={() => duplicateMutation.mutate({ id: quote.id })}>
              <Copy className="h-3 w-3 mr-1" /> Duplicate
            </Button>
            {quote.clientEmail && !quote.convertedToJobAt && (
              <Button size="sm" className="bg-sky-700 hover:bg-sky-600 text-white text-xs h-7" onClick={() => setShowSendPortal(true)}>
                <Send className="h-3 w-3 mr-1" /> Send Portal
              </Button>
            )}
            {quote.totalCents > 0 && !quote.depositPaidAt && !quote.convertedToJobAt && (
              <Button size="sm" className="bg-green-700 hover:bg-green-600 text-white text-xs h-7" onClick={() => setShowDeposit(true)}>
                <CreditCard className="h-3 w-3 mr-1" /> Collect Deposit
              </Button>
            )}
            {(quote.clientAction === "approved" || quote.depositPaidAt) && !quote.convertedToJobAt && (
              <Button size="sm" className="bg-purple-700 hover:bg-purple-600 text-white text-xs h-7" onClick={() => setShowConvert(true)}>
                <Briefcase className="h-3 w-3 mr-1" /> Convert to Job
              </Button>
            )}
            {portalUrl && (
              <Button size="sm" variant="outline" className="border-zinc-600 text-xs h-7"
                onClick={() => window.open(portalUrl, "_blank")}>
                <ExternalLink className="h-3 w-3 mr-1" /> View Portal
              </Button>
            )}
            <Button size="sm" variant="outline" className="border-red-800 text-red-400 hover:text-red-300 text-xs h-7 ml-auto"
              onClick={() => { if (confirm("Delete this quote?")) deleteMutation.mutate({ id: quote.id }); }}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showSendPortal && <SendPortalDialog quote={quote} onClose={() => setShowSendPortal(false)} />}
      {showDeposit && <DepositDialog quote={quote} onClose={() => setShowDeposit(false)} />}
      {showConvert && <ConvertToJobDialog quote={quote} onClose={() => setShowConvert(false)} />}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export function NativeAllQuotesSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editQuote, setEditQuote] = useState<NativeQuote | null>(null);

  const { data, isLoading, refetch } = trpc.nativeQuotes.list.useQuery({
    search: search || undefined,
    status: statusFilter,
    limit: 100,
    offset: 0,
  });

  const quotes = (data?.quotes ?? []) as NativeQuote[];

  // Status counts
  const counts = useMemo(() => {
    const all = quotes.length;
    const draft = quotes.filter(q => !q.portalSentAt && !q.convertedToJobAt).length;
    const sent = quotes.filter(q => q.portalSentAt && !q.clientAction && !q.convertedToJobAt).length;
    const approved = quotes.filter(q => q.clientAction === "approved" && !q.convertedToJobAt).length;
    const converted = quotes.filter(q => q.convertedToJobAt).length;
    return { all, draft, sent, approved, converted };
  }, [quotes]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search quotes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All ({counts.all})</SelectItem>
            <SelectItem value="draft">Draft ({counts.draft})</SelectItem>
            <SelectItem value="sent">Sent ({counts.sent})</SelectItem>
            <SelectItem value="approved">Approved ({counts.approved})</SelectItem>
            <SelectItem value="invoiced">Converted ({counts.converted})</SelectItem>
          </SelectContent>
        </Select>
        <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Quote
        </Button>
      </div>

      {/* Quote list */}
      {isLoading ? (
        <div className="text-center text-zinc-500 py-12">Loading quotes...</div>
      ) : quotes.length === 0 ? (
        <div className="text-center text-zinc-500 py-12">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No quotes found.</p>
          <Button className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create First Quote
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map(q => (
            <QuoteCard key={q.id} quote={q} onEdit={q2 => setEditQuote(q2)} onRefresh={refetch} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <QuoteFormModal open onClose={() => setShowCreate(false)} onSaved={() => setShowCreate(false)} />
      )}
      {editQuote && (
        <QuoteFormModal open editQuote={editQuote} onClose={() => setEditQuote(null)} onSaved={() => setEditQuote(null)} />
      )}
    </div>
  );
}
