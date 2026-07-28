/**
 * Client Quote Portal — /quote/:token
 *
 * Public, no login required. The client receives a unique URL by email.
 * Features:
 *   - Full quote view with line-item pricing
 *   - Approve with digital signature pad
 *   - Request Changes flow
 *   - Decline with optional note
 *   - Stripe deposit payment
 *   - PDF download (print stylesheet)
 *
 * Design: dark earth tones matching Noland Earthworks brand.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  CreditCard,
  MapPin,
  Briefcase,
  Clock,
  Truck,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  Shield,
  Download,
  PenLine,
  RotateCcw,
  MessageSquareDiff,
} from "lucide-react";

type DepositPct = 25 | 33 | 50;

// ─── Signature Pad ────────────────────────────────────────────────────────────

function SignaturePad({
  onSignature,
  onClear,
}: {
  onSignature: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing.current) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#f0a500";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    lastPos.current = pos;
    setHasSignature(true);
  }, []);

  const endDraw = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      onSignature(canvas.toDataURL("image/png"));
    }
  }, [hasSignature, onSignature]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", endDraw);
    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDraw);
    };
  }, [startDraw, draw, endDraw]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400 font-medium">Sign below to approve</label>
        {hasSignature && (
          <button
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
      <div className="relative rounded-lg border-2 border-dashed border-zinc-600 bg-zinc-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={560}
          height={140}
          className="w-full touch-none cursor-crosshair"
          style={{ display: "block" }}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-zinc-600 text-sm">
              <PenLine className="w-4 h-4" />
              <span>Draw your signature here</span>
            </div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-zinc-600">
        By signing, you agree to the terms of this estimate. This is not a binding contract — a site visit is required to confirm the final scope and price.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuotePortal() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  // URL param feedback (deposit=success|cancelled)
  const [urlFeedback, setUrlFeedback] = useState<"success" | "cancelled" | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const dep = sp.get("deposit");
    if (dep === "success") setUrlFeedback("success");
    else if (dep === "cancelled") setUrlFeedback("cancelled");
  }, []);

  // Quote data
  const { data: quote, isLoading, error } = trpc.quotePortal.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // ── Approve flow ──
  const [showApproveFlow, setShowApproveFlow] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"approved" | "declined" | null>(null);
  const clientActionMut = trpc.quotePortal.clientAction.useMutation({
    onSuccess: (data) => {
      if (data.action === "approved") {
        toast.success("Quote approved and signed. Jon will be in touch shortly.");
      } else {
        toast.success("Response recorded. Thank you for letting us know.");
      }
      setPendingAction(null);
      setShowApproveFlow(false);
      setShowDeclineNote(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingAction(null);
    },
  });

  // ── Decline flow ──
  const [showDeclineNote, setShowDeclineNote] = useState(false);
  const [declineMessage, setDeclineMessage] = useState("");

  // ── Request Changes flow ──
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changesNote, setChangesNote] = useState("");
  const requestChangesMut = trpc.quotePortal.requestChanges.useMutation({
    onSuccess: () => {
      toast.success("Change request sent. Jon will follow up with a revised quote.");
      setShowChangesForm(false);
      setChangesNote("");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Deposit ──
  const [depositPct, setDepositPct] = useState<DepositPct>(25);
  const depositMut = trpc.quotePortal.createDepositSession.useMutation({
    onSuccess: (data) => {
      window.open(data.checkoutUrl, "_blank");
      toast.success("Redirecting to secure payment...");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleApproveClick() {
    setShowDeclineNote(false);
    setShowChangesForm(false);
    setShowApproveFlow(true);
  }

  function handleConfirmApprove() {
    if (!signatureDataUrl) {
      toast.error("Please sign the pad before approving.");
      return;
    }
    setPendingAction("approved");
    clientActionMut.mutate({ token, action: "approved", signatureDataUrl });
  }

  function handleDeclineClick() {
    setShowApproveFlow(false);
    setShowChangesForm(false);
    setShowDeclineNote(true);
  }

  function handleConfirmDecline() {
    setPendingAction("declined");
    clientActionMut.mutate({ token, action: "declined", message: declineMessage || undefined });
  }

  function handleRequestChanges() {
    if (changesNote.trim().length < 10) {
      toast.error("Please describe the changes you need (at least 10 characters).");
      return;
    }
    requestChangesMut.mutate({ token, note: changesNote });
  }

  function handleDeposit() {
    depositMut.mutate({ token, depositPct });
  }

  function handlePrint() {
    window.print();
  }

  // ─── Loading / Error States ──────────────────────────────────────────────────
  if (!token) {
    return <PortalShell><ErrorCard message="Invalid quote link." /></PortalShell>;
  }
  if (isLoading) {
    return (
      <PortalShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p>Loading your quote...</p>
        </div>
      </PortalShell>
    );
  }
  if (error || !quote) {
    return (
      <PortalShell>
        <ErrorCard message={error?.message ?? "Quote not found or this link has expired."} />
      </PortalShell>
    );
  }

  const depositCents = Math.round(quote.totalCents * (depositPct / 100));
  const balanceCents = quote.totalCents - depositCents;
  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

  const isActioned = !!quote.clientAction;
  const isApproved = quote.clientAction === "approved";
  const isDeclined = quote.clientAction === "declined";
  const hasDepositPaid = !!quote.depositPaidAt;
  const hasChangeRequest = !!(quote as any).changeRequestAt;

  const jobLabel = quote.jobType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <PortalShell>
      {/* PDF download button — top right, hidden in print */}
      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded-md px-3 py-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download PDF
        </button>
      </div>

      {/* Deposit success banner */}
      {urlFeedback === "success" && (
        <div className="mb-6 rounded-lg bg-green-900/40 border border-green-700 p-4 flex items-start gap-3 no-print">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-green-300 font-semibold text-sm">Deposit received.</p>
            <p className="text-green-400/80 text-xs mt-0.5">Thank you. Jon will be in touch to confirm your schedule.</p>
          </div>
        </div>
      )}
      {urlFeedback === "cancelled" && (
        <div className="mb-6 rounded-lg bg-zinc-800 border border-zinc-700 p-4 flex items-start gap-3 no-print">
          <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
          <p className="text-zinc-400 text-sm">Payment was cancelled. You can try again below.</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-1">Estimate</p>
        <h1 className="text-2xl font-bold text-white">{jobLabel}</h1>
        <div className="flex items-center gap-2 mt-2 text-zinc-400 text-sm">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>{quote.jobAddress}</span>
        </div>
        {quote.sentAt && (
          <p className="text-zinc-500 text-xs mt-2">
            Sent {new Date(quote.sentAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Status badge */}
      {isActioned && (
        <div className={`mb-6 rounded-lg border p-4 flex items-center gap-3 ${isApproved ? "bg-green-900/30 border-green-700" : "bg-red-900/20 border-red-800"}`}>
          {isApproved
            ? <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
          <div>
            <p className={`font-semibold text-sm ${isApproved ? "text-green-300" : "text-red-300"}`}>
              You {isApproved ? "approved" : "declined"} this quote
              {quote.clientActionAt ? ` on ${new Date(quote.clientActionAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}.
            </p>
            {isApproved && (quote as any).signedAt && (
              <p className="text-green-400/70 text-xs mt-0.5">Digitally signed on {new Date((quote as any).signedAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.</p>
            )}
            {isApproved && !hasDepositPaid && (
              <p className="text-green-400/70 text-xs mt-0.5">A deposit secures your spot on the schedule.</p>
            )}
          </div>
        </div>
      )}

      {/* Change request status */}
      {hasChangeRequest && !isActioned && (
        <div className="mb-6 rounded-lg bg-amber-900/20 border border-amber-700/50 p-4 flex items-start gap-3 no-print">
          <MessageSquareDiff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">Change request submitted.</p>
            <p className="text-amber-400/70 text-xs mt-0.5">Jon will review your request and follow up with a revised quote.</p>
          </div>
        </div>
      )}

      {/* Deposit paid banner */}
      {hasDepositPaid && (
        <div className="mb-6 rounded-lg bg-green-900/30 border border-green-700 p-4 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-green-300 font-semibold text-sm">
              Deposit of {fmt(quote.depositPaidCents ?? 0)} received
              {quote.depositPaidAt ? ` on ${new Date(quote.depositPaidAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}.
            </p>
            <p className="text-green-400/70 text-xs mt-0.5">
              Balance due on completion: {fmt(quote.totalCents - (quote.depositPaidCents ?? 0))}.
            </p>
          </div>
        </div>
      )}

      {/* Project Details */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-800/50">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Project Details</p>
        </div>
        <div className="divide-y divide-zinc-800">
          <DetailRow icon={<Briefcase className="w-4 h-4" />} label="Service" value={jobLabel} />
          <DetailRow icon={<MapPin className="w-4 h-4" />} label="Job Site" value={quote.jobAddress} />
          <DetailRow icon={<Briefcase className="w-4 h-4" />} label="Estimated Acreage" value={`${quote.jobAcres} acres`} />
          <DetailRow icon={<Clock className="w-4 h-4" />} label="Estimated Crew Days" value={`${quote.crewDaysNeeded} day${quote.crewDaysNeeded !== 1 ? "s" : ""}`} />
          <DetailRow icon={<Truck className="w-4 h-4" />} label="Drive Distance" value={`${quote.distanceMiles} mi${quote.driveDuration ? ` (${quote.driveDuration})` : ""}`} />
          <DetailRow icon={<Truck className="w-4 h-4" />} label="Mobilization" value={quote.mobilizationTier} />
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-800/50">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Pricing Estimate</p>
        </div>
        <div className="divide-y divide-zinc-800">
          <PriceRow label="Base Day Rate" value={quote.baseDayRate} />
          {quote.mobSurcharge && <PriceRow label="Mobilization Surcharge / Day" value={`+${quote.mobSurcharge}`} />}
          <PriceRow label="Adjusted Day Rate" value={quote.adjustedDayRate} />
          <PriceRow label="Price per Acre" value={`${quote.pricePerAcre}/ac`} />
        </div>
        <div className="px-5 py-4 bg-zinc-800/30 flex justify-between items-center">
          <span className="text-base font-bold text-white">Estimated Total</span>
          <span className="text-xl font-bold text-amber-400">{quote.totalFormatted}</span>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 mb-6">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Notes</p>
          <p className="text-zinc-300 text-sm leading-relaxed">{quote.notes}</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4 mb-8">
        <p className="text-zinc-500 text-xs leading-relaxed">
          This is a preliminary estimate based on the information provided and does not constitute a final contract.
          Pricing may vary based on site conditions, terrain, vegetation density, access, and proximity to structures.
          A site visit is required to confirm the final scope and price.
        </p>
      </div>

      {/* ── Actions ── */}
      {!isActioned && !hasChangeRequest && (
        <div className="space-y-4 mb-8 no-print">
          <p className="text-zinc-300 text-sm font-medium">How would you like to proceed?</p>

          {/* Approve flow — signature pad */}
          {showApproveFlow && (
            <div className="rounded-xl bg-zinc-900 border border-amber-700/40 p-5 space-y-4">
              <SignaturePad
                onSignature={(url) => setSignatureDataUrl(url)}
                onClear={() => setSignatureDataUrl(null)}
              />
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold h-11 text-sm"
                  onClick={handleConfirmApprove}
                  disabled={!signatureDataUrl || (clientActionMut.isPending && pendingAction === "approved")}
                >
                  {clientActionMut.isPending && pendingAction === "approved"
                    ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    : <CheckCircle className="w-4 h-4 mr-2" />}
                  Confirm Approval
                </Button>
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 h-11 text-sm"
                  onClick={() => setShowApproveFlow(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Decline flow */}
          {showDeclineNote && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-5 space-y-3">
              <label className="text-xs text-zinc-400 block">Optional: let Jon know why (helps improve future estimates)</label>
              <Textarea
                placeholder="e.g., Going with another contractor, budget constraints, timing..."
                value={declineMessage}
                onChange={(e) => setDeclineMessage(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm resize-none"
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-red-800 text-red-400 hover:bg-red-900/20 h-11 text-sm"
                  onClick={handleConfirmDecline}
                  disabled={clientActionMut.isPending && pendingAction === "declined"}
                >
                  {clientActionMut.isPending && pendingAction === "declined"
                    ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    : <XCircle className="w-4 h-4 mr-2" />}
                  Confirm Decline
                </Button>
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 h-11 text-sm"
                  onClick={() => setShowDeclineNote(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Request Changes flow */}
          {showChangesForm && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquareDiff className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-semibold text-white">Request Changes</p>
              </div>
              <p className="text-xs text-zinc-400">Describe what you would like adjusted. Jon will review and send a revised quote.</p>
              <Textarea
                placeholder="e.g., Can we reduce the scope to just the front 5 acres? Or adjust the timeline to start in October?"
                value={changesNote}
                onChange={(e) => setChangesNote(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm resize-none"
                rows={4}
              />
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white h-11 text-sm"
                  onClick={handleRequestChanges}
                  disabled={requestChangesMut.isPending}
                >
                  {requestChangesMut.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    : <MessageSquareDiff className="w-4 h-4 mr-2" />}
                  Submit Change Request
                </Button>
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 h-11 text-sm"
                  onClick={() => setShowChangesForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Primary action buttons */}
          {!showApproveFlow && !showDeclineNote && !showChangesForm && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold h-12 text-sm"
                onClick={handleApproveClick}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve This Quote
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-800 h-12 text-sm"
                onClick={() => setShowChangesForm(true)}
              >
                <MessageSquareDiff className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-500 hover:bg-zinc-800 h-12 text-sm"
                onClick={handleDeclineClick}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Deposit section — shown after approval */}
      {(isApproved || quote.status === "accepted") && !hasDepositPaid && (
        <div className="rounded-xl bg-zinc-900 border border-amber-700/40 p-5 mb-8 no-print">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <p className="text-white font-semibold text-sm">Secure Your Spot with a Deposit</p>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed mb-4">
            A deposit holds your place on the schedule. The balance is due on completion.
          </p>

          <div className="flex gap-2 mb-4">
            {([25, 33, 50] as DepositPct[]).map((pct) => (
              <button
                key={pct}
                onClick={() => setDepositPct(pct)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  depositPct === pct
                    ? "bg-amber-500 border-amber-500 text-black"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-amber-600"
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          <div className="rounded-lg bg-zinc-800 p-3 mb-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Deposit ({depositPct}%)</span>
              <span className="text-white font-semibold">{fmt(depositCents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Balance due on completion</span>
              <span className="text-zinc-300">{fmt(balanceCents)}</span>
            </div>
          </div>

          <Button
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold h-12"
            onClick={handleDeposit}
            disabled={depositMut.isPending}
          >
            {depositMut.isPending
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <CreditCard className="w-4 h-4 mr-2" />}
            Pay {fmt(depositCents)} Deposit Securely
          </Button>

          <div className="flex items-center justify-center gap-1.5 mt-3">
            <Shield className="w-3.5 h-3.5 text-zinc-500" />
            <p className="text-zinc-500 text-xs">Secure payment via Stripe. Card details are never shared with us.</p>
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Questions?</p>
        <p className="text-zinc-300 text-sm mb-4">
          Call or text Jon directly. He does every job himself — you will always reach the person doing the work.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 no-print">
          <a
            href="tel:6154064819"
            className="flex items-center gap-2 justify-center flex-1 rounded-lg border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Phone className="w-4 h-4 text-amber-500" />
            615-406-4819
          </a>
          <a
            href="mailto:jon@nolandearthworks.com"
            className="flex items-center gap-2 justify-center flex-1 rounded-lg border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Mail className="w-4 h-4 text-amber-500" />
            jon@nolandearthworks.com
          </a>
        </div>
        {/* Print-only contact */}
        <div className="hidden print-only text-zinc-400 text-sm mt-2">
          <p>Phone: 615-406-4819 &bull; Email: jon@nolandearthworks.com &bull; nolandearthworks.com</p>
        </div>
      </div>
    </PortalShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white portal-print-root">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-amber-500 font-bold text-sm tracking-wide">NOLAND EARTHWORKS</p>
            <p className="text-zinc-500 text-xs">Veteran-Owned Land Management &bull; Middle &amp; West Tennessee</p>
          </div>
          <a
            href="https://www.nolandearthworks.com"
            className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors no-print"
            target="_blank"
            rel="noopener noreferrer"
          >
            nolandearthworks.com
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-4 py-6 text-center">
        <p className="text-zinc-600 text-xs">
          Noland Earthworks, LLC &bull; Vanleer, TN &bull; Licensed &amp; Insured &bull; Veteran-Owned &amp; Operated
        </p>
      </footer>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <div className="flex items-center gap-2 text-zinc-400 text-sm shrink-0">
        <span className="text-zinc-600">{icon}</span>
        {label}
      </div>
      <span className="text-zinc-200 text-sm text-right">{value}</span>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className="text-zinc-200 text-sm font-medium">{value}</span>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-8 text-center">
      <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
      <p className="text-white font-semibold mb-2">Quote Not Found</p>
      <p className="text-zinc-400 text-sm mb-6">{message}</p>
      <a
        href="https://www.nolandearthworks.com"
        className="text-amber-500 hover:text-amber-400 text-sm underline"
      >
        Return to nolandearthworks.com
      </a>
    </div>
  );
}
