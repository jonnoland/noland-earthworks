/**
 * Client Quote Portal — /quote/:token
 *
 * Public, no login required. The client receives a unique URL by email.
 * Shows the full quote with line-item pricing, approve/decline actions,
 * and a Stripe deposit payment option.
 *
 * Design: dark earth tones matching Noland Earthworks brand.
 */
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react";

type DepositPct = 25 | 33 | 50;

export default function QuotePortal() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [, setLocation] = useLocation();

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

  // Client action (approve / decline)
  const [actionMessage, setActionMessage] = useState("");
  const [showDeclineNote, setShowDeclineNote] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approved" | "declined" | null>(null);
  const clientActionMut = trpc.quotePortal.clientAction.useMutation({
    onSuccess: (data) => {
      if (data.action === "approved") {
        toast.success("Quote approved. Jon will be in touch shortly to schedule the work.");
      } else {
        toast.success("Response recorded. Thank you for letting us know.");
      }
      setPendingAction(null);
      setShowDeclineNote(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingAction(null);
    },
  });

  // Deposit
  const [depositPct, setDepositPct] = useState<DepositPct>(25);
  const [showDepositOptions, setShowDepositOptions] = useState(false);
  const depositMut = trpc.quotePortal.createDepositSession.useMutation({
    onSuccess: (data) => {
      window.open(data.checkoutUrl, "_blank");
      toast.success("Redirecting to secure payment...");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleAction(action: "approved" | "declined") {
    if (action === "declined" && !showDeclineNote) {
      setShowDeclineNote(true);
      return;
    }
    setPendingAction(action);
    clientActionMut.mutate({ token, action, message: actionMessage || undefined });
  }

  function handleDeposit() {
    depositMut.mutate({ token, depositPct });
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

  const jobLabel = quote.jobType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <PortalShell>
      {/* Deposit success banner */}
      {urlFeedback === "success" && (
        <div className="mb-6 rounded-lg bg-green-900/40 border border-green-700 p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-green-300 font-semibold text-sm">Deposit received.</p>
            <p className="text-green-400/80 text-xs mt-0.5">Thank you. Jon will be in touch to confirm your schedule.</p>
          </div>
        </div>
      )}
      {urlFeedback === "cancelled" && (
        <div className="mb-6 rounded-lg bg-zinc-800 border border-zinc-700 p-4 flex items-start gap-3">
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
            {isApproved && !hasDepositPaid && (
              <p className="text-green-400/70 text-xs mt-0.5">A deposit secures your spot on the schedule.</p>
            )}
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

      {/* Actions */}
      {!isActioned && (
        <div className="space-y-4 mb-8">
          <p className="text-zinc-300 text-sm font-medium">How would you like to proceed?</p>

          {showDeclineNote && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Optional: let Jon know why (helps improve future estimates)</label>
              <Textarea
                placeholder="e.g., Going with another contractor, budget constraints, timing..."
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-zinc-200 text-sm resize-none"
                rows={3}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold h-12 text-sm"
              onClick={() => handleAction("approved")}
              disabled={clientActionMut.isPending && pendingAction === "approved"}
            >
              {clientActionMut.isPending && pendingAction === "approved"
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve This Quote
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-12 text-sm"
              onClick={() => handleAction("declined")}
              disabled={clientActionMut.isPending && pendingAction === "declined"}
            >
              {clientActionMut.isPending && pendingAction === "declined"
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <XCircle className="w-4 h-4 mr-2" />}
              {showDeclineNote ? "Confirm Decline" : "Decline"}
            </Button>
          </div>
        </div>
      )}

      {/* Deposit section — shown after approval or if quote is already approved */}
      {(isApproved || quote.status === "accepted") && !hasDepositPaid && (
        <div className="rounded-xl bg-zinc-900 border border-amber-700/40 p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <p className="text-white font-semibold text-sm">Secure Your Spot with a Deposit</p>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed mb-4">
            A deposit holds your place on the schedule. The balance is due on completion.
          </p>

          {/* Deposit % selector */}
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
        <div className="flex flex-col sm:flex-row gap-3">
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
      </div>
    </PortalShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-amber-500 font-bold text-sm tracking-wide">NOLAND EARTHWORKS</p>
            <p className="text-zinc-500 text-xs">Veteran-Owned Land Management &bull; Middle &amp; West Tennessee</p>
          </div>
          <a
            href="https://www.nolandearthworks.com"
            className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
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
