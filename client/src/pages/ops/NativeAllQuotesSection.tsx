/**
 * NativeAllQuotesSection — the Operations quote workspace.
 *
 * Features:
 *   - Paginated list with search + status filter
 *   - Create Quote modal with line items
 *   - Edit quote inline
 *   - Duplicate quote
 *   - Delete quote
 *   - Send Portal Link (email to client)
 *   - Collect Deposit (Stripe Checkout)
 *   - Convert to Job
 *   - Portal status badges (sent / viewed / approved / declined / deposit paid)
 */
import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip as QuoteFormulaTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, Copy, Send, CreditCard, Briefcase,
  Eye, CheckCircle, XCircle, DollarSign,
  FileText, ExternalLink, Sparkles, Info, AlertTriangle,
  RefreshCw, ChevronLeft, ChevronRight, MapPin, Phone, Mail, User, Users, X, Globe,
  Loader2, Clock, ChevronDown, ChevronUp, ArchiveRestore, Pencil,
  ArrowRight, Ban, ArrowUpDown, Volume2, VolumeX, BellRing, Bell, BellOff, GripVertical, Camera, Ruler, ShieldCheck, Tractor
} from "lucide-react";
import { MapView } from "@/components/Map";
import FieldQuotesSection from "@/pages/ops/FieldQuotesSection";
import { parseStoredRangeRiskFactors, parseStoredServiceBreakdown } from "@shared/quoteServiceItemization";
import { compareQuotesByConfidence, sortWebsiteRequests, WEBSITE_REQUESTS_REFRESH_INTERVAL_MS } from "@shared/quoteRequestSorting";
import {
  getOpsBrowserNotificationPermission,
  getStoredOpsBrowserNotificationPreference,
  getStoredOpsSoundAlertPreference,
  playOpsNewRequestSound,
  requestOpsBrowserNotificationPermission,
  setStoredOpsBrowserNotificationPreference,
  setStoredOpsSoundAlertPreference,
} from "@/lib/opsNewRequestAlert";
import { useIncomingRequestAlert } from "@/hooks/useIncomingRequestAlert";
import { SERVICE_AREA_COUNTIES } from "@shared/serviceAreas";
import { validateTennesseeParcelId } from "@shared/tennesseeParcelId";
import { estimateInternalSiteVisitCost } from "@shared/siteVisitCostEstimate";
import { buildQuoteDiscountLineItem, getCustomerDiscountOptions, getSuggestedVolumeDiscount, type QuoteDiscountOption } from "@shared/quoteDiscounts";
import { formatQuoteCents, quoteDollarsToCents, roundQuoteCentsUp } from "@shared/quoteMoney";
import { buildQuoteCostBreakdown, getQuoteCostDistribution } from "@shared/quoteCostBreakdown";
import { getQuoteDraftIdentity } from "@shared/quoteDrafts";
import { moveQuoteLineItem } from "@shared/quoteLineItemOrder";
import { ensureQuotePhaseIds, getQuotePhaseSections } from "@shared/quotePhaseSections";
import { getQuoteRentalCostCents, getQuoteRentalOnlyMargin, getQuoteRentalOnlyMarginStatus, getQuoteTotalWithRentalCharge, MAX_QUOTE_EVIDENCE_PHOTOS, parseQuoteSupportArtifactArray, parseQuoteSupportArtifacts, type QuoteCostFlag, type QuoteEvidenceAttachment, type QuoteInsuranceDocument, type QuoteMeasurement, type QuoteRentalEquipment } from "@shared/quoteSupportArtifacts";
import {
  createQuoteServiceLineItem,
  getQuoteLineServiceOption,
  inferQuoteLineServiceOption,
  isLinearFootQuoteLine,
  QUOTE_LINE_SERVICE_OPTIONS,
  quoteLineQuantityLabel,
  type QuoteLineMeasurementUnit,
  type QuoteLineQuantitySource,
} from "@shared/quoteLineItemMeasurements";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  DAY_RATE_TERMS,
  ONE_DAY_TRIAL_TERMS,
  PHASED_WORK_TERMS,
  SAMPLE_PHASED_QUOTE_CLIENT_MESSAGE,
  createQuoteWorkLineItem,
  type QuoteLineItemKind,
  type QuotePhaseAuthorization,
  type QuoteWorkPreset,
} from "@shared/quoteWorkTypes";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  serviceCode?: string;
  measurementUnit?: QuoteLineMeasurementUnit;
  quantitySource?: QuoteLineQuantitySource;
  sourceAcreage?: number;
  clearingWidthFeet?: number;
  kind?: QuoteLineItemKind;
  phaseId?: string;
  phaseAuthorization?: QuotePhaseAuthorization;
  estimatedDuration?: string;
  discountCode?: string;
}

function isNashvilleParcelViewerUrl(url: string | null | undefined): boolean {
  return Boolean(url?.includes("maps.nashville.gov/ParcelViewer"));
}

const RENTAL_MARGIN_TONE_CLASSES = {
  neutral: "border-zinc-600 bg-zinc-900/60 text-zinc-200",
  red: "border-red-500/45 bg-red-500/[0.08] text-red-200",
  amber: "border-amber-500/45 bg-amber-500/[0.08] text-amber-200",
  green: "border-emerald-500/45 bg-emerald-500/[0.08] text-emerald-200",
} as const;

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
  rentalEquipment: string;
  rentalMarkupPct: number | null;
  quoteEvidence: string;
  quoteMeasurements: string;
  insuranceDocuments: string;
  aiEvidenceSummary: string | null;
  aiCostReview: string | null;
  aiCostFlags: string | null;
  aiRecommendedRentalMarkupPct: number | null;
  aiMarkupRecommendationReason: string | null;
  aiCostReviewUpdatedAt: Date | null;
  estimatedDuration: string | null;
  acreage: string | null;
  serviceType: string | null;
  parcelId: string | null;
  parcelCounty: string | null;
  aiRangeConfidence: string | null;
  aiRangeConfidenceScore: number | null;
  sourceDetail: string;
  fitDecision: string;
  nextActionType: string;
  nextActionDueAt: Date | null;
  visitStatus: string;
  proposalStatus: string;
  depositStatus: string;
  finalPaymentStatus: string;
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
  item, index, onChange, onRemove, onMove, compact, phaseOptions = []
}: {
  item: LineItem;
  index: number;
  onChange: (i: number, field: keyof LineItem, val: string | number) => void;
  onRemove: (i: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  compact: boolean;
  phaseOptions?: Array<{ id: string; label: string }>;
}) {
  const durationError = item.kind === "phase" ? positiveDurationError(item.estimatedDuration) : null;
  const isServiceLine = !item.kind || item.kind === "service";
  const selectedService = getQuoteLineServiceOption(item.serviceCode) ?? inferQuoteLineServiceOption(item.description);
  const selectedServiceValue = selectedService?.value ?? "custom";
  const isLinearFoot = isServiceLine && isLinearFootQuoteLine(item);
  return (
    <div
      className={`grid grid-cols-1 gap-2 rounded-md border border-zinc-800 p-2 transition-colors hover:border-zinc-700 ${compact ? "" : "sm:grid-cols-[auto_minmax(0,5fr)_minmax(0,2fr)_minmax(0,3fr)_minmax(0,1fr)_auto] sm:border-0 sm:p-0"}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const fromIndex = Number(event.dataTransfer.getData("application/x-noland-quote-line-item"));
        if (Number.isInteger(fromIndex)) onMove(fromIndex, index);
      }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("application/x-noland-quote-line-item", String(index));
          }}
          aria-label={`Drag ${item.description || `line item ${index + 1}`} to reorder`}
          title="Drag to reorder"
          className="cursor-grab touch-none rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-amber-300 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            aria-label={`Move ${item.description || `line item ${index + 1}`} up`}
            title="Move up"
            className="rounded p-0.5 text-zinc-500 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            aria-label={`Move ${item.description || `line item ${index + 1}`} down`}
            title="Move down"
            className="rounded p-0.5 text-zinc-500 hover:text-amber-300"
          >
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div>
        {isServiceLine && (
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Service
            <select
              value={selectedServiceValue}
              onChange={e => onChange(index, "serviceCode", e.target.value)}
              aria-label="Quote service"
              className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-zinc-100"
            >
              {QUOTE_LINE_SERVICE_OPTIONS.map((service) => <option key={service.value} value={service.value}>{service.label}{service.measurementUnit === "linear_foot" ? " — linear ft" : ""}</option>)}
              <option value="custom">Custom service / charge</option>
            </select>
          </label>
        )}
        {!isServiceLine && <Input
          placeholder="Description"
          value={item.description}
          onChange={e => onChange(index, "description", e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-sm"
        />}
        {isLinearFoot && (
          <div className="mt-1.5 space-y-1.5 rounded border border-sky-500/25 bg-sky-500/[0.05] p-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-sky-200">Footage source: Measured Linear Feet</p>
            <p className="text-[10px] text-sky-300">Calculated as measured Linear Feet × rate per Linear Foot. Acreage conversion is not available for this service.</p>
          </div>
        )}
        {item.kind === "phase" && (
          <div className="mt-2 grid gap-2 rounded-md border border-zinc-700/80 bg-zinc-950/45 p-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-zinc-300">
              <span>Authorization</span>
              <select
                value={item.phaseAuthorization ?? "approved_now"}
                onChange={e => onChange(index, "phaseAuthorization", e.target.value as QuotePhaseAuthorization)}
                aria-label="Phase authorization"
                className="h-9 w-full rounded border border-zinc-600 bg-zinc-900 px-2.5 text-xs text-zinc-100"
              >
                <option value="approved_now">Approved now</option>
                <option value="optional_future">Optional future phase</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-zinc-300">
              <span>Estimated duration</span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={item.estimatedDuration ?? ""}
                onChange={e => onChange(index, "estimatedDuration", e.target.value)}
                placeholder="e.g. 1.5"
                aria-invalid={Boolean(durationError)}
                aria-label="Phase estimated duration in working days"
                className={`h-9 w-full rounded bg-zinc-900 px-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 ${durationError ? "border-red-500" : "border-zinc-600"}`}
              />
            </label>
            {durationError && <p className="sm:col-span-2 text-[11px] text-red-300">{durationError}</p>}
          </div>
        )}
        {item.kind !== "phase" && phaseOptions.length > 0 && (
          <label className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-400">
            Phase
            <select
              value={item.phaseId ?? "unassigned"}
              onChange={e => onChange(index, "phaseId", e.target.value === "unassigned" ? "" : e.target.value)}
              className="h-6 min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-1.5 text-[10px] text-zinc-200"
            >
              <option value="unassigned">Unassigned</option>
              {phaseOptions.map((phase) => <option key={phase.id} value={phase.id}>{phase.label}</option>)}
            </select>
          </label>
        )}
      </div>
      <div>
        <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{isLinearFoot ? quoteLineQuantityLabel(item) : "Quantity"}</Label>
        <Input
          type="number"
          placeholder={isLinearFoot ? "Linear feet" : "Qty"}
          value={item.qty}
          min={1}
          step={isLinearFoot ? 1 : "any"}
          onChange={e => onChange(index, "qty", parseFloat(e.target.value) || 1)}
          className="bg-zinc-800 border-zinc-700 text-sm"
        />
      </div>
      <div>
        <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{isLinearFoot ? "Rate / linear ft" : "Unit price"}</Label>
        <Input
          type="number"
          placeholder={isLinearFoot ? "Rate / linear ft" : "Unit price"}
          value={roundQuoteCentsUp(item.unitPriceCents) / 100}
          step={1}
          onChange={e => onChange(index, "unitPriceCents", quoteDollarsToCents(parseFloat(e.target.value) || 0))}
          className="bg-zinc-800 border-zinc-700 text-sm"
        />
      </div>
      <div className={`flex items-center justify-between text-sm font-medium ${compact ? "" : "sm:block sm:text-right"} ${item.kind === "discount" || item.unitPriceCents < 0 ? "text-emerald-400" : "text-amber-400"}`}>
        <span className={`text-xs font-normal text-zinc-500 ${compact ? "" : "sm:hidden"}`}>Line total</span><span>{formatQuoteCents(item.qty * item.unitPriceCents)}</span>
      </div>
      <div className="flex justify-end">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => onRemove(index)}>
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────
const SERVICE_TYPES = [
  "Forestry Mulching", "Land Management", "Brush Hogging",
  "Right-of-Way Clearing", "Trail Cutting", "Fence Line Clearing", "Lot Clearing", "Pasture Reclamation"
];

const DEFAULT_LINE_ITEMS: LineItem[] = [
  { ...createQuoteServiceLineItem(), kind: "service" }
];

function createQuotePhaseId() {
  return `phase-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function positiveDurationError(value: string | undefined) {
  if (!value?.trim()) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? null
    : "Enter a positive number of working days.";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

async function compressQuoteEvidenceImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || (file.size <= 900 * 1024 && file.type === "image/webp")) return file;
  return new Promise((resolve) => {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxDimension = 2_000;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(sourceUrl);
        resolve(file);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(sourceUrl);
        if (!blob || blob.size >= file.size) {
          resolve(file);
          return;
        }
        const filename = file.name.replace(/\.(?:jpe?g|png|webp)$/i, "") || "site-photo";
        resolve(new File([blob], `${filename}.webp`, { type: "image/webp", lastModified: file.lastModified }));
      }, "image/webp", 0.82);
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(file);
    };
    image.src = sourceUrl;
  });
}

function emptyRentalEquipment(): QuoteRentalEquipment {
  return {
    equipmentName: "",
    dealerLocation: "",
    rentalDays: undefined,
    rentalCostCents: 0,
    transportCostCents: 0,
    taxCostCents: 0,
    quoteReference: "",
    notes: "",
  };
}

function normalizeQuoteLineItemsForSave(items: LineItem[]): LineItem[] {
  return items.map((item) => {
    const quantity = Number(item.qty);
    const unitPrice = Number(item.unitPriceCents);
    const qty = Number.isFinite(quantity) ? Math.max(1, quantity) : 1;
    const unitPriceCents = roundQuoteCentsUp(Number.isFinite(unitPrice) ? unitPrice : 0);

    return {
      ...item,
      qty,
      unitPriceCents,
      totalCents: roundQuoteCentsUp(qty * unitPriceCents),
    };
  });
}

interface QuoteFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  propertyAddress: string;
  title: string;
  serviceType: string;
  acreage: string;
  estimatedDuration: string;
  parcelId: string;
  parcelCounty: string;
  clientMessage: string;
  internalNotes: string;
  lineItems: LineItem[];
  rentalEquipment: QuoteRentalEquipment[];
  rentalMarkupPct: number;
  quoteEvidence: QuoteEvidenceAttachment[];
  quoteMeasurements: QuoteMeasurement[];
  insuranceDocuments: QuoteInsuranceDocument[];
  aiEvidenceSummary: string;
  aiCostReview: string;
  aiCostFlags: QuoteCostFlag[];
  aiRecommendedRentalMarkupPct: number | null;
  aiMarkupRecommendationReason: string;
  sourceDetail: string;
  fitDecision: "unreviewed" | "owner_review" | "pursue" | "pass" | "refer_out";
  nextActionType: string;
  nextActionDueAt: string;
  visitStatus: "not_requested" | "requested" | "confirmed" | "completed" | "not_needed";
  proposalStatus: "not_started" | "draft" | "sent" | "approved" | "declined";
  depositStatus: "not_requested" | "requested" | "paid" | "not_required";
  finalPaymentStatus: "not_due" | "invoiced" | "paid" | "overdue";
}

function toLocalDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
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
    websiteRequestId?: number;
  };
}) {
  const utils = trpc.useUtils();
  const { data: pricingDiscountSettings } = trpc.ops.settings.getAIPricingSettings.useQuery();

  // ── Client autocomplete ─────────────────────────────────────────────────────
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const { data: clientResults = [] } = trpc.nativeClients.list.useQuery(
    { search: clientSearch, limit: 20 },
    { enabled: showClientDropdown }
  );
  const { data: selectedClientFull } = trpc.nativeClients.getById.useQuery(
    { id: selectedClientId! },
    { enabled: selectedClientId !== null }
  );

  const selectClient = (client: { id: number; name: string; email: string | null; phone: string | null; address: string | null }) => {
    setSelectedClientId(client.id);
    setForm(p => ({
      ...p,
      clientName: client.name,
      clientEmail: client.email ?? p.clientEmail,
      clientPhone: client.phone ?? p.clientPhone,
      propertyAddress: client.address ?? p.propertyAddress,
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const blankForm = (): QuoteFormData => ({
    clientName: prefill?.clientName ?? "",
    clientEmail: prefill?.clientEmail ?? "",
    clientPhone: prefill?.clientPhone ?? "",
    propertyAddress: prefill?.propertyAddress ?? "",
    title: "",
    serviceType: prefill?.serviceType ?? "Forestry Mulching",
    acreage: "",
    estimatedDuration: "",
    parcelId: "",
    parcelCounty: "",
    clientMessage: prefill?.clientMessage ?? "",
    internalNotes: "",
    lineItems: DEFAULT_LINE_ITEMS.map(li => ({ ...li })),
    rentalEquipment: [],
    rentalMarkupPct: 15,
    quoteEvidence: [],
    quoteMeasurements: [],
    insuranceDocuments: [],
    aiEvidenceSummary: "",
    aiCostReview: "",
    aiCostFlags: [],
    aiRecommendedRentalMarkupPct: null,
    aiMarkupRecommendationReason: "",
    sourceDetail: "manual",
    fitDecision: "unreviewed",
    nextActionType: "review_request",
    nextActionDueAt: "",
    visitStatus: "not_requested",
    proposalStatus: "not_started",
    depositStatus: "not_requested",
    finalPaymentStatus: "not_due",
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
        parcelId: editQuote.parcelId ?? "",
        parcelCounty: editQuote.parcelCounty ?? "",
        clientMessage: editQuote.clientMessage ?? "",
        internalNotes: editQuote.internalNotes ?? "",
        lineItems: items.length > 0 ? ensureQuotePhaseIds(items) : DEFAULT_LINE_ITEMS.map(li => ({ ...li })),
        rentalEquipment: parseQuoteSupportArtifactArray<QuoteRentalEquipment>(editQuote.rentalEquipment),
        rentalMarkupPct: editQuote.rentalMarkupPct ?? 15,
        quoteEvidence: parseQuoteSupportArtifactArray<QuoteEvidenceAttachment>(editQuote.quoteEvidence),
        quoteMeasurements: parseQuoteSupportArtifactArray<QuoteMeasurement>(editQuote.quoteMeasurements),
        insuranceDocuments: parseQuoteSupportArtifactArray<QuoteInsuranceDocument>(editQuote.insuranceDocuments),
        aiEvidenceSummary: editQuote.aiEvidenceSummary ?? "",
        aiCostReview: editQuote.aiCostReview ?? "",
        aiCostFlags: parseQuoteSupportArtifacts<QuoteCostFlag[]>(editQuote.aiCostFlags, []),
        aiRecommendedRentalMarkupPct: editQuote.aiRecommendedRentalMarkupPct ?? null,
        aiMarkupRecommendationReason: editQuote.aiMarkupRecommendationReason ?? "",
        sourceDetail: editQuote.sourceDetail ?? "manual",
        fitDecision: (editQuote.fitDecision ?? "unreviewed") as QuoteFormData["fitDecision"],
        nextActionType: editQuote.nextActionType ?? "review_request",
        nextActionDueAt: toLocalDateTime(editQuote.nextActionDueAt),
        visitStatus: (editQuote.visitStatus ?? "not_requested") as QuoteFormData["visitStatus"],
        proposalStatus: (editQuote.proposalStatus ?? "not_started") as QuoteFormData["proposalStatus"],
        depositStatus: (editQuote.depositStatus ?? "not_requested") as QuoteFormData["depositStatus"],
        finalPaymentStatus: (editQuote.finalPaymentStatus ?? "not_due") as QuoteFormData["finalPaymentStatus"],
      };
    }
    return blankForm();
  });
  const [draftQuoteId, setDraftQuoteId] = useState<number | null>(() => editQuote?.id ?? null);
  const [workspaceSize, setWorkspaceSize] = useState(() => {
    const availableWidth = typeof window === "undefined" ? 1280 : window.innerWidth - 32;
    const availableHeight = typeof window === "undefined" ? 900 : window.innerHeight - 32;
    return {
      width: Math.max(Math.min(1280, availableWidth), Math.min(760, availableWidth)),
      height: Math.max(Math.min(900, availableHeight), Math.min(620, availableHeight)),
    };
  });
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const isCompactWorkspace = workspaceSize.width < 1040;
  useEffect(() => () => resizeCleanupRef.current?.(), []);
  const [parcelCounty, setParcelCounty] = useState(editQuote?.parcelCounty ?? "");
  const [parcelId, setParcelId] = useState(editQuote?.parcelId ?? "");
  const [parcelIdError, setParcelIdError] = useState<string | null>(null);
  const [parcelMatches, setParcelMatches] = useState<Array<{
    parcelId: string;
    county: string;
    address: string | null;
    owner: string | null;
    deedAcreage: number | null;
    propertyViewerUrl: string | null;
    assessmentDataUrl: string | null;
  }>>([]);
  const [selectedParcel, setSelectedParcel] = useState<typeof parcelMatches[number] | null>(null);
  const siteVisitCostEstimate = selectedParcel?.deedAcreage
    ? estimateInternalSiteVisitCost(selectedParcel.deedAcreage)
    : null;
  const parcelLookupMutation = trpc.parcel.lookup.useMutation({
    onError: (error) => toast.error(error.message),
  });
  const uploadAttachmentMutation = trpc.nativeQuotes.uploadAttachment.useMutation();
  const { data: insuranceLibrary = [] } = trpc.nativeQuotes.listInsuranceLibrary.useQuery(undefined, { enabled: open });
  const saveInsuranceLibraryMutation = trpc.nativeQuotes.saveInsuranceLibraryDocument.useMutation({
    onSuccess: () => {
      utils.nativeQuotes.listInsuranceLibrary.invalidate();
      toast.success("Proof of insurance saved to your document library.");
    },
    onError: (error) => toast.error(error.message),
  });
  const archiveInsuranceLibraryMutation = trpc.nativeQuotes.archiveInsuranceLibraryDocument.useMutation({
    onSuccess: () => utils.nativeQuotes.listInsuranceLibrary.invalidate(),
    onError: (error) => toast.error(error.message),
  });
  const [isEvidenceReviewStale, setIsEvidenceReviewStale] = useState(false);
  const evidenceReviewSignature = useMemo(() => JSON.stringify({
    evidence: form.quoteEvidence.map((attachment) => attachment.key),
    measurements: form.quoteMeasurements.map((measurement) => [measurement.label, measurement.value, measurement.unit, measurement.notes ?? ""]),
  }), [form.quoteEvidence, form.quoteMeasurements]);
  const evidenceReviewSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    evidenceReviewSignatureRef.current = null;
    setIsEvidenceReviewStale(false);
  }, [open, editQuote?.id]);

  useEffect(() => {
    if (evidenceReviewSignatureRef.current === null) {
      evidenceReviewSignatureRef.current = evidenceReviewSignature;
      return;
    }
    if (evidenceReviewSignatureRef.current === evidenceReviewSignature) return;
    evidenceReviewSignatureRef.current = evidenceReviewSignature;
    setIsEvidenceReviewStale(true);
    setForm((current) => ({
      ...current,
      aiEvidenceSummary: "",
      aiCostReview: "",
      aiCostFlags: [],
      aiRecommendedRentalMarkupPct: null,
      aiMarkupRecommendationReason: "",
    }));
  }, [evidenceReviewSignature]);
  const reviewCostMutation = trpc.nativeQuotes.reviewCost.useMutation({
    onSuccess: (result) => {
      setForm((current) => ({ ...current, aiCostReview: result.summary, aiCostFlags: result.flags, aiRecommendedRentalMarkupPct: result.recommendedRentalMarkupPct, aiMarkupRecommendationReason: result.markupRecommendationReason ?? "" }));
      setIsEvidenceReviewStale(false);
      utils.nativeQuotes.list.invalidate();
      toast.success("Internal AI cost review generated.");
    },
    onError: (error) => toast.error(error.message),
  });
  const captionEvidenceMutation = trpc.nativeQuotes.captionEvidence.useMutation({
    onSuccess: ({ photoAnnotations }) => {
      setForm((current) => ({
        ...current,
        quoteEvidence: current.quoteEvidence.map((attachment) => {
          const annotation = photoAnnotations.find((item) => item.key === attachment.key);
          return annotation ? { ...attachment, caption: annotation.caption, tags: annotation.tags } : attachment;
        }),
      }));
      if (photoAnnotations.length > 0) toast.success("Internal photo captions and tags added.");
    },
    onError: () => toast.message("AI Suggest completed, but photo captions could not be generated. You can continue with the quote."),
  });
  const [uploadingKind, setUploadingKind] = useState<"evidence" | "insurance" | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ kind: "evidence" | "insurance"; stage: "compressing" | "uploading"; completed: number; total: number } | null>(null);
  const [isEvidenceDragging, setIsEvidenceDragging] = useState(false);
  const [insurancePreview, setInsurancePreview] = useState<{ filename: string; url: string; mimeType: string } | null>(null);

  const openInsurancePreview = (document: { filename: string; url: string; mimeType: string }) => {
    setInsurancePreview(document);
  };

  useEffect(() => {
    const interceptEvidenceThumbnail = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const image = target.closest("img");
      const attachment = image ? form.quoteEvidence.find((item) => item.url === image.getAttribute("src")) : undefined;
      if (!attachment) return;
      event.preventDefault();
      event.stopPropagation();
      openInsurancePreview(attachment);
    };
    document.addEventListener("click", interceptEvidenceThumbnail, true);
    return () => document.removeEventListener("click", interceptEvidenceThumbnail, true);
  }, [form.quoteEvidence]);

  const uploadQuoteFiles = async (kind: "evidence" | "insurance", files: FileList | File[] | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    const currentCount = kind === "evidence" ? form.quoteEvidence.length : form.insuranceDocuments.length;
    const maximum = kind === "evidence" ? MAX_QUOTE_EVIDENCE_PHOTOS : 12;
    const remaining = maximum - currentCount;
    if (selected.length > remaining) {
      toast.error(`You can add ${remaining} more ${kind === "evidence" ? "site photo(s)" : "insurance document(s)"} to this quote.`);
      return;
    }
    setUploadingKind(kind);
    setUploadProgress({ kind, stage: kind === "evidence" ? "compressing" : "uploading", completed: 0, total: selected.length });
    try {
      const uploaded: Array<QuoteEvidenceAttachment | QuoteInsuranceDocument> = [];
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        const uploadFile = kind === "evidence" ? await compressQuoteEvidenceImage(file) : file;
        setUploadProgress({ kind, stage: "uploading", completed: index, total: selected.length });
        if (uploadFile.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than the 10 MB attachment limit after compression.`);
        const uploadedFile = await uploadAttachmentMutation.mutateAsync({
          kind,
          base64: await fileToBase64(uploadFile),
          mimeType: uploadFile.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf",
          filename: uploadFile.name,
        });
        uploaded.push(uploadedFile as QuoteEvidenceAttachment | QuoteInsuranceDocument);
        setUploadProgress({ kind, stage: "uploading", completed: index + 1, total: selected.length });
      }
      setForm((current) => kind === "evidence"
        ? { ...current, quoteEvidence: [...current.quoteEvidence, ...(uploaded as QuoteEvidenceAttachment[])] }
        : { ...current, insuranceDocuments: [...current.insuranceDocuments, ...(uploaded as QuoteInsuranceDocument[])] },
      );
      toast.success(`${uploaded.length} ${kind === "evidence" ? "site photo" : "insurance document"}${uploaded.length === 1 ? "" : "s"} attached to this quote.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The attachment could not be uploaded.");
    } finally {
      setUploadingKind(null);
      setUploadProgress(null);
    }
  };

  const handleEvidenceDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsEvidenceDragging(false);
    if (uploadingKind !== null) return;
    void uploadQuoteFiles("evidence", Array.from(event.dataTransfer.files));
  };

  const applyParcelMatch = (match: typeof parcelMatches[number]) => {
    const parcelSourceLabel = isNashvilleParcelViewerUrl(match.propertyViewerUrl)
      ? "Nashville Parcel Viewer"
      : "TN Property Viewer";
    const reportedAcreage = match.deedAcreage
      ? String(Math.round(match.deedAcreage * 100) / 100)
      : null;
    setForm((current) => ({
      ...current,
      clientName: current.clientName.trim() ? current.clientName : (match.owner || current.clientName),
      propertyAddress: match.address || current.propertyAddress,
      acreage: current.acreage || reportedAcreage || current.acreage,
      parcelId: match.parcelId,
      parcelCounty: match.county,
      internalNotes: [
        current.internalNotes,
        `${parcelSourceLabel} reference: Parcel ${match.parcelId} · ${match.county}${match.owner ? ` · Owner: ${match.owner}` : ""}`,
        reportedAcreage && !current.acreage ? `${parcelSourceLabel} reported acreage: ${reportedAcreage} acres (reference only; editable and verify on site).` : "",
      ].filter(Boolean).join("\n"),
    }));
    setParcelId(match.parcelId);
    setParcelCounty(match.county);
    setSelectedParcel(match);
    setParcelMatches([]);
    toast.success(reportedAcreage ? "Parcel details and reported acreage copied into the editable quote fields." : "Parcel details copied into the editable quote fields.");
  };

  const lookupParcel = () => {
    if (!parcelCounty.trim()) { toast.error("Enter the property county first."); return; }
    if (!parcelId.trim()) { toast.error("Enter the Parcel ID first."); return; }
    const validation = validateTennesseeParcelId(parcelId);
    if (!validation.valid) {
      setParcelIdError(validation.error);
      return;
    }
    setParcelIdError(null);
    setSelectedParcel(null);
    parcelLookupMutation.mutate({ county: parcelCounty, parcelId }, {
      onSuccess: (result) => {
        if (result.matches.length === 0) {
          setParcelMatches([]);
          toast.message("No matching Tennessee parcel was found. Verify the county and Parcel ID, or enter the address manually.");
          return;
        }
        if (result.matches.length === 1) {
          applyParcelMatch(result.matches[0]);
          return;
        }
        setParcelMatches(result.matches);
        toast.message(`Found ${result.matches.length} possible parcels. Select the correct property below.`);
      },
    });
  };

  const costBreakdown = useMemo(() => buildQuoteCostBreakdown(form.lineItems), [form.lineItems]);
  const phaseSections = useMemo(() => getQuotePhaseSections(form.lineItems), [form.lineItems]);
  const phaseOptions = useMemo(
    () => phaseSections.map((section, index) => ({ id: section.phase.phaseId!, label: section.phase.description || `Phase ${index + 1}` })),
    [phaseSections],
  );
  const unassignedLineItemIndices = useMemo(
    () => form.lineItems.map((item, index) => ({ item, index })).filter(({ item }) => item.kind !== "phase" && !item.phaseId).map(({ index }) => index),
    [form.lineItems],
  );
  const costDistribution = useMemo(() => getQuoteCostDistribution(costBreakdown), [costBreakdown]);
  const hasCostDistribution = costDistribution.some((slice) => slice.value > 0);
  const serviceTotalCents = costBreakdown.allPhasesTotalCents;
  const internalRentalCostCents = useMemo(() => getQuoteRentalCostCents(form.rentalEquipment), [form.rentalEquipment]);
  const rentalCustomerQuote = getQuoteTotalWithRentalCharge(serviceTotalCents, internalRentalCostCents, form.rentalMarkupPct);
  const totalCents = rentalCustomerQuote.totalCents;
  const { rentalOnlyProfitCents, rentalOnlyMarginPct } = getQuoteRentalOnlyMargin(totalCents, internalRentalCostCents);
  const rentalOnlyMarginStatus = getQuoteRentalOnlyMarginStatus(rentalOnlyMarginPct);
  const discountItems = useMemo(() => form.lineItems.filter((item) => item.kind === "discount" || item.unitPriceCents < 0), [form.lineItems]);
  const appliedDiscountCodes = useMemo(
    () => new Set(discountItems.map((item) => item.discountCode).filter((code): code is string => Boolean(code))),
    [discountItems]
  );
  const baseSubtotalCents = costBreakdown.baseSubtotalCents;
  const discountCents = costBreakdown.discountCents;
  const acreageNumber = parseFloat(form.acreage);
  const volumeDiscount = useMemo(() => getSuggestedVolumeDiscount(acreageNumber, pricingDiscountSettings ?? {}), [acreageNumber, pricingDiscountSettings]);
  const customerDiscountOptions = useMemo(() => getCustomerDiscountOptions(pricingDiscountSettings ?? {}), [pricingDiscountSettings]);

  const applyDiscountOption = (option: QuoteDiscountOption, phaseId?: string) => {
    const phaseSection = phaseId ? phaseSections.find((section) => section.phase.phaseId === phaseId) : undefined;
    const eligibleSubtotalCents = phaseSection ? phaseSection.subtotalCents : baseSubtotalCents;
    if (eligibleSubtotalCents <= 0) {
      toast.error("Add at least one priced service line before applying a discount.");
      return;
    }
    const alreadyAppliedToScope = discountItems.some((item) => item.discountCode === option.code && item.phaseId === phaseId);
    if (alreadyAppliedToScope) {
      toast.message(`${option.label} is already applied to ${phaseSection ? "this phase" : "the unassigned quote items"}.`);
      return;
    }
    const discountLine = { ...buildQuoteDiscountLineItem(eligibleSubtotalCents, option), ...(phaseId ? { phaseId } : {}) };
    setForm((previous) => ({
      ...previous,
      lineItems: [...previous.lineItems, discountLine],
    }));
    toast.success(`${option.label} added to ${phaseSection ? phaseSection.phase.description || "this phase" : "the quote"}.`);
  };

  // ── AI Suggest ────────────────────────────────────────────────────────────
  const [aiPanel, setAiPanel] = useState<"closed" | "open" | "loading" | "result">("closed");
  const [aiTerrain, setAiTerrain] = useState("flat");
  const [aiDensity, setAiDensity] = useState("moderate");
  const [aiAccess, setAiAccess] = useState("easy");
  // Editable multipliers — override the server-computed values before applying
  const [editTerrainMult, setEditTerrainMult] = useState<string>("");
  const [editAccessMult, setEditAccessMult] = useState<string>("");
  const [copyDone, setCopyDone] = useState(false);
  const aiPrimaryServiceLine = useMemo(
    () => form.lineItems.find((line) => !line.kind || line.kind === "service"),
    [form.lineItems],
  );
  const aiPrimaryService = getQuoteLineServiceOption(aiPrimaryServiceLine?.serviceCode)
    ?? inferQuoteLineServiceOption(aiPrimaryServiceLine?.description);
  const aiUsesLinearFeet = Boolean(aiPrimaryServiceLine && isLinearFootQuoteLine(aiPrimaryServiceLine));
  const quoteHeaderService = QUOTE_LINE_SERVICE_OPTIONS.find((service) => service.label === form.serviceType)
    ?? aiPrimaryService;
  const quoteHeaderUsesLinearFeet = quoteHeaderService?.measurementUnit === "linear_foot";
  const quoteHeaderLineIndex = quoteHeaderService
    ? form.lineItems.findIndex((line) => line.serviceCode === quoteHeaderService.value)
    : -1;
  const quoteHeaderLinearFeet = quoteHeaderLineIndex >= 0 ? form.lineItems[quoteHeaderLineIndex]?.qty ?? "" : "";
  const [quoteHeaderLinearFeetInput, setQuoteHeaderLinearFeetInput] = useState(String(quoteHeaderLinearFeet || ""));
  useEffect(() => {
    setQuoteHeaderLinearFeetInput(quoteHeaderUsesLinearFeet ? String(quoteHeaderLinearFeet || "") : "");
  }, [quoteHeaderUsesLinearFeet, quoteHeaderLinearFeet]);
  const linearAcreageWarningRef = useRef<string | null>(null);
  useEffect(() => {
    if (!quoteHeaderUsesLinearFeet || !form.acreage.trim()) return;
    setForm((current) => current.acreage.trim() ? { ...current, acreage: "" } : current);
    if (linearAcreageWarningRef.current !== form.serviceType) {
      toast.message(`${form.serviceType} uses measured Linear Feet only. Acreage was cleared before save.`);
      linearAcreageWarningRef.current = form.serviceType;
    }
  }, [form.acreage, form.serviceType, quoteHeaderUsesLinearFeet]);
  const [aiSuggestion, setAiSuggestion] = useState<{
    title: string;
    estimatedDuration: string;
    clientMessage: string;
    evidenceSummary?: string;
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
      acreage: number | null;
      linearFeet: number | null;
      measurementUnit: "acre" | "linear_foot";
      quantitySource: QuoteLineQuantitySource | null;
      sourceAcreage: number | null;
      clearingWidthFeet: number | null;
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
      setIsEvidenceReviewStale(false);
      setCopyDone(false);
      setAiPanel("result");
      if (form.quoteEvidence.length > 0) {
        captionEvidenceMutation.mutate({ evidence: form.quoteEvidence, ...(draftQuoteId ? { quoteId: draftQuoteId } : {}) });
      }
    },
    onError: (e) => {
      setAiPanel("open");
      toast.error("AI suggestion failed: " + e.message);
    },
  });

  const generateClientMessageMutation = trpc.nativeQuotes.generateClientMessage.useMutation({
    onSuccess: ({ message }) => {
      setForm((previous) => ({ ...previous, clientMessage: message }));
      toast.success("Client message generated. Review and edit it before sending.");
    },
    onError: (error) => toast.error(`Client message could not be generated: ${error.message}`),
  });

  const generateClientMessage = () => {
    const serviceType = aiPrimaryService?.label ?? form.serviceType;
    const lineItems = normalizeQuoteLineItemsForSave(form.lineItems);
    if (!form.clientName.trim()) {
      toast.error("Enter the client name before generating a client message.");
      return;
    }
    if (!serviceType) {
      toast.error("Select a service type before generating a client message.");
      return;
    }
    if (lineItems.length === 0 || lineItems.every((item) => item.kind === "phase")) {
      toast.error("Add the completed quote items before generating a client message.");
      return;
    }
    generateClientMessageMutation.mutate({
      clientName: form.clientName.trim(),
      title: form.title.trim() || undefined,
      propertyAddress: form.propertyAddress.trim() || undefined,
      serviceType,
      parcelId: form.parcelId.trim() || undefined,
      parcelCounty: form.parcelCounty.trim() || undefined,
      estimatedDuration: form.estimatedDuration.trim() || undefined,
      totalCents,
      lineItems,
      measurements: form.quoteMeasurements,
      evidence: form.quoteEvidence,
    });
  };

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
      aiEvidenceSummary: aiSuggestion.evidenceSummary || prev.aiEvidenceSummary,
      lineItems: lineItems.length > 0 ? lineItems : prev.lineItems,
    }));
    setAiPanel("closed");
    setAiSuggestion(null);
    toast.success("AI suggestion applied to quote");
  };

  const handleAiSuggest = () => {
    const acreage = parseFloat(form.acreage);
    const linearFeet = Number(aiPrimaryServiceLine?.qty);
    const serviceType = aiPrimaryService?.label ?? form.serviceType;
    if (!serviceType) { toast.error("Select a service type first"); return; }
    if (aiUsesLinearFeet && (!Number.isFinite(linearFeet) || linearFeet <= 0)) {
      toast.error("Enter the Linear Feet on the selected service line first");
      return;
    }
    if (!aiUsesLinearFeet && (!form.acreage || isNaN(acreage) || acreage <= 0)) { toast.error("Enter acreage first"); return; }
    if (form.quoteEvidence.length > MAX_QUOTE_EVIDENCE_PHOTOS) toast.message(`AI Suggest will use the first ${MAX_QUOTE_EVIDENCE_PHOTOS} of your saved site photos. All photos remain attached to the quote.`);
    setAiPanel("loading");
    aiSuggestMutation.mutate({
      serviceType,
      ...(aiUsesLinearFeet
        ? { linearFeet, unitRateCents: aiPrimaryServiceLine?.unitPriceCents || undefined }
        : { acreage }),
      terrain: aiTerrain,
      density: aiDensity,
      access: aiAccess,
      notes: form.internalNotes || undefined,
      rentalEquipment: form.rentalEquipment,
      measurements: form.quoteMeasurements,
      evidence: Array.isArray(form.quoteEvidence) ? form.quoteEvidence.slice(0, MAX_QUOTE_EVIDENCE_PHOTOS) : [],
    });
  };

  const createMutation = trpc.nativeQuotes.create.useMutation({
    onSuccess: () => {
      utils.nativeQuotes.list.invalidate();
      utils.ops.quotes.list.invalidate();
      toast.success("Quote created");
      onSaved();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const updateMutation = trpc.nativeQuotes.update.useMutation({
    onSuccess: () => {
      utils.nativeQuotes.list.invalidate();
      utils.ops.quotes.list.invalidate();
      toast.success("Quote updated");
      onSaved();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const createDraftMutation = trpc.nativeQuotes.create.useMutation({
    onSuccess: (data) => {
      setDraftQuoteId(data.id);
      utils.nativeQuotes.list.invalidate();
      utils.ops.quotes.list.invalidate();
      toast.success("Draft saved. You can continue editing.");
    },
    onError: (e) => toast.error("Draft was not saved: " + e.message),
  });

  const updateDraftMutation = trpc.nativeQuotes.update.useMutation({
    onSuccess: () => {
      utils.nativeQuotes.list.invalidate();
      utils.ops.quotes.list.invalidate();
      toast.success("Draft updated. You can continue editing.");
    },
    onError: (e) => toast.error("Draft was not saved: " + e.message),
  });

  const handleLineItemChange = (i: number, field: keyof LineItem, val: string | number) => {
    const selectedService = field === "serviceCode" ? getQuoteLineServiceOption(String(val)) : undefined;
    const isPrimaryService = i === form.lineItems.findIndex((line) => !line.kind || line.kind === "service");
    if (selectedService?.measurementUnit === "linear_foot" && isPrimaryService && form.acreage.trim()) {
      toast.message(`${selectedService.label} uses measured Linear Feet only. Acreage was cleared before save.`);
    }
    setForm(prev => {
      const items = [...prev.lineItems];
      const current = items[i];
      const next = field === "serviceCode"
        ? {
          ...current,
          serviceCode: selectedService?.value,
          measurementUnit: selectedService?.measurementUnit,
          description: selectedService?.label ?? current.description,
          qty: 1,
          unitPriceCents: 0,
          totalCents: 0,
          quantitySource: selectedService?.measurementUnit === "linear_foot" ? "measured" as const : undefined,
          sourceAcreage: undefined,
          clearingWidthFeet: undefined,
        }
        : field === "qty" && isLinearFootQuoteLine(current)
          ? { ...current, [field]: val, quantitySource: "measured" as const, sourceAcreage: undefined, clearingWidthFeet: undefined }
          : { ...current, [field]: val };
      items[i] = normalizeQuoteLineItemsForSave([next as LineItem])[0];
      const firstServiceIndex = items.findIndex((line) => !line.kind || line.kind === "service");
      return {
        ...prev,
        lineItems: items,
        serviceType: field === "serviceCode" && selectedService && i === firstServiceIndex ? selectedService.label : prev.serviceType,
        acreage: field === "serviceCode" && selectedService?.measurementUnit === "linear_foot" && i === firstServiceIndex ? "" : prev.acreage,
      };
    });
  };

  const handleQuoteHeaderServiceChange = (serviceLabel: string) => {
    const selectedService = QUOTE_LINE_SERVICE_OPTIONS.find((service) => service.label === serviceLabel);
    if (selectedService?.measurementUnit === "linear_foot" && form.acreage.trim()) {
      toast.message(`${selectedService.label} uses measured Linear Feet only. Acreage was cleared before save.`);
    }
    setForm((previous) => {
      if (!selectedService) return { ...previous, serviceType: serviceLabel };
      const items = [...previous.lineItems];
      const firstServiceIndex = items.findIndex((line) => !line.kind || line.kind === "service");
      const serviceLine = createQuoteServiceLineItem(selectedService.value) as LineItem;
      if (firstServiceIndex < 0) items.unshift(serviceLine);
      else items[firstServiceIndex] = { ...items[firstServiceIndex], ...serviceLine };
      return {
        ...previous,
        acreage: selectedService.measurementUnit === "linear_foot" ? "" : previous.acreage,
        serviceType: selectedService.label,
        lineItems: normalizeQuoteLineItemsForSave(items),
      };
    });
  };

  const handleQuoteHeaderLinearFeetChange = (value: string) => {
    setQuoteHeaderLinearFeetInput(value);
    const numericValue = Number(value);
    if (!quoteHeaderService || !Number.isFinite(numericValue) || numericValue <= 0) return;
    setForm((previous) => {
      const items = [...previous.lineItems];
      const lineIndex = items.findIndex((line) => line.serviceCode === quoteHeaderService.value);
      const targetIndex = lineIndex >= 0 ? lineIndex : items.findIndex((line) => !line.kind || line.kind === "service");
      if (targetIndex < 0) return previous;
      items[targetIndex] = {
        ...items[targetIndex],
        description: quoteHeaderService.label,
        serviceCode: quoteHeaderService.value,
        measurementUnit: "linear_foot",
        qty: Math.min(528_000, Math.round(numericValue)),
        quantitySource: "measured",
        sourceAcreage: undefined,
        clearingWidthFeet: undefined,
      };
      return { ...previous, lineItems: normalizeQuoteLineItemsForSave(items) };
    });
  };

  const handleMoveLineItem = (fromIndex: number, toIndex: number) => {
    setForm((current) => ({
      ...current,
      lineItems: moveQuoteLineItem(current.lineItems, fromIndex, toIndex),
    }));
  };

  const addControlledLineItem = (kind: QuoteWorkPreset) => {
    const nextItem = createQuoteWorkLineItem(kind);
    setForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, ...(kind === "phase" ? [{ ...nextItem, phaseId: createQuotePhaseId() }] : [nextItem])],
    }));
  };

  const convertNormalQuoteToPhase = () => {
    if (phaseSections.length > 0) {
      toast.message("This quote already has phase sections.");
      return;
    }
    const phaseId = createQuotePhaseId();
    setForm((previous) => ({
      ...previous,
      lineItems: [
        {
          ...createQuoteWorkLineItem("phase"),
          phaseId,
          description: "Phase 1 — Approved work",
          phaseAuthorization: "approved_now",
        },
        ...previous.lineItems.map((item) => ({ ...item, phaseId })),
      ],
    }));
    toast.success("Standard quote converted to Phase 1. Add future phases only if needed.");
  };

  const addLineItemToPhase = (phaseId: string, item: LineItem) => {
    setForm((previous) => ({
      ...previous,
      lineItems: [...previous.lineItems, { ...item, phaseId }],
    }));
  };

  const removePhaseSection = (phaseId: string) => {
    setForm((previous) => ({
      ...previous,
      lineItems: previous.lineItems
        .filter((item) => !(item.kind === "phase" && item.phaseId === phaseId))
        .map((item) => item.phaseId === phaseId ? { ...item, phaseId: undefined } : item),
    }));
  };

  const appendClientTerms = (terms: string) => {
    setForm(prev => ({
      ...prev,
      clientMessage: prev.clientMessage.includes(terms)
        ? prev.clientMessage
        : [prev.clientMessage.trim(), terms].filter(Boolean).join("\n\n"),
    }));
  };

  const loadSamplePhasedQuote = () => {
    setForm(prev => ({
      ...prev,
      clientName: prev.clientName || "Sample Template — Replace Before Sending",
      title: "Sample Phased Forestry Mulching Quote — Replace Before Sending",
      serviceType: "Forestry Mulching",
      acreage: "Multiple defined areas",
      estimatedDuration: "Schedule each approved phase separately",
      clientMessage: SAMPLE_PHASED_QUOTE_CLIENT_MESSAGE,
      internalNotes: "INTERNAL SAMPLE ONLY — Replace client details, defined work areas, pricing, and approval status before saving or sending.",
      lineItems: [
        { ...createQuoteWorkLineItem("phase"), phaseId: "sample-phase-1", description: "Phase 1 — Access route and primary homesite area (approved now)", estimatedDuration: "1–2 days" },
        { description: "Forestry mulching scope", qty: 1, unitPriceCents: 0, totalCents: 0, kind: "service", phaseId: "sample-phase-1" },
        { description: "Mobilization", qty: 1, unitPriceCents: 0, totalCents: 0, kind: "mobilization", phaseId: "sample-phase-1" },
        { ...createQuoteWorkLineItem("phase"), phaseId: "sample-phase-2", description: "Phase 2 — Defined pasture-edge and transition area (optional future phase)", phaseAuthorization: "optional_future", estimatedDuration: "2–3 days" },
        { description: "Forestry mulching scope", qty: 1, unitPriceCents: 0, totalCents: 0, kind: "service", phaseId: "sample-phase-2" },
        { ...createQuoteWorkLineItem("phase"), phaseId: "sample-phase-3", description: "Phase 3 — Marked boundary and secondary use area (optional future phase)", phaseAuthorization: "optional_future", estimatedDuration: "1 day" },
        { description: "Forestry mulching scope", qty: 1, unitPriceCents: 0, totalCents: 0, kind: "service", phaseId: "sample-phase-3" },
      ],
    }));
    toast.success("Internal phased quote sample loaded. Replace every placeholder before sending.");
  };

  const buildQuotePayload = (identity = { clientName: form.clientName, title: form.title }) => {
    const lineItems = normalizeQuoteLineItemsForSave(form.lineItems);
    const serviceTotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
    const rentalCostCents = getQuoteRentalCostCents(form.rentalEquipment);
    const finalCustomerTotalCents = getQuoteTotalWithRentalCharge(serviceTotalCents, rentalCostCents, form.rentalMarkupPct).totalCents;
    return {
      clientName: identity.clientName,
      clientEmail: form.clientEmail || undefined,
      clientPhone: form.clientPhone || undefined,
      propertyAddress: form.propertyAddress || undefined,
      title: identity.title,
      serviceType: form.serviceType || undefined,
      acreage: form.acreage || undefined,
      estimatedDuration: form.estimatedDuration || undefined,
      parcelId: form.parcelId || undefined,
      parcelCounty: form.parcelCounty || undefined,
      clientMessage: form.clientMessage || undefined,
      internalNotes: form.internalNotes || undefined,
      lineItems,
      rentalEquipment: form.rentalEquipment,
      rentalMarkupPct: form.rentalMarkupPct,
      quoteEvidence: form.quoteEvidence,
      quoteMeasurements: form.quoteMeasurements,
      insuranceDocuments: form.insuranceDocuments,
      aiEvidenceSummary: form.aiEvidenceSummary || undefined,
      totalCents: finalCustomerTotalCents,
      sourceDetail: form.sourceDetail || "manual",
      fitDecision: form.fitDecision,
      nextActionType: form.nextActionType || "review_request",
      nextActionDueAt: form.nextActionDueAt ? new Date(form.nextActionDueAt) : null,
      visitStatus: form.visitStatus,
      proposalStatus: form.proposalStatus,
      depositStatus: form.depositStatus,
      finalPaymentStatus: form.finalPaymentStatus,
      websiteRequestId: !editQuote && !draftQuoteId ? prefill?.websiteRequestId : undefined,
    };
  };

  const validateDurationInputs = () => {
    const overallError = positiveDurationError(form.estimatedDuration);
    if (overallError) {
      toast.error(`Overall estimated duration: ${overallError}`);
      return false;
    }
    const invalidPhase = form.lineItems.find((item) => item.kind === "phase" && positiveDurationError(item.estimatedDuration));
    if (invalidPhase) {
      toast.error(`${invalidPhase.description || "Phase"}: ${positiveDurationError(invalidPhase.estimatedDuration)}`);
      return false;
    }
    return true;
  };

  const handleSaveDraft = () => {
    if (!validateDurationInputs()) return;
    const identity = getQuoteDraftIdentity(form.clientName, form.title);
    if (identity.clientName !== form.clientName || identity.title !== form.title) {
      setForm(prev => ({ ...prev, ...identity }));
    }
    const payload = buildQuotePayload(identity);
    if (draftQuoteId) {
      updateDraftMutation.mutate({ id: draftQuoteId, ...payload, status: "draft" });
    } else {
      createDraftMutation.mutate(payload);
    }
  };

  const handleSubmit = () => {
    if (!form.clientName.trim()) { toast.error("Client name required"); return; }
    if (!form.title.trim()) { toast.error("Quote title required"); return; }
    if (!validateDurationInputs()) return;
    const payload = buildQuotePayload();
    if (editQuote) {
      updateMutation.mutate({ id: editQuote.id, ...payload });
    } else {
      if (draftQuoteId) updateMutation.mutate({ id: draftQuoteId, ...payload });
      else createMutation.mutate(payload);
    }
  };

  const isBusy = createMutation.isPending || updateMutation.isPending || createDraftMutation.isPending || updateDraftMutation.isPending;

  const startWorkspaceResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizeCleanupRef.current?.();
    const startX = event.clientX;
    const startY = event.clientY;
    const startSize = workspaceSize;
    const minWidth = Math.min(760, window.innerWidth - 24);
    const minHeight = Math.min(620, window.innerHeight - 24);
    const maxWidth = Math.max(minWidth, window.innerWidth - 24);
    const maxHeight = Math.max(minHeight, window.innerHeight - 24);
    const onMove = (moveEvent: PointerEvent) => {
      setWorkspaceSize({
        width: Math.min(maxWidth, Math.max(minWidth, startSize.width + moveEvent.clientX - startX)),
        height: Math.min(maxHeight, Math.max(minHeight, startSize.height + moveEvent.clientY - startY)),
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      resizeCleanupRef.current = null;
    };
    resizeCleanupRef.current = onUp;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="!top-1/2 !left-1/2 !flex !flex-col !max-w-none !-translate-x-1/2 !-translate-y-1/2 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-zinc-100"
        style={{ width: workspaceSize.width, height: workspaceSize.height }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-amber-400">{editQuote ? "Edit Quote" : "New Quote"}</DialogTitle>
        </DialogHeader>

        <div className={`mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 content-start gap-3 overflow-y-auto py-2 pr-1 ${isCompactWorkspace ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"}`}>
          {/* Client info */}
          <div className={`grid grid-cols-1 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/35 p-3 ${isCompactWorkspace ? "" : "sm:grid-cols-2"}`}>
            <div className="relative">
              <Label className="text-zinc-400 text-xs mb-1 block">Client Name *</Label>
              <div className="relative">
                <Input
                  ref={clientInputRef}
                  value={clientSearch || form.clientName}
                  onChange={e => {
                    const val = e.target.value;
                    setClientSearch(val);
                    setForm(p => ({ ...p, clientName: val }));
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                  className="bg-zinc-800 border-zinc-700 pr-8"
                  placeholder="Search existing or type new client..."
                  autoComplete="off"
                />
                <User className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              </div>
              {showClientDropdown && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-800 border border-zinc-600 rounded-md shadow-xl max-h-52 overflow-y-auto">
                  {clientResults.length === 0 ? (
                    <div className="px-3 py-2.5 text-xs text-zinc-400 italic">No existing clients found — will create new</div>
                  ) : (
                    clientResults.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectClient(c)}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-700 transition-colors"
                      >
                        <div className="text-xs font-semibold text-zinc-100">{c.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {[c.phone, c.email].filter(Boolean).join(' · ')}
                        </div>
                      </button>
                    ))
                  )}
                  <div className="border-t border-zinc-700 px-3 py-2">
                    <button
                      type="button"
                      onMouseDown={() => {
                        setForm(p => ({ ...p, clientName: clientSearch, clientEmail: "", clientPhone: "", propertyAddress: "" }));
                        setShowClientDropdown(false);
                      }}
                      className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium"
                    >
                      <Plus className="w-3 h-3" /> New Client
                    </button>
                  </div>
                </div>
              )}
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

          {/* Client summary panel */}
          {selectedClientFull && (() => {
            const clientQuotes: any[] = (selectedClientFull as any).quotes ?? [];
            const totalSpent = selectedClientFull.totalSpentCents ?? 0;
            const quoteCount = clientQuotes.length;
            const lastQuote = clientQuotes[0];
            return (
              <div className="rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2.5 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-amber-400 flex items-center gap-1"><Users className="w-3 h-3" /> Existing Client</span>
                  <span className="text-zinc-400">{selectedClientFull.source ?? "manual"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-zinc-300">
                  <div>
                    <div className="text-zinc-500 text-[10px] uppercase tracking-wide">Quotes</div>
                    <div className="font-semibold">{quoteCount}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-[10px] uppercase tracking-wide">Total Spent</div>
                    <div className="font-semibold">{totalSpent > 0 ? `$${(totalSpent / 100).toLocaleString()}` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-[10px] uppercase tracking-wide">Last Quote</div>
                    <div className="font-semibold">{lastQuote ? new Date(lastQuote.createdAt).toLocaleDateString() : "—"}</div>
                  </div>
                </div>
                {lastQuote && (
                  <div className="mt-1.5 text-zinc-400 truncate">
                    Last: <span className="text-zinc-200">{lastQuote.title}</span>
                    {lastQuote.totalCents > 0 && <span className="ml-1 text-green-400">{formatQuoteCents(lastQuote.totalCents)}</span>}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Property + service */}
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/35 p-3 sm:grid-cols-2">
            <div className="col-span-2">
              <Label className="text-zinc-400 text-xs mb-1 block">Property Address</Label>
              <Input value={form.propertyAddress} onChange={e => setForm(p => ({ ...p, propertyAddress: e.target.value }))}
                className="bg-zinc-800 border-zinc-700" placeholder="123 Rural Rd, Vanleer, TN 37181" />
            </div>
            <div className="col-span-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label className="text-sky-200 text-xs font-semibold">Tennessee Parcel ID Lookup</Label>
                  <p className="mt-0.5 text-[11px] text-zinc-400">Find a property by county and Parcel ID. Davidson County uses Nashville Parcel Viewer; other counties use Tennessee Property Viewer. Address and acreage remain editable.</p>
                </div>
                <MapPin className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto]">
                <Input
                  list="service-area-county-options"
                  value={parcelCounty}
                  onChange={(event) => setParcelCounty(event.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="County, e.g. Houston"
                  aria-label="Tennessee parcel county"
                />
                <Input
                  value={parcelId}
                  onChange={(event) => { setParcelId(event.target.value); if (parcelIdError) setParcelIdError(null); }}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); lookupParcel(); } }}
                  className={`bg-zinc-800 ${parcelIdError ? "border-red-500" : "border-zinc-700"}`}
                  placeholder="Parcel ID or Davidson APN"
                  aria-label="Tennessee Parcel ID or Davidson APN"
                  aria-invalid={Boolean(parcelIdError)}
                  aria-describedby={parcelIdError ? "parcel-id-format-error" : undefined}
                />
                <Button type="button" variant="outline" onClick={lookupParcel} disabled={parcelLookupMutation.isPending} className="border-sky-500/50 text-sky-200 hover:bg-sky-500/10">
                  {parcelLookupMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                  {parcelLookupMutation.isPending ? "Looking up" : "Find Property"}
                </Button>
              </div>
              {parcelIdError && <p id="parcel-id-format-error" role="alert" className="mt-1.5 text-[11px] text-red-300">{parcelIdError}</p>}
              <datalist id="service-area-county-options">
                {SERVICE_AREA_COUNTIES.map((county) => <option key={county} value={county.replace(/ County$/, "")} />)}
              </datalist>
              {parcelMatches.length > 0 && (
                <div className="mt-3 space-y-2" aria-live="polite">
                  {parcelMatches.map((match) => (
                    <div key={`${match.county}-${match.parcelId}`} className="rounded border border-zinc-700 bg-zinc-900/70 p-2.5 text-xs">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-zinc-100">{match.address || "Address unavailable"}</p>
                          <p className="mt-0.5 text-zinc-400">Parcel {match.parcelId} · {match.county}{match.deedAcreage ? ` · ${match.deedAcreage.toLocaleString()} acres reported` : ""}</p>
                          <p className="mt-1 text-[10px] font-medium text-sky-300">{isNashvilleParcelViewerUrl(match.propertyViewerUrl) ? "Source: Nashville Parcel Viewer (Metro Nashville)" : "Source: Tennessee Property Viewer"}</p>
                          {match.owner && <p className="mt-0.5 text-zinc-500">Owner record: {match.owner}</p>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {match.propertyViewerUrl && <a href={match.propertyViewerUrl} target="_blank" rel="noreferrer" className="rounded p-1.5 text-sky-300 hover:bg-sky-500/15" title={isNashvilleParcelViewerUrl(match.propertyViewerUrl) ? "Open in Nashville Parcel Viewer" : "Open in Tennessee Property Viewer"}><ExternalLink className="h-3.5 w-3.5" /></a>}
                          <Button type="button" size="sm" className="h-7 bg-sky-600 text-xs hover:bg-sky-500" onClick={() => applyParcelMatch(match)}>Use Property</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedParcel && (
                <div className="mt-3 rounded border border-sky-500/30 bg-sky-950/20 p-2.5 text-xs" aria-live="polite">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sky-100">Property lookup applied</p>
                      <p className="mt-0.5 text-zinc-300">{selectedParcel.owner || "Owner unavailable"}</p>
                      <p className="mt-1 text-[10px] font-medium text-sky-200">{isNashvilleParcelViewerUrl(selectedParcel.propertyViewerUrl) ? "Source: Nashville Parcel Viewer (Metro Nashville)" : "Source: Tennessee Property Viewer"}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedParcel.propertyViewerUrl && (
                        <a href={selectedParcel.propertyViewerUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded border border-sky-500/40 px-2 text-sky-200 hover:bg-sky-500/15">
                          <MapPin className="mr-1 h-3.5 w-3.5" /> {isNashvilleParcelViewerUrl(selectedParcel.propertyViewerUrl) ? "Open Nashville Parcel Viewer Map" : "Open TN Property Viewer Map"}
                        </a>
                      )}
                      {selectedParcel.assessmentDataUrl && (
                        <a href={selectedParcel.assessmentDataUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded border border-sky-500/40 px-2 text-sky-200 hover:bg-sky-500/15">
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Official Assessment Record
                        </a>
                      )}
                    </div>
                  </div>
                  {selectedParcel.assessmentDataUrl && <p className="mt-1.5 text-[10px] text-sky-100/65">Use the official assessment record to view the owner mailing address.</p>}
                </div>
              )}
              {siteVisitCostEstimate && (
                <div className="mt-3 rounded border border-amber-500/35 bg-amber-500/10 p-3" aria-live="polite">
                  <div className="flex items-start gap-2">
                    <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-100">Internal preliminary site-visit cost</p>
                      <p className="mt-0.5 text-lg font-bold text-amber-200">${siteVisitCostEstimate.internalLaborCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
                      <p className="mt-0.5 text-[11px] text-amber-100/85">Based on the retrieved {siteVisitCostEstimate.acreage.toLocaleString()} acres: {siteVisitCostEstimate.basis}.</p>
                      <p className="mt-1 text-[10px] text-amber-100/65">{siteVisitCostEstimate.warning}</p>
                    </div>
                  </div>
                </div>
              )}
              <p className="mt-2 text-[10px] text-zinc-500">{isNashvilleParcelViewerUrl(selectedParcel?.propertyViewerUrl) ? "Nashville Parcel Viewer" : "Tennessee Comptroller parcel"} data is reference information only and is not a legal survey. If no record appears, use the editable address field.</p>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Service Type</Label>
              <Select value={form.serviceType} onValueChange={handleQuoteHeaderServiceChange}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <div>
                <Label className="text-zinc-400 text-xs mb-1 block">{quoteHeaderUsesLinearFeet ? "Measured Linear Feet" : "Acreage"}</Label>
                {quoteHeaderUsesLinearFeet ? (
                  <Input type="number" min="1" step="1" value={quoteHeaderLinearFeetInput} onChange={e => handleQuoteHeaderLinearFeetChange(e.target.value)}
                    className="bg-zinc-800 border-zinc-700" placeholder="e.g. 1,200" aria-label="Measured Linear Feet" />
                ) : (
                  <Input value={form.acreage} onChange={e => setForm(p => ({ ...p, acreage: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700" placeholder="5.2" aria-label="Acreage" />
                )}
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">{quoteHeaderUsesLinearFeet ? "This measured footage drives the selected Linear Foot service calculation. Acreage conversion is not available for this service." : "Acreage drives the selected service calculation."}</p>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-amber-500/35 bg-amber-500/[0.06] p-3">
              <div className="mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-300" /><Label className="text-amber-100 text-xs font-semibold">Overall Estimated Duration</Label></div>
              <Input type="number" min="0.1" step="0.1" value={form.estimatedDuration} onChange={e => setForm(p => ({ ...p, estimatedDuration: e.target.value }))}
                aria-invalid={Boolean(positiveDurationError(form.estimatedDuration))}
                className={`bg-zinc-900 text-zinc-100 ${positiveDurationError(form.estimatedDuration) ? "border-red-500" : "border-amber-500/35"}`} placeholder="e.g. 2.5" aria-label="Overall estimated duration" />
              {positiveDurationError(form.estimatedDuration) ? <p className="mt-1.5 text-[10px] text-red-300">{positiveDurationError(form.estimatedDuration)}</p> : <p className="mt-1.5 text-[10px] leading-relaxed text-amber-100/70">Enter a positive number of working days for the complete quote. Phase sections below can carry their own individual duration estimates.</p>}
            </div>
          </div>

          <details open className={`rounded-lg border border-sky-500/25 bg-sky-500/[0.035] p-3 ${isCompactWorkspace ? "" : "col-span-2"}`}>
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-200"><Tractor className="h-4 w-4" /> Internal equipment, site evidence & insurance</summary>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">Keep rental costs inside the job-cost review. They are never added as customer-facing quote lines. Photos and measurements give AI Suggest better project context; all results still require your site verification.</p>
            <div className={`mt-3 grid gap-3 ${isCompactWorkspace ? "grid-cols-1" : "lg:grid-cols-2"}`}>
              <section className="rounded-md border border-sky-500/20 bg-zinc-950/30 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="text-xs font-semibold text-sky-100">Cat rental equipment — internal cost</p><p className="mt-0.5 text-[10px] text-zinc-500">Enter a confirmed dealer quote, not estimated public rates.</p></div>
                  <a href="https://rent.cat.com/en_US" target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded border border-sky-500/40 px-2 text-[10px] font-medium text-sky-200 hover:bg-sky-500/10"><ExternalLink className="mr-1 h-3 w-3" />Open Cat Rental Store</a>
                </div>
                <div className="mt-2 space-y-2">
                  {form.rentalEquipment.map((rental, index) => (
                    <div key={index} className="rounded border border-zinc-700 bg-zinc-900/70 p-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input value={rental.equipmentName} onChange={e => setForm(current => ({ ...current, rentalEquipment: current.rentalEquipment.map((item, itemIndex) => itemIndex === index ? { ...item, equipmentName: e.target.value } : item) }))} className="h-8 bg-zinc-800 text-xs" placeholder="Equipment, e.g. Compact track loader" />
                        <Input value={rental.dealerLocation ?? ""} onChange={e => setForm(current => ({ ...current, rentalEquipment: current.rentalEquipment.map((item, itemIndex) => itemIndex === index ? { ...item, dealerLocation: e.target.value } : item) }))} className="h-8 bg-zinc-800 text-xs" placeholder="Dealer or location" />
                        <Input type="number" min="0" step="1" value={rental.rentalDays ?? ""} onChange={e => setForm(current => ({ ...current, rentalEquipment: current.rentalEquipment.map((item, itemIndex) => itemIndex === index ? { ...item, rentalDays: e.target.value ? Number(e.target.value) : undefined } : item) }))} className="h-8 bg-zinc-800 text-xs" placeholder="Rental days" />
                        <Input value={rental.quoteReference ?? ""} onChange={e => setForm(current => ({ ...current, rentalEquipment: current.rentalEquipment.map((item, itemIndex) => itemIndex === index ? { ...item, quoteReference: e.target.value } : item) }))} className="h-8 bg-zinc-800 text-xs" placeholder="Dealer quote/reference" />
                        <label className="text-[10px] text-zinc-400">Rental <Input type="number" min="0" step="1" value={rental.rentalCostCents ? rental.rentalCostCents / 100 : ""} onChange={e => setForm(current => ({ ...current, rentalEquipment: current.rentalEquipment.map((item, itemIndex) => itemIndex === index ? { ...item, rentalCostCents: quoteDollarsToCents(Number(e.target.value) || 0) } : item) }))} className="mt-1 h-8 bg-zinc-800 text-xs" placeholder="$0" /></label>
                        <label className="text-[10px] text-zinc-400">Transport <Input type="number" min="0" step="1" value={rental.transportCostCents ? rental.transportCostCents / 100 : ""} onChange={e => setForm(current => ({ ...current, rentalEquipment: current.rentalEquipment.map((item, itemIndex) => itemIndex === index ? { ...item, transportCostCents: quoteDollarsToCents(Number(e.target.value) || 0) } : item) }))} className="mt-1 h-8 bg-zinc-800 text-xs" placeholder="$0" /></label>
                        <label className="text-[10px] text-zinc-400">Tax/fees <Input type="number" min="0" step="1" value={rental.taxCostCents ? rental.taxCostCents / 100 : ""} onChange={e => setForm(current => ({ ...current, rentalEquipment: current.rentalEquipment.map((item, itemIndex) => itemIndex === index ? { ...item, taxCostCents: quoteDollarsToCents(Number(e.target.value) || 0) } : item) }))} className="mt-1 h-8 bg-zinc-800 text-xs" placeholder="$0" /></label>
                        <Button type="button" size="sm" variant="ghost" className="mt-4 h-8 text-xs text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => setForm(current => ({ ...current, rentalEquipment: current.rentalEquipment.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-2"><Button type="button" size="sm" variant="outline" className="h-7 border-sky-500/40 text-xs text-sky-100" onClick={() => setForm(current => ({ ...current, rentalEquipment: [...current.rentalEquipment, emptyRentalEquipment()] }))}><Plus className="mr-1 h-3 w-3" />Add rental equipment</Button><label className="text-[10px] text-zinc-400">Customer rental markup<select value={form.rentalMarkupPct} onChange={event => setForm(current => ({ ...current, rentalMarkupPct: Number(event.target.value) }))} className="mt-1 block h-7 rounded border border-sky-500/40 bg-zinc-800 px-2 text-xs text-sky-100"><option value={10}>10%</option><option value={11}>11%</option><option value={12}>12%</option><option value={13}>13%</option><option value={14}>14%</option><option value={15}>15%</option><option value={16}>16%</option><option value={17}>17%</option><option value={18}>18%</option><option value={19}>19%</option><option value={20}>20%</option></select></label><div className="text-right text-xs"><span className="block font-semibold text-sky-200">Internal rental cost: {formatQuoteCents(internalRentalCostCents)}</span><span className="text-[10px] text-sky-100/70">Included in customer total: {formatQuoteCents(rentalCustomerQuote.rentalCustomerChargeCents)} ({form.rentalMarkupPct}% markup)</span></div></div>
              </section>

              <section className={`rounded-md border p-3 ${RENTAL_MARGIN_TONE_CLASSES[rentalOnlyMarginStatus.tone]}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="flex items-center gap-1 text-xs font-semibold">Live customer total preview<QuoteFormulaTooltip><TooltipTrigger asChild><button type="button" aria-label="View internal rental cost breakdown" className="rounded text-current/80 hover:text-current focus:outline-none focus-visible:ring-1 focus-visible:ring-current"><Info className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-[300px] border border-sky-500/35 bg-zinc-950 text-zinc-100"><p className="font-semibold text-sky-200">Internal rental cost breakdown</p><div className="mt-2 space-y-1 text-xs"><p>Base service cost: {formatQuoteCents(serviceTotalCents)}</p><p>Raw rental cost: {formatQuoteCents(internalRentalCostCents)}</p><p>Applied markup: {form.rentalMarkupPct}% / {formatQuoteCents(rentalCustomerQuote.rentalMarkupCents)}</p><p>Marked-up rental component: {formatQuoteCents(rentalCustomerQuote.rentalCustomerChargeCents)}</p><p className="border-t border-zinc-700 pt-1 font-semibold">Final customer total: {formatQuoteCents(totalCents)}</p></div><p className="mt-2 text-[10px] leading-relaxed text-zinc-400">Internal only. Rental-only margin excludes labor, fuel, machine wear, overhead, and other job costs.</p></TooltipContent></QuoteFormulaTooltip></p><p className="mt-0.5 text-[10px] leading-relaxed text-zinc-300">Updates immediately when rental cost or markup changes. This is a rental-cost screening view, not full job profit.</p></div>
                  <div className="text-right"><p className="text-lg font-bold">{formatQuoteCents(totalCents)}</p><p className="text-[10px]">{rentalOnlyMarginPct === null ? "Add rental cost" : `${rentalOnlyMarginPct.toFixed(1)}% rental-only margin · ${rentalOnlyMarginStatus.label}`}</p></div>
                </div>
              </section>

              <section className="rounded-md border border-amber-500/20 bg-zinc-950/30 p-3">
                <div className="flex items-start gap-2"><Camera className="mt-0.5 h-4 w-4 text-amber-300" /><div><p className="text-xs font-semibold text-amber-100">Site photos for AI Suggest</p><p className="mt-0.5 text-[10px] text-zinc-500">JPG, PNG, or WebP; up to 10 MB each. Images are compressed in your browser before upload when it reduces size. AI Suggest can review up to 20 saved photos. Photos stay internal unless you include an AI-captioned reference in the customer PDF.</p></div></div>
                <label onDragEnter={event => { event.preventDefault(); if (uploadingKind === null) setIsEvidenceDragging(true); }} onDragOver={event => event.preventDefault()} onDragLeave={event => { event.preventDefault(); setIsEvidenceDragging(false); }} onDrop={handleEvidenceDrop} className={`mt-2 flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-3 py-2 text-center transition-colors ${isEvidenceDragging ? "border-amber-300 bg-amber-500/15" : "border-amber-500/40 hover:bg-amber-500/10"}`}><Camera className="mb-1 h-4 w-4 text-amber-300" /><span className="text-[11px] font-medium text-amber-100">{uploadingKind === "evidence" ? "Uploading site photos…" : "Drop up to 20 site photos here or click to browse"}</span><span className="mt-0.5 text-[10px] text-zinc-400">JPG, PNG, or WebP · 10 MB each · {form.quoteEvidence.length}/{MAX_QUOTE_EVIDENCE_PHOTOS} attached</span><input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingKind !== null} onChange={event => { void uploadQuoteFiles("evidence", event.target.files); event.currentTarget.value = ""; }} /></label>
                {uploadProgress?.kind === "evidence" && <div className="mt-2" role="status" aria-live="polite"><div className="mb-1 flex justify-between text-[10px] text-amber-100"><span>{uploadProgress.stage === "compressing" ? "Compressing site photos" : "Uploading site photos"}</span><span>{uploadProgress.completed} of {uploadProgress.total}</span></div><Progress value={(uploadProgress.completed / uploadProgress.total) * 100} className="h-1.5 bg-zinc-800" /></div>}
                {form.quoteEvidence.length > 0 && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{form.quoteEvidence.map((attachment, index) => <div key={attachment.key} className="overflow-hidden rounded border border-zinc-700 bg-zinc-950/45"><div className="group relative"><a href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={attachment.caption || attachment.filename} className="h-16 w-full object-cover" /></a><div className="absolute right-0 top-0 flex rounded-bl bg-zinc-950/90"><button type="button" aria-label={`Move ${attachment.filename} earlier`} title="Move earlier" disabled={index === 0} className="p-1 text-zinc-200 disabled:opacity-30 hover:text-amber-200" onClick={() => setForm(current => { const evidence = [...current.quoteEvidence]; [evidence[index - 1], evidence[index]] = [evidence[index], evidence[index - 1]]; return { ...current, quoteEvidence: evidence }; })}><ChevronLeft className="h-3 w-3" /></button><button type="button" aria-label={`Move ${attachment.filename} later`} title="Move later" disabled={index === form.quoteEvidence.length - 1} className="p-1 text-zinc-200 disabled:opacity-30 hover:text-amber-200" onClick={() => setForm(current => { const evidence = [...current.quoteEvidence]; [evidence[index], evidence[index + 1]] = [evidence[index + 1], evidence[index]]; return { ...current, quoteEvidence: evidence }; })}><ChevronRight className="h-3 w-3" /></button><button type="button" aria-label={`Remove ${attachment.filename}`} title="Remove" className="p-1 text-zinc-200 hover:text-red-300" onClick={() => setForm(current => ({ ...current, quoteEvidence: current.quoteEvidence.filter(item => item.key !== attachment.key) }))}><X className="h-3 w-3" /></button></div></div>{attachment.caption || attachment.tags?.length ? <div className="space-y-1 px-1.5 py-1"><p className="line-clamp-2 text-[10px] leading-snug text-zinc-200">{attachment.caption}</p>{attachment.tags && attachment.tags.length > 0 && <div className="flex flex-wrap gap-1">{attachment.tags.map(tag => <span key={tag} className="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] text-amber-100">{tag}</span>)}</div>}</div> : <p className="px-1.5 py-1 text-[10px] text-zinc-500">Caption added with AI Suggest</p>}</div>)}</div>}
                {form.quoteEvidence.some((attachment) => attachment.caption) && <div className="mt-2 rounded border border-sky-500/25 bg-sky-500/[0.04] p-2"><p className="text-[10px] font-medium text-sky-100">Customer quote PDF photo references</p><p className="mt-0.5 text-[10px] text-zinc-400">Selected photos, captions, and tags appear in the customer portal and its Download PDF. Internal cost details do not.</p><div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">{form.quoteEvidence.filter((attachment) => attachment.caption).map((attachment) => <label key={`pdf-${attachment.key}`} className="inline-flex items-center gap-1.5 text-[10px] text-sky-100"><input type="checkbox" checked={attachment.includeInCustomerPdf !== false} onChange={(event) => setForm((current) => ({ ...current, quoteEvidence: current.quoteEvidence.map((item) => item.key === attachment.key ? { ...item, includeInCustomerPdf: event.target.checked } : item) }))} />{attachment.filename}</label>)}</div></div>}
                {captionEvidenceMutation.isPending && <p className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-100" role="status" aria-live="polite"><Loader2 className="h-3 w-3 animate-spin" />Writing internal photo captions and site-detail tags…</p>}
                <div className="mt-3 border-t border-zinc-800 pt-3"><div className="flex items-start gap-2"><Ruler className="mt-0.5 h-4 w-4 text-amber-300" /><div><p className="text-xs font-semibold text-amber-100">Measurements</p><p className="mt-0.5 text-[10px] text-zinc-500">Examples: corridor width, slope, access gate, or work-area acreage.</p></div></div>
                  <div className="mt-2 space-y-1.5">{form.quoteMeasurements.map((measurement, index) => <div key={index} className="grid grid-cols-[1fr_0.7fr_0.55fr_auto] gap-1.5"><Input value={measurement.label} onChange={e => setForm(current => ({ ...current, quoteMeasurements: current.quoteMeasurements.map((item, itemIndex) => itemIndex === index ? { ...item, label: e.target.value } : item) }))} className="h-7 bg-zinc-800 text-[11px]" placeholder="Measurement" /><Input value={measurement.value} onChange={e => setForm(current => ({ ...current, quoteMeasurements: current.quoteMeasurements.map((item, itemIndex) => itemIndex === index ? { ...item, value: e.target.value } : item) }))} className="h-7 bg-zinc-800 text-[11px]" placeholder="Value" /><Input value={measurement.unit} onChange={e => setForm(current => ({ ...current, quoteMeasurements: current.quoteMeasurements.map((item, itemIndex) => itemIndex === index ? { ...item, unit: e.target.value } : item) }))} className="h-7 bg-zinc-800 text-[11px]" placeholder="Unit" /><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-300" onClick={() => setForm(current => ({ ...current, quoteMeasurements: current.quoteMeasurements.filter((_, itemIndex) => itemIndex !== index) }))}><X className="h-3.5 w-3.5" /></Button></div>)}</div>
                  <Button type="button" size="sm" variant="ghost" className="mt-1.5 h-7 px-1 text-[10px] text-amber-200 hover:bg-amber-500/10" onClick={() => setForm(current => ({ ...current, quoteMeasurements: [...current.quoteMeasurements, { label: "", value: "", unit: "", notes: "" }] }))}><Plus className="mr-1 h-3 w-3" />Add measurement</Button>
                </div>
              </section>
            </div>
            <section className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/[0.035] p-3"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" /><div><p className="text-xs font-semibold text-emerald-100">Proof of insurance for the quote email</p><p className="mt-0.5 text-[10px] text-zinc-500">Add your current certificate here. When you send the quote, choose the file(s) to attach. It is not shown in the portal.</p></div></div><label className="mt-2 inline-flex h-7 cursor-pointer items-center rounded border border-emerald-500/40 px-2 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/10"><ShieldCheck className="mr-1 h-3 w-3" />{uploadingKind === "insurance" ? "Uploading…" : "Add proof of insurance"}<input type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png" multiple disabled={uploadingKind !== null} onChange={event => { void uploadQuoteFiles("insurance", event.target.files); event.currentTarget.value = ""; }} /></label>{form.insuranceDocuments.length > 0 && <ul className="mt-2 space-y-1">{form.insuranceDocuments.map((document) => <li key={document.key} className="flex items-center justify-between gap-2 rounded bg-zinc-900/70 px-2 py-1.5 text-[11px]"><button type="button" onClick={() => openInsurancePreview(document)} className="min-w-0 flex-1 truncate text-left text-emerald-100 hover:underline">{document.filename}</button><button type="button" className="rounded p-0.5 text-emerald-200 hover:bg-emerald-500/10" aria-label={`Preview ${document.filename}`} title="Preview document" onClick={() => openInsurancePreview(document)}><Eye className="h-3.5 w-3.5" /></button><button type="button" className="text-zinc-400 hover:text-red-300" aria-label={`Remove ${document.filename}`} onClick={() => setForm(current => ({ ...current, insuranceDocuments: current.insuranceDocuments.filter(item => item.key !== document.key) }))}><X className="h-3.5 w-3.5" /></button></li>)}</ul>}</section>
            {insuranceLibrary.length > 0 && <section className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/[0.025] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold text-emerald-100">Saved proof-of-insurance library</p><p className="mt-0.5 text-[10px] text-zinc-500">Preview, select, or remove an outdated certificate. Removed files are no longer selectable for new quote emails.</p></div><span className="text-[10px] text-emerald-100/70">Internal only</span></div>
              <div className="mt-2 grid gap-1.5 md:grid-cols-2">{insuranceLibrary.map((document) => {
                const added = form.insuranceDocuments.some((item) => item.key === document.storageKey);
                return <div key={document.id} className="flex items-center gap-2 rounded bg-zinc-900/70 px-2 py-1.5 text-[11px]"><FileText className="h-3.5 w-3.5 shrink-0 text-emerald-300" /><span className="min-w-0 flex-1 truncate text-zinc-200">{document.label}</span><button type="button" onClick={() => openInsurancePreview({ filename: document.filename, url: document.storageUrl, mimeType: document.mimeType })} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-emerald-200 hover:bg-emerald-500/10" aria-label={`Preview ${document.label}`} title="Preview document"><Eye className="h-3.5 w-3.5" /></button><Button type="button" size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-emerald-200 hover:bg-emerald-500/10" disabled={added} onClick={() => setForm((current) => ({ ...current, insuranceDocuments: [...current.insuranceDocuments, { key: document.storageKey, url: document.storageUrl, filename: document.filename, mimeType: document.mimeType as QuoteInsuranceDocument["mimeType"], sizeBytes: document.sizeBytes }] }))}>{added ? "Selected" : "Use"}</Button><Button type="button" size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-zinc-400 hover:bg-red-500/10 hover:text-red-200" aria-label={`Remove ${document.label} from the saved insurance library`} onClick={() => { if (window.confirm(`Remove ${document.label} from the saved insurance library? It will no longer be selectable for new quote emails.`)) archiveInsuranceLibraryMutation.mutate({ id: document.id }); }}>Remove</Button></div>;
              })}</div>
            </section>}
            {form.insuranceDocuments.length > 0 && <div className="mt-2 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" className="h-7 border-emerald-500/35 text-[10px] text-emerald-100 hover:bg-emerald-500/10" disabled={saveInsuranceLibraryMutation.isPending} onClick={() => { const unsaved = form.insuranceDocuments.find((document) => !insuranceLibrary.some((libraryDocument) => libraryDocument.storageKey === document.key)); if (!unsaved) { toast.message("All attached insurance documents are already saved in your library."); return; } saveInsuranceLibraryMutation.mutate({ ...unsaved, label: unsaved.filename, expiresAt: null }); }}><FileText className="mr-1 h-3 w-3" />{saveInsuranceLibraryMutation.isPending ? "Saving…" : "Save attached document to library"}</Button></div>}
            <section className={`mt-3 rounded-md border p-3 ${RENTAL_MARGIN_TONE_CLASSES[rentalOnlyMarginStatus.tone]}`}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold">Internal rental-only margin</p><p className="mt-0.5 text-[10px] leading-relaxed text-zinc-300">Quote total less Cat rental, transport, and tax. This is not full job profit—it excludes labor, fuel, machine wear, overhead, and all other job costs.</p></div><div className="text-right"><p className="text-base font-bold">{rentalOnlyMarginPct === null ? "—" : `${rentalOnlyMarginPct.toFixed(1)}%`}</p><p className="text-[10px]">{rentalOnlyMarginStatus.label}</p></div></div>
              <div className="mt-2 grid gap-2 text-[11px] text-zinc-200 sm:grid-cols-3"><div className="rounded bg-zinc-950/35 px-2 py-1.5"><span className="block text-[9px] uppercase tracking-wide text-zinc-400">Customer quote</span>{formatQuoteCents(totalCents)}</div><div className="rounded bg-zinc-950/35 px-2 py-1.5"><span className="block text-[9px] uppercase tracking-wide text-zinc-400">Cat rental cost</span>{formatQuoteCents(internalRentalCostCents)}</div><div className="rounded bg-zinc-950/35 px-2 py-1.5"><span className="block text-[9px] uppercase tracking-wide text-zinc-400">Rental-only contribution</span>{internalRentalCostCents > 0 ? formatQuoteCents(rentalOnlyProfitCents) : "Add rental cost"}</div></div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-zinc-200/80">Gemini 3 Flash uses saved photos and measurements only as internal review context.</span><Button type="button" size="sm" variant="outline" className="h-7 border-sky-500/45 text-[10px] text-sky-100 hover:bg-sky-500/10" disabled={!draftQuoteId || (form.quoteEvidence.length === 0 && form.quoteMeasurements.length === 0) || reviewCostMutation.isPending} onClick={() => { if (!draftQuoteId) { toast.message("Save this quote as a draft before generating an internal cost review."); return; } reviewCostMutation.mutate({ id: draftQuoteId }); }}><Sparkles className="mr-1 h-3 w-3" />{reviewCostMutation.isPending ? "Reviewing…" : "Generate concise cost review"}</Button></div>
              {!draftQuoteId && <p className="mt-2 text-[10px] text-amber-200">Save as a draft first to generate and retain this review.</p>}
              {draftQuoteId && form.quoteEvidence.length === 0 && form.quoteMeasurements.length === 0 && <p className="mt-2 text-[10px] text-amber-200">Add a site photo or measurement before generating the review.</p>}
              {form.aiCostReview && <div className="mt-3 rounded border border-sky-500/20 bg-zinc-950/40 px-3 py-2 text-[11px] leading-relaxed text-sky-100"><span className="font-semibold">Latest internal cost review:</span> {form.aiCostReview}</div>}
              {form.aiRecommendedRentalMarkupPct !== null && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2 text-[11px] text-sky-100"><div><span className="font-semibold">Suggested rental markup: {form.aiRecommendedRentalMarkupPct}%</span>{form.aiMarkupRecommendationReason && <span className="ml-1 text-sky-100/80">— {form.aiMarkupRecommendationReason}</span>}<p className="mt-1 text-[10px] text-sky-100/65">Evidence-based internal suggestion only. Review before applying.</p></div><Button type="button" size="sm" variant="outline" className="h-7 border-sky-500/45 text-[10px] text-sky-100 hover:bg-sky-500/10" disabled={form.rentalMarkupPct === form.aiRecommendedRentalMarkupPct} onClick={() => setForm(current => ({ ...current, rentalMarkupPct: current.aiRecommendedRentalMarkupPct ?? current.rentalMarkupPct }))}>{form.rentalMarkupPct === form.aiRecommendedRentalMarkupPct ? "Applied" : `Use ${form.aiRecommendedRentalMarkupPct}%`}</Button></div>}
              {form.aiCostFlags.length > 0 && <div className="mt-2 rounded border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-100">Cost categories to verify</p><div className="mt-1.5 flex flex-wrap gap-1.5">{form.aiCostFlags.map((flag, index) => <span key={`${flag.category}-${index}`} className="rounded-full border border-amber-500/30 bg-zinc-950/45 px-2 py-1 text-[10px] text-amber-100"><strong className="capitalize">{flag.category.replace("_", " ")}:</strong> {flag.reason}</span>)}</div></div>}
            </section>
            {isEvidenceReviewStale ? <div className="mt-3 rounded border border-sky-500/30 bg-sky-500/[0.07] px-3 py-2 text-[11px] leading-relaxed text-sky-100" role="status"><span className="font-semibold">Site evidence changed.</span> Run AI Suggest or Generate concise cost review again before relying on an AI evidence conclusion.</div> : form.aiEvidenceSummary && <div className="mt-3 rounded border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100"><span className="font-semibold">Last AI evidence review:</span> {form.aiEvidenceSummary}</div>}
          </details>

          {/* AI Suggest panel */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">AI Suggest</span>
                <span className="text-xs text-zinc-500">{aiUsesLinearFeet ? "Build footage-based line items, duration, and client message" : "Auto-fill line items, duration, and client message"}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                onClick={() => {
                  setAiPanel(p => p === "closed" ? "open" : "closed");
                }}
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
                {aiUsesLinearFeet ? <div className="space-y-2 rounded border border-sky-500/25 bg-sky-500/[0.04] p-2.5">
                  <p className="text-xs font-medium text-sky-100">Footage basis: Measured Linear Feet</p>
                  <p className="text-xs text-zinc-500">Fence Line Clearing, Trail Cutting, and Right-of-Way Clearing use measured Linear Feet only. The current per-foot rate is used when entered; otherwise, the approved internal rate is used.</p>
                </div> : <p className="text-xs text-zinc-500">Requires service type and acreage to be filled in above.</p>}
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-8 text-xs"
                  onClick={handleAiSuggest}
                  disabled={aiPanel === "loading"}
                  type="button"
                >
                  {aiPanel === "loading" ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{form.quoteEvidence.length > 0 ? `Reviewing ${Math.min(form.quoteEvidence.length, MAX_QUOTE_EVIDENCE_PHOTOS)} site photo${Math.min(form.quoteEvidence.length, MAX_QUOTE_EVIDENCE_PHOTOS) === 1 ? "" : "s"}…` : "Generating suggestion…"}</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate AI Suggestion</>
                  )}
                </Button>
                {aiPanel === "loading" && form.quoteEvidence.length >= 6 && <div className="rounded border border-amber-500/25 bg-zinc-950/35 px-2.5 py-2" role="status" aria-live="polite"><div className="flex items-center gap-2 text-[11px] text-amber-100"><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Preparing the visual review for {Math.min(form.quoteEvidence.length, MAX_QUOTE_EVIDENCE_PHOTOS)} saved photos. Larger evidence sets can take a little longer.</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800"><div className="h-full w-2/5 animate-pulse rounded-full bg-amber-400" /></div></div>}
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
                      Suggested total ({formatQuoteCents(aiSuggestion.totalCents)}) is below the minimum job total
                      of {formatQuoteCents(aiSuggestion.minimumJobCents)}. Review line items before applying.
                    </p>
                  </div>
                )}
                {aiSuggestion.breakdown.quantitySource === "acreage_estimate" && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <p className="text-xs leading-relaxed text-amber-100"><strong>Estimated Linear Footage — verify on site.</strong> {aiSuggestion.breakdown.linearFeet?.toLocaleString()} linear feet was calculated from {aiSuggestion.breakdown.sourceAcreage} acres at a {aiSuggestion.breakdown.clearingWidthFeet}-foot clearing width.</p>
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
                          `Service: ${aiPrimaryService?.label ?? form.serviceType}`,
                          aiSuggestion.breakdown.measurementUnit === "linear_foot" ? `Linear feet: ${aiSuggestion.breakdown.linearFeet?.toLocaleString() ?? 0} linear ft` : `Acreage: ${aiSuggestion.breakdown.acreage ?? 0} acres`,
                          aiSuggestion.breakdown.quantitySource === "acreage_estimate" ? `Footage basis: ${aiSuggestion.breakdown.sourceAcreage} acres at ${aiSuggestion.breakdown.clearingWidthFeet} ft clearing width (verify on site)` : null,
                          aiSuggestion.breakdown.measurementUnit === "linear_foot" ? `Base rate: $${aiSuggestion.breakdown.baseRateLow.toLocaleString()}/linear ft` : `Base rate range: $${aiSuggestion.breakdown.baseRateLow.toLocaleString()} – $${aiSuggestion.breakdown.baseRateHigh.toLocaleString()}/acre`,
                          aiSuggestion.breakdown.measurementUnit === "linear_foot" ? `Adjusted rate: $${aiSuggestion.breakdown.baseRatePerAcre.toLocaleString()}/linear ft` : `Mid-point rate: $${aiSuggestion.breakdown.baseRatePerAcre.toLocaleString()}/acre`,
                          `Terrain multiplier: x${tMult.toFixed(2)} (${aiTerrain})`,
                          `Access multiplier: x${aMult.toFixed(2)} (${aiAccess})`,
                          `Raw total: $${aiSuggestion.breakdown.rawTotalBeforeMinimum.toLocaleString()}`,
                          aiSuggestion.breakdown.minimumJobApplied ? `Minimum job applied: Yes — bumped to ${formatQuoteCents(aiSuggestion.minimumJobCents)}` : null,
                          `Suggested total: ${formatQuoteCents(aiSuggestion.totalCents)}`,
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
                    <span className="text-zinc-500">{aiSuggestion.breakdown.measurementUnit === "linear_foot" ? "Base rate" : "Base rate range"}</span>
                    <span className="text-zinc-200">{aiSuggestion.breakdown.measurementUnit === "linear_foot" ? `$${aiSuggestion.breakdown.baseRateLow.toLocaleString()}/linear ft` : `$${aiSuggestion.breakdown.baseRateLow.toLocaleString()} – $${aiSuggestion.breakdown.baseRateHigh.toLocaleString()}/acre`}</span>
                    <span className="text-zinc-500">{aiSuggestion.breakdown.measurementUnit === "linear_foot" ? "Adjusted rate" : "Mid-point rate"}</span>
                    <span className="text-zinc-200">${aiSuggestion.breakdown.baseRatePerAcre.toLocaleString()}/{aiSuggestion.breakdown.measurementUnit === "linear_foot" ? "linear ft" : "acre"}</span>

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

                    <span className="text-zinc-500">{aiSuggestion.breakdown.measurementUnit === "linear_foot" ? "Linear feet" : "Acreage"}</span>
                    <span className="text-zinc-200">{aiSuggestion.breakdown.measurementUnit === "linear_foot" ? `${aiSuggestion.breakdown.linearFeet?.toLocaleString() ?? 0} linear ft` : `${aiSuggestion.breakdown.acreage ?? 0} acres`}</span>
                    {aiSuggestion.breakdown.quantitySource === "acreage_estimate" && <><span className="text-zinc-500">Footage basis</span><span className="text-amber-200">{aiSuggestion.breakdown.sourceAcreage} acres at {aiSuggestion.breakdown.clearingWidthFeet} ft — verify on site</span></>}
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
                    {formatQuoteCents(aiSuggestion.totalCents)}
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
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/35 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <Label className="text-zinc-400 text-xs">Line Items</Label>
              <div className="flex flex-wrap gap-1.5">
                {phaseSections.length === 0 && <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-amber-500/40 text-amber-200 hover:bg-amber-500/10" onClick={convertNormalQuoteToPhase}><ArrowRight className="mr-1 h-3 w-3" />Convert to Phase 1</Button>}
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-amber-500/40 text-amber-200 hover:bg-amber-500/10" onClick={() => addControlledLineItem("phase")}>+ Phase</Button>
                {phaseSections.length === 0 && <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-sky-500/40 text-sky-200 hover:bg-sky-500/10" onClick={() => addControlledLineItem("full_operating_day")}>+ Full Day</Button>}
                {phaseSections.length === 0 && <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-sky-500/40 text-sky-200 hover:bg-sky-500/10" onClick={() => addControlledLineItem("half_operating_day")}>+ Half Day</Button>}
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-zinc-600" onClick={() => setForm(p => ({ ...p, lineItems: [...p.lineItems, { ...createQuoteServiceLineItem(), kind: "service" }] }))}>
                  <Plus className="h-3 w-3 mr-1" /> {phaseSections.length > 0 ? "Unassigned Line" : "Add Line"}
                </Button>
              </div>
            </div>
            {!editQuote && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-indigo-500/25 bg-indigo-500/[0.06] px-3 py-2"><p className="text-[11px] text-indigo-100">This quote starts as a normal job. Use <strong>+ Phase</strong> only when the customer needs separately approved work sections.</p><Button type="button" size="sm" variant="outline" className="h-7 border-indigo-400/40 text-[11px] text-indigo-100 hover:bg-indigo-500/15" onClick={loadSamplePhasedQuote}>Load Optional Phase Sample</Button></div>}
            {phaseSections.length > 0 && <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">Each phase is its own work section. Add services, mobilization, and eligible discounts inside the intended phase so its subtotal and customer portal amount remain accurate.</p>}
            <div className="space-y-3">
              {phaseSections.map((section, sectionIndex) => {
                const phaseId = section.phase.phaseId!;
                const phaseIndex = form.lineItems.findIndex((item) => item.kind === "phase" && item.phaseId === phaseId);
                const scopedIndices = section.itemIndices.filter((index) => index !== phaseIndex);
                const scopedCodes = new Set(scopedIndices.map((index) => form.lineItems[index].discountCode).filter((code): code is string => Boolean(code)));
                return <div key={phaseId} className={`rounded-lg border p-3 ${section.phase.phaseAuthorization === "optional_future" ? "border-indigo-500/35 bg-indigo-500/[0.05]" : "border-amber-500/35 bg-amber-500/[0.05]"}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div><p className={`text-xs font-semibold ${section.phase.phaseAuthorization === "optional_future" ? "text-indigo-200" : "text-amber-200"}`}>Phase {sectionIndex + 1} Section</p><p className="mt-0.5 text-[10px] text-zinc-500">Phase header is no-charge. Price the scoped work below.</p></div>
                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => removePhaseSection(phaseId)}>Remove phase section</Button>
                  </div>
                  <LineItemRow item={section.phase} index={phaseIndex} onChange={handleLineItemChange} onMove={handleMoveLineItem} compact={isCompactWorkspace} phaseOptions={[]} onRemove={() => removePhaseSection(phaseId)} />
                  <div className="mt-2 space-y-2 border-t border-zinc-800 pt-2">
                    {scopedIndices.map((index) => <LineItemRow key={index} item={form.lineItems[index]} index={index} onChange={handleLineItemChange} onMove={handleMoveLineItem} compact={isCompactWorkspace} phaseOptions={phaseOptions} onRemove={i2 => setForm(p => ({ ...p, lineItems: p.lineItems.filter((_, itemIndex) => itemIndex !== i2) }))} />)}
                    {scopedIndices.length === 0 && <p className="rounded border border-dashed border-zinc-700 px-3 py-2 text-[11px] text-zinc-500">Add the services and charges that belong to this phase.</p>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-800 pt-3">
                    <Button type="button" size="sm" variant="outline" className="h-7 border-zinc-600 text-[11px] text-zinc-200 hover:bg-zinc-800" onClick={() => addLineItemToPhase(phaseId, { ...createQuoteServiceLineItem(), kind: "service" })}><Plus className="mr-1 h-3 w-3" />Service</Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 border-sky-500/40 text-[11px] text-sky-200 hover:bg-sky-500/10" onClick={() => addLineItemToPhase(phaseId, { description: "Mobilization", qty: 1, unitPriceCents: 0, totalCents: 0, kind: "mobilization" })}>+ Mobilization</Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 border-sky-500/40 text-[11px] text-sky-200 hover:bg-sky-500/10" onClick={() => addLineItemToPhase(phaseId, { ...createQuoteWorkLineItem("full_operating_day") })}>+ Full Day</Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 border-sky-500/40 text-[11px] text-sky-200 hover:bg-sky-500/10" onClick={() => addLineItemToPhase(phaseId, { ...createQuoteWorkLineItem("half_operating_day") })}>+ Half Day</Button>
                    {volumeDiscount && <Button type="button" size="sm" variant="outline" onClick={() => applyDiscountOption(volumeDiscount, phaseId)} disabled={scopedCodes.has(volumeDiscount.code)} className="h-7 border-emerald-500/35 text-[11px] text-emerald-200 hover:bg-emerald-500/10">{scopedCodes.has(volumeDiscount.code) ? `${volumeDiscount.percent}% Volume Applied` : `${volumeDiscount.percent}% Volume`}</Button>}
                    {customerDiscountOptions.map((option) => <Button key={option.code} type="button" size="sm" variant="outline" onClick={() => applyDiscountOption(option, phaseId)} disabled={scopedCodes.has(option.code)} className="h-7 border-emerald-500/35 text-[11px] text-emerald-200 hover:bg-emerald-500/10">{scopedCodes.has(option.code) ? `${option.label.replace(" Discount", "")} Applied` : `${option.percent}% ${option.label.replace(" Discount", "")}`}</Button>)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 border-t border-zinc-800 pt-3 text-xs"><span className="text-zinc-400">Phase subtotal <strong className="ml-1 text-zinc-100">{formatQuoteCents(section.subtotalCents)}</strong></span>{section.discountCents < 0 && <span className="text-emerald-300">Phase discounts {formatQuoteCents(section.discountCents)}</span>}<span className="font-semibold text-amber-300">Phase total {formatQuoteCents(section.totalCents)}</span></div>
                </div>;
              })}
              {unassignedLineItemIndices.length > 0 && <div className="rounded-lg border border-zinc-700 bg-zinc-900/45 p-3"><p className="mb-2 text-xs font-semibold text-zinc-300">{phaseSections.length > 0 ? "Unassigned quote items" : "Standard quote items"}</p><p className="mb-3 text-[11px] text-zinc-500">{phaseSections.length > 0 ? "Assign these items to a phase using the Phase selector, or keep them outside phased work." : "This is a normal, unphased job. Add a Phase only when you need separately approved work sections."}</p><div className="space-y-2">{unassignedLineItemIndices.map((index) => <LineItemRow key={index} item={form.lineItems[index]} index={index} onChange={handleLineItemChange} onMove={handleMoveLineItem} compact={isCompactWorkspace} phaseOptions={phaseOptions} onRemove={i2 => setForm(p => ({ ...p, lineItems: p.lineItems.filter((_, itemIndex) => itemIndex !== i2) }))} />)}</div></div>}
              {phaseSections.length === 0 && <div className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] p-3"><div className="flex items-start gap-2"><DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><div><p className="text-xs font-semibold text-emerald-200">Quote-wide discount line items</p><p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">Add a Phase to place discounts and mobilization within that phase. Until then, discounts apply across unassigned work.</p></div></div><div className="mt-3 flex flex-wrap gap-2">{volumeDiscount && <Button type="button" size="sm" variant="outline" onClick={() => applyDiscountOption(volumeDiscount)} disabled={appliedDiscountCodes.has(volumeDiscount.code)} className="h-7 border-emerald-500/35 text-[11px] text-emerald-200 hover:bg-emerald-500/10">{volumeDiscount.percent}% Volume</Button>}{customerDiscountOptions.map((option) => <Button key={option.code} type="button" size="sm" variant="outline" onClick={() => applyDiscountOption(option)} disabled={appliedDiscountCodes.has(option.code)} className="h-7 border-zinc-600 text-[11px] text-zinc-200 hover:bg-zinc-800">{option.percent}% {option.label.replace(" Discount", "")}</Button>)}</div></div>}
            </div>
            <div className={`mt-3 w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-3 text-sm ${isCompactWorkspace ? "" : "sm:ml-auto sm:max-w-md"}`} aria-live="polite">
              <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Live Cost Breakdown</span><span className="text-[10px] text-zinc-500">Updates as line items change</span></div>
              <div className="mb-3 grid grid-cols-[132px_minmax(0,1fr)] items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/50 px-2 py-2" role="img" aria-label="Cost distribution between approved work and optional future phases">
                <div className="h-[124px]">
                  {hasCostDistribution ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={costDistribution.filter((slice) => slice.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={51} paddingAngle={3} stroke="none">
                          {costDistribution.filter((slice) => slice.value > 0).map((slice) => <Cell key={slice.name} fill={slice.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatQuoteCents(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-center text-[10px] leading-relaxed text-zinc-500">Add priced line items to see the cost split.</div>}
                </div>
                <div className="space-y-2 text-[11px]">
                  {costDistribution.map((slice) => <div key={slice.name} className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-zinc-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />{slice.name}</span><span className="font-medium text-zinc-100">{formatQuoteCents(slice.value)}</span></div>)}
                  <p className="border-t border-zinc-800 pt-2 text-[10px] leading-relaxed text-zinc-500">Approved work is due now. Optional future phases remain visible but are not due now.</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                {costBreakdown.standardServiceCents > 0 && <div className="flex justify-between gap-6 text-zinc-400"><span>Standard service work</span><span>{formatQuoteCents(costBreakdown.standardServiceCents)}</span></div>}
                {costBreakdown.approvedPhaseCents > 0 && <div className="flex justify-between gap-6 text-amber-200"><span>Approved phases</span><span>{formatQuoteCents(costBreakdown.approvedPhaseCents)}</span></div>}
                {costBreakdown.fullOperatingDayCents > 0 && <div className="flex justify-between gap-6 text-sky-200"><span>Full operating days</span><span>{formatQuoteCents(costBreakdown.fullOperatingDayCents)}</span></div>}
                {costBreakdown.halfOperatingDayCents > 0 && <div className="flex justify-between gap-6 text-sky-200"><span>Half operating days</span><span>{formatQuoteCents(costBreakdown.halfOperatingDayCents)}</span></div>}
                {costBreakdown.approvedDiscountCents < 0 && <div className="flex justify-between gap-6 text-emerald-300"><span>Discounts on approved work</span><span>{formatQuoteCents(costBreakdown.approvedDiscountCents)}</span></div>}
                {rentalCustomerQuote.rentalCustomerChargeCents > 0 && <div className="flex justify-between gap-6 text-sky-200"><span>Included rental component ({form.rentalMarkupPct}% markup)</span><span>{formatQuoteCents(rentalCustomerQuote.rentalCustomerChargeCents)}</span></div>}
                <div className="mt-2 flex justify-between gap-6 border-t border-amber-500/30 pt-2"><span className="font-semibold text-amber-100">Amount due for approved work</span><span className="text-base font-bold text-amber-400">{formatQuoteCents(costBreakdown.amountDueNowCents + rentalCustomerQuote.rentalCustomerChargeCents)}</span></div>
                {costBreakdown.optionalFuturePhaseCents > 0 && <>
                  <div className="mt-2 flex justify-between gap-6 border-t border-zinc-700 pt-2 text-indigo-200"><span>Optional future phases</span><span>{formatQuoteCents(costBreakdown.optionalFuturePhaseCents)}</span></div>
                  {costBreakdown.optionalDiscountCents < 0 && <div className="flex justify-between gap-6 text-emerald-300"><span>Discounts allocated to future phases</span><span>{formatQuoteCents(costBreakdown.optionalDiscountCents)}</span></div>}
                  <div className="flex justify-between gap-6 font-semibold text-zinc-200"><span>All-phases total</span><span>{formatQuoteCents(totalCents)}</span></div>
                </>}
                {costBreakdown.optionalFuturePhaseCents === 0 && <div className="flex justify-between gap-6 font-semibold text-zinc-200"><span>Quote total</span><span>{formatQuoteCents(totalCents)}</span></div>}
              </div>
              {costBreakdown.optionalFuturePhaseCents > 0 && <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">Optional future phases are visible here but excluded from the approved-work amount due now.</p>}
            </div>
          </div>

          {/* Messages */}
          <details className="rounded-lg border border-zinc-800 bg-zinc-950/35 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-300">Client message, terms & internal notes</summary>
            <div className={`mt-3 grid grid-cols-1 gap-3 ${isCompactWorkspace ? "" : "sm:grid-cols-2"}`}>
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                <Label className="text-zinc-400 text-xs">Client Message (shown on portal)</Label>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald-200 hover:bg-emerald-500/10" onClick={generateClientMessage} disabled={generateClientMessageMutation.isPending}>
                    {generateClientMessageMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                    {generateClientMessageMutation.isPending ? "Building message…" : "Generate client message"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-amber-200 hover:bg-amber-500/10" onClick={() => appendClientTerms(PHASED_WORK_TERMS)}>Insert Phased Terms</Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-sky-200 hover:bg-sky-500/10" onClick={() => appendClientTerms(DAY_RATE_TERMS)}>Insert Day-Rate Terms</Button>
                  <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-sky-200 hover:bg-sky-500/10" onClick={() => appendClientTerms(ONE_DAY_TRIAL_TERMS)}>Insert Trial Terms</Button>
                </div>
              </div>
              <Textarea value={form.clientMessage} onChange={e => setForm(p => ({ ...p, clientMessage: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-sm" rows={9}
                placeholder="Thank you for the opportunity. Here is the quote for your property..." />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Internal Notes (not shown to client)</Label>
              <Textarea value={form.internalNotes} onChange={e => setForm(p => ({ ...p, internalNotes: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-sm" rows={3}
                placeholder="Steep slope on north side, gate code 1234..." />
            </div>
            </div>
          </details>

          <details className={`rounded-md border border-amber-500/20 bg-amber-500/[0.04] p-3 ${isCompactWorkspace ? "" : "col-span-2"}`}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-amber-300">Pipeline & follow-up details</summary>
            <div className="mt-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label className="text-amber-300 text-xs font-semibold uppercase tracking-wide">Native pipeline record</Label>
              <span className="text-[10px] text-zinc-500">Used by Today’s Next Actions</span>
            </div>
            <div className={`grid gap-3 ${isCompactWorkspace ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Source
                <Input value={form.sourceDetail} onChange={e => setForm(p => ({ ...p, sourceDetail: e.target.value }))} className="mt-1 h-8 bg-zinc-800 border-zinc-700 text-xs" />
              </label>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Fit decision
                <select value={form.fitDecision} onChange={e => setForm(p => ({ ...p, fitDecision: e.target.value as QuoteFormData["fitDecision"] }))} className="mt-1 h-8 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-100"><option value="unreviewed">Unreviewed</option><option value="owner_review">Owner Review</option><option value="pursue">Pursue</option><option value="pass">Pass</option><option value="refer_out">Refer out</option></select>
              </label>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Next action
                <Input value={form.nextActionType} onChange={e => setForm(p => ({ ...p, nextActionType: e.target.value }))} className="mt-1 h-8 bg-zinc-800 border-zinc-700 text-xs" placeholder="Review and contact" />
              </label>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Next action due
                <Input type="datetime-local" value={form.nextActionDueAt} onChange={e => setForm(p => ({ ...p, nextActionDueAt: e.target.value }))} className="mt-1 h-8 bg-zinc-800 border-zinc-700 text-xs" />
              </label>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Visit
                <select value={form.visitStatus} onChange={e => setForm(p => ({ ...p, visitStatus: e.target.value as QuoteFormData["visitStatus"] }))} className="mt-1 h-8 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-100"><option value="not_requested">Not requested</option><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="not_needed">Not needed</option></select>
              </label>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Proposal
                <select value={form.proposalStatus} onChange={e => setForm(p => ({ ...p, proposalStatus: e.target.value as QuoteFormData["proposalStatus"] }))} className="mt-1 h-8 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-100"><option value="not_started">Not started</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="approved">Approved</option><option value="declined">Declined</option></select>
              </label>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Deposit
                <select value={form.depositStatus} onChange={e => setForm(p => ({ ...p, depositStatus: e.target.value as QuoteFormData["depositStatus"] }))} className="mt-1 h-8 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-100"><option value="not_requested">Not requested</option><option value="requested">Requested</option><option value="paid">Paid</option><option value="not_required">Not required</option></select>
              </label>
              <label className="text-[10px] uppercase tracking-wide text-zinc-500">Final payment
                <select value={form.finalPaymentStatus} onChange={e => setForm(p => ({ ...p, finalPaymentStatus: e.target.value as QuoteFormData["finalPaymentStatus"] }))} className="mt-1 h-8 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-100"><option value="not_due">Not due</option><option value="invoiced">Invoiced</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select>
              </label>
            </div>
            </div>
          </details>
        </div>

        <DialogFooter className={`mx-auto mt-3 w-full max-w-[1500px] shrink-0 border-t border-zinc-800 pt-3 ${isCompactWorkspace ? "flex-col items-stretch gap-2" : ""}`}>
          <div className={`flex items-center gap-2 text-[11px] text-zinc-500 ${isCompactWorkspace ? "" : "mr-auto"}`}>
            {draftQuoteId ? <><span className="h-2 w-2 rounded-full bg-emerald-400" />Draft saved — continue editing</> : <>Save a draft to return later without losing progress</>}
          </div>
          <Button variant="outline" className={`border-zinc-600 ${isCompactWorkspace ? "w-full" : ""}`} onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button type="button" variant="outline" className={`border-sky-500/45 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20 ${isCompactWorkspace ? "w-full" : ""}`} onClick={handleSaveDraft} disabled={isBusy}>
            {createDraftMutation.isPending || updateDraftMutation.isPending ? "Saving Draft..." : "Save Draft"}
          </Button>
          <Button className={`bg-amber-500 hover:bg-amber-600 text-black font-semibold ${isCompactWorkspace ? "w-full" : ""}`} onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Saving..." : editQuote ? "Save Changes" : "Create Quote"}
          </Button>
        </DialogFooter>
        <button
          type="button"
          onPointerDown={startWorkspaceResize}
          aria-label="Resize quote workspace"
          title="Drag to resize quote workspace"
          className="absolute bottom-0 right-0 z-30 flex h-9 w-9 cursor-se-resize touch-none items-end justify-end p-2 text-zinc-500 transition-colors hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <span className="h-3 w-3 border-b-2 border-r-2 border-current" aria-hidden="true" />
        </button>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(insurancePreview)} onOpenChange={(isOpen) => { if (!isOpen) setInsurancePreview(null); }}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden border-emerald-500/30 bg-zinc-950 p-0 text-zinc-100">
        <DialogHeader className="border-b border-zinc-800 px-5 py-4"><DialogTitle className="flex items-center gap-2 text-sm text-emerald-100"><FileText className="h-4 w-4 text-emerald-300" />{insurancePreview?.filename ?? "Attachment preview"}</DialogTitle></DialogHeader>
        <div className="space-y-3 px-5 py-4"><p className="text-xs text-zinc-400">Preview is provided for a quick check. If your browser cannot render this file, use Download document below.</p>{insurancePreview?.mimeType.startsWith("image/") ? <img src={insurancePreview.url} alt={insurancePreview.filename} className="max-h-[60vh] w-full rounded border border-zinc-800 object-contain" /> : <object data={insurancePreview?.url} type="application/pdf" className="h-[60vh] w-full rounded border border-zinc-800 bg-zinc-900"><p className="p-4 text-sm text-zinc-300">This browser cannot show the PDF preview. Download the document instead.</p></object>}<div className="flex flex-wrap justify-end gap-2"><a href={insurancePreview?.url} download={insurancePreview?.filename} className="inline-flex h-9 items-center rounded border border-emerald-500/40 px-3 text-xs font-medium text-emerald-100 hover:bg-emerald-500/10"><FileText className="mr-1.5 h-3.5 w-3.5" />Download document</a><a href={insurancePreview?.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded border border-zinc-700 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-800"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open separately</a><Button type="button" variant="outline" className="h-9 border-zinc-700 text-xs" onClick={() => setInsurancePreview(null)}>Close</Button></div></div>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ─── Send Portal dialog ───────────────────────────────────────────────────────
function SendPortalDialog({ quote, onClose }: { quote: NativeQuote; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const insuranceDocuments = useMemo(
    () => parseQuoteSupportArtifacts<QuoteInsuranceDocument[]>(quote.insuranceDocuments, []),
    [quote.insuranceDocuments],
  );
  const { data: insuranceLibrary = [] } = trpc.nativeQuotes.listInsuranceLibrary.useQuery();
  const availableInsuranceDocuments = useMemo(() => {
    const documents = new Map<string, QuoteInsuranceDocument & { source: string }>();
    for (const document of insuranceDocuments) documents.set(document.key, { ...document, source: "This quote" });
    for (const document of insuranceLibrary) documents.set(document.storageKey, {
      key: document.storageKey,
      url: document.storageUrl,
      filename: document.filename,
      mimeType: document.mimeType as QuoteInsuranceDocument["mimeType"],
      sizeBytes: document.sizeBytes,
      source: "Saved library",
    });
    return Array.from(documents.values());
  }, [insuranceDocuments, insuranceLibrary]);
  const [selectedInsuranceKeys, setSelectedInsuranceKeys] = useState<string[]>(() => insuranceDocuments.map((document) => document.key));

  const sendMutation = trpc.nativeQuotes.sendPortal.useMutation({
    onSuccess: (data) => {
      utils.nativeQuotes.list.invalidate();
      toast.success(`Portal link sent — email sent to ${quote.clientEmail}${data.insuranceAttachmentCount ? ` with ${data.insuranceAttachmentCount} insurance attachment${data.insuranceAttachmentCount === 1 ? "" : "s"}` : ""}`);
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
          {availableInsuranceDocuments.length > 0 && <div className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.05] p-3">
            <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><div><p className="text-xs font-semibold text-emerald-100">Attach proof of insurance</p><p className="mt-0.5 text-[10px] text-emerald-100/70">Selected documents are attached to the email only and are not shown in the customer portal.</p></div></div>
            <div className="mt-2 space-y-1.5">{availableInsuranceDocuments.map((document) => <label key={document.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-zinc-200 hover:bg-zinc-800/70"><input type="checkbox" checked={selectedInsuranceKeys.includes(document.key)} onChange={() => setSelectedInsuranceKeys((current) => current.includes(document.key) ? current.filter((key) => key !== document.key) : [...current, document.key])} className="accent-emerald-400" /><span className="min-w-0 flex-1 truncate">{document.filename}</span><span className="text-[9px] text-emerald-100/60">{document.source}</span></label>)}</div>
            {selectedInsuranceKeys.length > 3 && <p className="mt-2 text-[10px] text-amber-200">Select no more than three files for one email.</p>}
          </div>}
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-600" onClick={onClose}>Cancel</Button>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={() => sendMutation.mutate({ id: quote.id, personalNote: note, origin: window.location.origin, insuranceDocumentKeys: selectedInsuranceKeys })}
            disabled={sendMutation.isPending || selectedInsuranceKeys.length > 3}>
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
            <div className="flex justify-between"><span className="text-zinc-400">Quote total</span><span>{formatQuoteCents(quote.totalCents)}</span></div>
            <div className="flex justify-between text-amber-400 font-semibold"><span>Deposit ({pct}%)</span><span>{formatQuoteCents(depositCents)}</span></div>
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
      utils.nativeJobs.list.invalidate();
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
  const { data: leadList = [] } = trpc.ops.leads.list.useQuery(
    undefined,
    { enabled: showLinkLeadPicker, retry: false }
  );
  const availableLeads = (leadList as any[]).filter((lead: any) =>
    !lead.nativeQuoteId && !["won", "lost"].includes(lead.stage)
  );
  const filteredLeads = availableLeads.filter((l: any) => {
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
            {quote.fitDecision === "owner_review" && <Badge className="bg-amber-600 text-white text-xs">Owner Review</Badge>}
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
          {quote.fitDecision === "owner_review" && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
              <p className="font-semibold">Owner Review — verify property county</p>
              <p className="mt-1">This request was saved for review because the address county could not be confirmed or did not match the selected service county.</p>
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
                <span className="font-bold text-primary">{formatQuoteCents(quote.totalCents)}</span>
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
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{formatQuoteCents(li.unitPriceCents)}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-foreground">{formatQuoteCents(li.qty * li.unitPriceCents)}</td>
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
  lat, lng, address, parcelId, parcelCounty,
}: {
  lat?: number;
  lng?: number;
  address?: string;
  parcelId?: string | null;
  parcelCounty?: string | null;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const polygonRefs = useRef<google.maps.Polygon[]>([]);
  const parcelBoundary = trpc.parcel.boundary.useMutation();
  const hasLinkedParcel = Boolean(parcelId && parcelCounty);

  useEffect(() => {
    if (!parcelId || !parcelCounty) return;
    parcelBoundary.mutate({ parcelId, county: parcelCounty });
  }, [parcelId, parcelCounty]);

  // Keep the existing address lookup available as a fallback if a parcel
  // boundary cannot be retrieved from the public Tennessee data service.
  const geocodeQuery = trpc.ops.quotes.satelliteImage.useQuery(
    { address: address! },
    { enabled: lat == null && !!address, retry: false, staleTime: 1000 * 60 * 30 }
  );

  const resolvedLat = parcelBoundary.data?.centroid?.lat ?? lat ?? geocodeQuery.data?.lat ?? null;
  const resolvedLng = parcelBoundary.data?.centroid?.lng ?? lng ?? geocodeQuery.data?.lng ?? null;
  const isResolving = hasLinkedParcel
    ? parcelBoundary.isPending || (!parcelBoundary.data && !parcelBoundary.error && geocodeQuery.isLoading)
    : lat == null && geocodeQuery.isLoading;

  useEffect(() => {
    if (!map || resolvedLat == null || resolvedLng == null) return;

    markerRef.current?.map && (markerRef.current.map = null);
    polygonRefs.current.forEach((polygon) => polygon.setMap(null));
    polygonRefs.current = [];

    const rings = parcelBoundary.data?.boundaryRings;
    if (rings?.length) {
      const bounds = new window.google.maps.LatLngBounds();
      polygonRefs.current = rings.map((ring) => {
        ring.forEach((point) => bounds.extend(point));
        return new window.google.maps.Polygon({
          paths: ring,
          strokeColor: "#f59e0b",
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: "#f59e0b",
          fillOpacity: 0.14,
          map,
        });
      });
      map.fitBounds(bounds, 28);
    } else {
      markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: resolvedLat, lng: resolvedLng },
        title: parcelId ? `Parcel ${parcelId}` : "Property",
      });
    }

    return () => {
      markerRef.current?.map && (markerRef.current.map = null);
      polygonRefs.current.forEach((polygon) => polygon.setMap(null));
      polygonRefs.current = [];
    };
  }, [map, parcelBoundary.data, parcelId, resolvedLat, resolvedLng]);

  if (isResolving) {
    return (
      <div className="w-full h-52 rounded bg-zinc-800 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (resolvedLat == null || resolvedLng == null) {
    return (
      <div className="w-full h-52 rounded bg-zinc-800 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Map unavailable — no coordinates</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded overflow-hidden border border-border">
      {parcelBoundary.data && parcelId && (
        <div className="border-b border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[10px] text-amber-100">
          Parcel boundary: <span className="font-semibold">{parcelId}</span> · {parcelBoundary.data.county}
        </div>
      )}
      {hasLinkedParcel && parcelBoundary.error && (
        <div className="border-b border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[10px] text-amber-100">
          Parcel {parcelId} could not load; showing the request location instead.
        </div>
      )}
      <MapView
        className="w-full h-52"
        initialCenter={{ lat: resolvedLat, lng: resolvedLng }}
        initialZoom={17}
        onMapReady={(readyMap) => {
          readyMap.setMapTypeId("satellite");
          setMap(readyMap);
        }}
      />
    </div>
  );
}

// ─── Inline Web Requests Panel ──────────────────────────────────────────────
function InlineWebRequestsPanel({
  onBuildQuote,
  soundAlertsEnabled,
  browserNotificationsEnabled,
  onNewRequests,
}: {
  onBuildQuote: (prefill: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    propertyAddress?: string;
    serviceType?: string;
    clientMessage?: string;
    websiteRequestId?: number;
  }) => void;
  soundAlertsEnabled: boolean;
  browserNotificationsEnabled: boolean;
  onNewRequests: (count: number, label: string) => void;
}) {
  const { data, isLoading, refetch, isFetching } = trpc.ops.quotes.list.useQuery(
    { limit: 50 },
    {
      retry: false,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: WEBSITE_REQUESTS_REFRESH_INTERVAL_MS,
    }
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
    aiRangeConfidence?: "high" | "moderate" | "low" | null;
    aiRangeConfidenceScore?: number | null;
    aiRangeConfidenceReason?: string | null;
    aiRangeRiskFactors?: string | null;
    estimatedRange?: string | null;
    serviceBreakdown?: string | null;
    nativeQuoteId?: number | null;
    linkedQuoteParcelId?: string | null;
    linkedQuoteParcelCounty?: string | null;
    propertyPinLat?: string | null;
    propertyPinLng?: string | null;
    siteVisitAttachments?: string | null;
    createdAt: Date | string;
  };
  const list = (data ?? []) as WebReq[];
  useIncomingRequestAlert({
    items: list,
    isReady: data !== undefined,
    enabled: soundAlertsEnabled,
    browserNotificationsEnabled,
    label: "website request",
    onNewRequests,
  });
  const [requestSort, setRequestSort] = useState<"newest" | "confidence">("newest");
  const sortedRequests = useMemo(() => sortWebsiteRequests(list, requestSort), [list, requestSort]);
  const utils = trpc.useUtils();
  const [expandedMapId, setExpandedMapId] = useState<number | null>(null);
  // Inline estimate edit state
  const [editingEstimateId, setEditingEstimateId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [linkingRequestId, setLinkingRequestId] = useState<number | null>(null);
  const [selectedExistingQuoteId, setSelectedExistingQuoteId] = useState("");
  const { data: linkableQuotesData } = trpc.nativeQuotes.list.useQuery(
    { limit: 100, offset: 0 },
    { retry: false, staleTime: 1000 * 60 }
  );
  const linkableQuotes = (linkableQuotesData?.quotes ?? []) as NativeQuote[];
  const linkNativeQuoteMutation = trpc.ops.quotes.linkNativeQuote.useMutation({
    onSuccess: (result) => {
      toast.success(`Linked Quote #${result.nativeQuoteId} to ${result.clientName}.`);
      setLinkingRequestId(null);
      setSelectedExistingQuoteId("");
      void refetch();
      utils.nativeQuotes.list.invalidate();
    },
    onError: (error) => toast.error(`Could not link quote: ${error.message}`),
  });
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
    let existingItemizedLines: { description: string; qty: number; unitPriceCents: number; totalCents: number }[] = [];
    try {
      const breakdown = JSON.parse(req.serviceBreakdown ?? "[]") as { label: string; lowCents: number; highCents: number; measurement?: string }[];
      existingItemizedLines = breakdown.map((item) => {
        const midpoint = Math.round((item.lowCents + item.highCents) / 2);
        return {
          description: `${item.label}${item.measurement ? ` — ${item.measurement}` : ""} — preliminary estimate pending site visit`,
          qty: 1,
          unitPriceCents: midpoint,
          totalCents: midpoint,
        };
      });
    } catch { /* fall back to a single line when older requests have no breakdown */ }
    const itemizedTotal = existingItemizedLines.reduce((sum, item) => sum + item.totalCents, 0);
    const adjustment = cents - itemizedTotal;
    const desc = editDesc.trim() || "Project-level estimate adjustment";
    const lineItems = existingItemizedLines.length > 0
      ? (adjustment === 0 ? existingItemizedLines : [...existingItemizedLines, { description: desc, qty: 1, unitPriceCents: adjustment, totalCents: adjustment }])
      : [{ description: editDesc.trim() || req.service || "Forestry Mulching", qty: 1, unitPriceCents: cents, totalCents: cents }];
    updateQuoteMutation.mutate({
      id: req.nativeQuoteId,
      totalCents: cents,
      lineItems,
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRequestSort("newest")}
            className={`h-6 rounded-l border px-1.5 text-[10px] transition-colors ${requestSort === "newest" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"}`}
          >
            Newest
          </button>
          <button
            onClick={() => setRequestSort("confidence")}
            className={`h-6 rounded-r border border-l-0 px-1.5 text-[10px] transition-colors ${requestSort === "confidence" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"}`}
            title="Sort by highest AI range-confidence score"
          >
            AI Confidence
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
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
          {sortedRequests.map((req) => {
            const hasPin = !!req.propertyPinLat && !!req.propertyPinLng;
            const addressStr = [req.street, req.city, req.state].filter(Boolean).join(", ");
            const hasLinkedParcel = Boolean(req.linkedQuoteParcelId && req.linkedQuoteParcelCounty);
            const hasMap = hasLinkedParcel || hasPin || !!addressStr;
            const isMapOpen = expandedMapId === req.id;
            const isEditingEstimate = editingEstimateId === req.id;
            const confidenceStyle = req.aiRangeConfidence === "high"
              ? { label: "High", className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25", Icon: CheckCircle }
              : req.aiRangeConfidence === "moderate"
                ? { label: "Moderate", className: "text-amber-300 bg-amber-500/10 border-amber-500/25", Icon: AlertTriangle }
                : { label: "Low", className: "text-red-300 bg-red-500/10 border-red-500/25", Icon: AlertTriangle };
            const riskFactors = parseStoredRangeRiskFactors(req.aiRangeRiskFactors);
            let requestAttachments: { url: string; filename: string; kind: "photo" | "document" }[] = [];
            try { requestAttachments = JSON.parse(req.siteVisitAttachments ?? "[]"); } catch { requestAttachments = []; }
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
                        title={isMapOpen ? "Hide map" : hasLinkedParcel ? "Show parcel boundary map" : "Show property map"}
                      >
                        <MapPin className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {requestAttachments.length > 0 && (
                  <div className="rounded border border-sky-500/20 bg-sky-500/5 p-2">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200"><FileText className="h-3.5 w-3.5" /> Customer attachments ({requestAttachments.length})</p>
                    <div className="flex flex-wrap gap-2">{requestAttachments.map((attachment) => <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-sky-400/25 px-2 py-1 text-[11px] text-sky-100 hover:bg-sky-500/15"><ExternalLink className="h-3 w-3" />{attachment.filename}</a>)}</div>
                  </div>
                )}

                {/* AI Summary — visible on card face */}
                {req.aiSummary && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-amber-500/30 pl-2">
                    {req.aiSummary}
                  </p>
                )}

                {(req.aiRangeConfidence || req.aiRangeConfidenceReason) && (
                  <div className="rounded border border-border/80 bg-background/35 px-2.5 py-2 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">AI range assessment</p>
                      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${confidenceStyle.className}`}>
                        <confidenceStyle.Icon className="h-3 w-3" />
                        {confidenceStyle.label} confidence{typeof req.aiRangeConfidenceScore === "number" ? ` · ${req.aiRangeConfidenceScore}/100` : ""}
                      </span>
                    </div>
                    {req.aiRangeConfidenceReason && <p className="text-[11px] leading-relaxed text-muted-foreground">{req.aiRangeConfidenceReason}</p>}
                    {riskFactors.length > 0 && (
                      <p className="text-[10px] leading-relaxed text-amber-200/80">
                        <span className="font-semibold text-amber-300">Confirm on site:</span> {riskFactors.join(" · ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Expandable interactive map */}
                {isMapOpen && hasMap && (
                  <WebReqInteractiveMap
                    lat={hasPin ? parseFloat(req.propertyPinLat!) : undefined}
                    lng={hasPin ? parseFloat(req.propertyPinLng!) : undefined}
                    address={!hasPin ? addressStr : undefined}
                    parcelId={req.linkedQuoteParcelId}
                    parcelCounty={req.linkedQuoteParcelCounty}
                  />
                )}

                {req.message && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{req.message}</p>
                )}
                {(() => {
                  {
                    const breakdown = parseStoredServiceBreakdown(req.serviceBreakdown);
                    if (breakdown.length === 0) return null;
                    return (
                      <div className="rounded border border-amber-500/20 bg-amber-500/5 px-2.5 py-2 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">Itemized estimate & calculation basis</p>
                        {breakdown.map((item) => (
                          <div key={`${item.label}-${item.measurement ?? ""}`} className="border-t border-amber-500/10 pt-1.5 first:border-t-0 first:pt-0">
                            <div className="flex items-start justify-between gap-2 text-[11px]">
                              <span className="text-muted-foreground">{item.label}{item.measurement ? ` · ${item.measurement}` : ""}</span>
                              <span className="shrink-0 font-medium text-amber-300">${Math.round(item.lowCents / 100).toLocaleString()} – ${Math.round(item.highCents / 100).toLocaleString()}</span>
                            </div>
                            {item.calculation && <p className="mt-0.5 flex gap-1 text-[10px] leading-relaxed text-muted-foreground/85"><Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/80" />{item.calculation}</p>}
                          </div>
                        ))}
                      </div>
                    );
                  }
                })()}

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
                    {req.nativeQuoteId && (
                      <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200">
                        Quote #{req.nativeQuoteId}
                      </span>
                    )}
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
                        websiteRequestId: req.id,
                      })}
                    >
                      <Plus className="w-3 h-3" />
                      Build Quote
                    </Button>
                    <button
                      onClick={() => {
                        setLinkingRequestId(linkingRequestId === req.id ? null : req.id);
                        setSelectedExistingQuoteId(req.nativeQuoteId ? String(req.nativeQuoteId) : "");
                      }}
                      className="h-6 rounded border border-sky-500/30 px-2 text-[10px] font-semibold text-sky-200 transition-colors hover:bg-sky-500/10"
                      title="Link an existing native quote to this website request"
                    >
                      {req.nativeQuoteId ? "Change Quote" : "Link Quote"}
                    </button>
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
                {linkingRequestId === req.id && (
                  <div className="rounded border border-sky-500/30 bg-sky-500/5 p-2.5 space-y-2">
                    <p className="text-[11px] font-semibold text-sky-100">Link an existing quote to {req.name}</p>
                    <Select value={selectedExistingQuoteId} onValueChange={setSelectedExistingQuoteId}>
                      <SelectTrigger className="h-8 bg-zinc-900 text-xs"><SelectValue placeholder="Choose a quote" /></SelectTrigger>
                      <SelectContent>
                        {linkableQuotes.map((quote) => (
                          <SelectItem key={quote.id} value={String(quote.id)}>
                            #{quote.id} · {quote.clientName} · {quote.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setLinkingRequestId(null)}>Cancel</Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={!selectedExistingQuoteId || linkNativeQuoteMutation.isPending}
                        onClick={() => linkNativeQuoteMutation.mutate({ requestId: req.id, nativeQuoteId: Number(selectedExistingQuoteId) })}
                      >
                        {linkNativeQuoteMutation.isPending ? "Linking..." : "Link Quote"}
                      </Button>
                    </div>
                  </div>
                )}
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
  // Sort control
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "confidence">("newest");
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
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(() => getStoredOpsSoundAlertPreference());
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(() => getOpsBrowserNotificationPermission());
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(
    () => getStoredOpsBrowserNotificationPreference() && getOpsBrowserNotificationPermission() === "granted"
  );
  const [newRequestBanner, setNewRequestBanner] = useState<{ count: number; label: string } | null>(null);

  const handleNewRequests = useCallback((count: number, label: string) => {
    setNewRequestBanner({ count, label });
  }, []);

  const toggleSoundAlerts = () => {
    const next = !soundAlertsEnabled;
    setSoundAlertsEnabled(next);
    setStoredOpsSoundAlertPreference(next);
    if (next) {
      void playOpsNewRequestSound();
      toast.success("New-request sound alerts enabled.", {
        description: "You will hear an alert for new website or field requests while this page is open.",
      });
    } else {
      toast.message("New-request sound alerts muted.");
    }
  };

  const toggleBrowserNotifications = async () => {
    if (browserNotificationsEnabled) {
      setBrowserNotificationsEnabled(false);
      setStoredOpsBrowserNotificationPreference(false);
      toast.message("Browser notifications turned off for this browser.");
      return;
    }

    const permission = await requestOpsBrowserNotificationPermission();
    setBrowserNotificationPermission(permission);
    if (permission === "granted") {
      setBrowserNotificationsEnabled(true);
      setStoredOpsBrowserNotificationPreference(true);
      toast.success("Browser notifications enabled.", {
        description: "You will receive an alert while Operations Quotes is open in a background tab.",
      });
      return;
    }
    if (permission === "denied") {
      toast.error("Browser notifications are blocked.", {
        description: "Allow notifications for nolandearthworks.com in your browser settings, then try again.",
      });
      return;
    }
    if (permission === "default") {
      toast.message("Browser notification permission was not granted.", {
        description: "Click Notify Off again and choose Allow when your browser shows the permission prompt.",
      });
      return;
    }
    toast.error("Browser notifications are not supported by this browser.");
  };
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
    refetchInterval: 30_000, // auto-refresh every 30 s so new submissions appear without a manual reload
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
    // Apply sort to each stage
    const sortFn = sortBy === "highest"
      ? (a: NativeQuote, b: NativeQuote) => (b.totalCents ?? 0) - (a.totalCents ?? 0)
      : sortBy === "confidence"
        ? compareQuotesByConfidence
        : (a: NativeQuote, b: NativeQuote) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    Object.keys(groups).forEach(key => { groups[key].sort(sortFn); });
    return groups;
  }, [quotes, minCents, maxCents, dateFromMs, dateToMs, sortBy]);

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
      {newRequestBanner && (
        <div
          role="alert"
          aria-live="assertive"
          className="animate-pulse rounded-lg border border-emerald-400/60 bg-emerald-500/15 px-4 py-3 shadow-lg shadow-emerald-950/30"
        >
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-200">
                {newRequestBanner.count} new {newRequestBanner.label}{newRequestBanner.count === 1 ? "" : "s"} received
              </p>
              <p className="mt-0.5 text-xs text-emerald-100/80">
                Review the new request below. Sound is {soundAlertsEnabled ? "on" : "muted"} for this browser.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewRequestBanner(null)}
              className="rounded p-1 text-emerald-200/80 hover:bg-emerald-400/15 hover:text-emerald-100"
              aria-label="Dismiss new request notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
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
              <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-1.5 text-xs ${soundAlertsEnabled ? "border-emerald-500/50 text-emerald-400 hover:text-emerald-300" : "text-muted-foreground"}`}
                onClick={toggleSoundAlerts}
                aria-pressed={soundAlertsEnabled}
                title={soundAlertsEnabled ? "Mute incoming website and field request sounds" : "Enable incoming website and field request sounds"}
              >
                {soundAlertsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                Sound {soundAlertsEnabled ? "On" : "Muted"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-1.5 text-xs ${browserNotificationsEnabled ? "border-sky-500/50 text-sky-300 hover:text-sky-200" : "text-muted-foreground"}`}
                onClick={() => void toggleBrowserNotifications()}
                aria-pressed={browserNotificationsEnabled}
                title={browserNotificationsEnabled ? "Turn off background-tab browser notifications" : browserNotificationPermission === "denied" ? "Browser notifications are blocked; update browser site settings" : "Enable browser notifications while this tab is in the background"}
              >
                {browserNotificationsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                Notify {browserNotificationsEnabled ? "On" : browserNotificationPermission === "denied" ? "Blocked" : "Off"}
              </Button>
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

                {/* Sort control */}
                <div className="flex items-center gap-1 ml-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <button
                    onClick={() => setSortBy("newest")}
                    className={`h-7 px-2.5 rounded-l text-xs border border-border transition-colors ${
                      sortBy === "newest"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setSortBy("highest")}
                    className={`h-7 px-2.5 rounded-r text-xs border border-l-0 border-border transition-colors ${
                      sortBy === "highest"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    Highest $
                  </button>
                  <button
                    onClick={() => setSortBy("confidence")}
                    className={`h-7 rounded-r px-2.5 text-xs border border-l-0 border-border transition-colors ${
                      sortBy === "confidence"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                    }`}
                    title="Sort by highest AI range-confidence score. Quotes without an AI score appear last."
                  >
                    AI Confidence
                  </button>
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
                            <p className="text-[11px] text-muted-foreground">{q.service ?? "Land Management"} &middot; {q.daysSinceSent} days since sent</p>
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

          {/* ── Summary bar ── */}
          {!isLoading && quotes.length > 0 && (() => {
            const visibleQuotes = visibleStages.flatMap(s => pipelineGroups[s.key] ?? []);
            const visibleTotalCents = visibleQuotes.reduce((sum, q) => sum + (q.totalCents ?? 0), 0);
            const visibleTotalFormatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(visibleTotalCents / 100);
            return (
              <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-secondary/20 border border-border text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span><span className="font-semibold text-foreground">{visibleQuotes.length}</span> quote{visibleQuotes.length !== 1 ? "s" : ""} visible</span>
                </div>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Total: <span className="font-semibold text-foreground">{visibleTotalFormatted}</span></span>
                </div>
              </div>
            );
          })()}

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
                                  <StatusBadge quote={quote} />
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
                                  {formatQuoteCents(quote.totalCents)}
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
              soundAlertsEnabled={soundAlertsEnabled}
              browserNotificationsEnabled={browserNotificationsEnabled}
              onNewRequests={handleNewRequests}
              onBuildQuote={(prefill) => {
                setCreatePrefill(prefill);
                setShowCreate(true);
              }}
            />
          </div>
        </div>{/* end right column */}
      </div>{/* end two-column grid */}

      {/* ── Field Quotes (companion app submissions) ── */}
      <div className="mt-8 border-t border-zinc-800 pt-8">
        <FieldQuotesSection
          soundAlertsEnabled={soundAlertsEnabled}
          browserNotificationsEnabled={browserNotificationsEnabled}
          onNewRequests={handleNewRequests}
        />
      </div>

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
