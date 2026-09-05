/*
 * NativeQuotePortal — /quote/:token (native quotes)
 *
 * Public, no login required. Rendered when the portal token belongs to a
 * native quote (nativeQuotes table). Supports:
 *   - Full line-item quote view
 *   - Approve / Decline / Request Changes
 *   - Stripe deposit payment
 *   - PDF download
 */
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatQuoteCents, roundQuoteCentsUp } from "@shared/quoteMoney";
import { formatQuoteLineQuantity, isEstimatedLinearFootQuoteLine, isLinearFootQuoteLine, linearFootEstimateBasis } from "@shared/quoteLineItemMeasurements";
import {
  CheckCircle, XCircle, CreditCard, MapPin, Briefcase,
  Clock, AlertCircle, Loader2, Download, MessageSquareDiff,
} from "lucide-react";

type DepositPct = 25 | 33 | 50;

function formatWorkingDays(value: string | null | undefined) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return value;
  return `${numericValue} working day${numericValue === 1 ? "" : "s"}`;
}

function lineQuantityText(item: { description: string; qty: number; serviceCode?: string; measurementUnit?: "linear_foot"; quantitySource?: "measured" | "acreage_estimate"; sourceAcreage?: number; clearingWidthFeet?: number }) {
  return formatQuoteLineQuantity(item);
}

function isCustomerDiscount(item: { kind?: string; unitPriceCents: number; totalCents: number }) {
  return item.kind === "discount" || item.unitPriceCents < 0 || item.totalCents < 0;
}

function EstimatedFootageNotice({ item }: { item: { description: string; serviceCode?: string; measurementUnit?: "linear_foot"; quantitySource?: "measured" | "acreage_estimate"; sourceAcreage?: number; clearingWidthFeet?: number } }) {
  if (!isEstimatedLinearFootQuoteLine(item)) return null;
  const basis = linearFootEstimateBasis(item);
  return <p className="mt-1 flex items-start gap-1 text-[11px] leading-relaxed text-amber-300"><AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />Estimated Linear Footage{basis ? ` from ${basis}` : ""}. Final footage will be verified during the site visit.</p>;
}

// ─── Shell ─────────────────────────────────────────────────────────────────────
function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-print-root min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_783e5c7b.png"
              alt="Noland Earthworks"
              className="h-10 w-auto object-contain"
            />
            <div>
              <p className="text-amber-500 font-bold text-sm tracking-wide">NOLAND EARTHWORKS</p>
              <p className="text-zinc-500 text-xs">Veteran-Owned Land Management &bull; Middle &amp; West Tennessee</p>
            </div>
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
      <main className="max-w-xl mx-auto px-4 py-8">{children}</main>
      <footer className="border-t border-zinc-800 px-4 py-6 text-center">
        <p className="text-zinc-600 text-xs">
          Noland Earthworks, LLC &bull; Vanleer, TN &bull; Licensed &amp; Insured &bull; Veteran-Owned &amp; Operated
        </p>
      </footer>
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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function NativeQuotePortal() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [depositPct, setDepositPct] = useState<DepositPct>(25);
  const [showDeclineNote, setShowDeclineNote] = useState(false);
  const [declineMessage, setDeclineMessage] = useState("");
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changesNote, setChangesNote] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showAcceptanceForm, setShowAcceptanceForm] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureConsent, setSignatureConsent] = useState(false);

  // URL feedback (deposit=success|cancelled)
  const [urlFeedback, setUrlFeedback] = useState<"success" | "cancelled" | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const dep = sp.get("deposit");
    if (dep === "success") setUrlFeedback("success");
    else if (dep === "cancelled") setUrlFeedback("cancelled");
  }, []);

  const { data: quote, isLoading, error } = trpc.nativeQuotes.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const actionMut = trpc.nativeQuotes.portalAction.useMutation({
    onSuccess: () => {
      toast.success(
        pendingAction === "declined"
          ? "Response recorded. Thank you for letting us know."
          : "Change request sent. Jon will follow up with a revised quote."
      );
      setPendingAction(null);
      setShowDeclineNote(false);
      setShowChangesForm(false);
      // Refresh
      window.location.reload();
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingAction(null);
    },
  });

  const depositMut = trpc.nativeQuotes.publicDepositSession.useMutation({
    onSuccess: (data) => {
      window.open(data.checkoutUrl ?? "", "_blank");
      toast.success("Redirecting to secure payment...");
    },
    onError: (err) => toast.error(err.message),
  });

  const acceptPhaseOneMut = trpc.nativeQuotes.acceptPhaseOne.useMutation({
    onSuccess: () => {
      toast.success("Phase 1 accepted and signed. You may now pay the Phase 1 deposit.");
      window.location.reload();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleAcceptPhaseOne() {
    if (typedSignature.trim().length < 2) {
      toast.error("Enter your full name as your signature.");
      return;
    }
    if (!signatureConsent) {
      toast.error("Confirm your electronic signature consent before accepting Phase 1.");
      return;
    }
    acceptPhaseOneMut.mutate({ token, typedSignature: typedSignature.trim(), consent: true });
  }

  function handleDecline() {
    setPendingAction("declined");
    actionMut.mutate({ token, action: "declined", note: declineMessage || undefined });
  }

  function handleRequestChanges() {
    if (changesNote.trim().length < 10) {
      toast.error("Please describe the changes you need (at least 10 characters).");
      return;
    }
    setPendingAction("changes_requested");
    actionMut.mutate({ token, action: "changes_requested", note: changesNote });
  }

  function handleDeposit() {
    depositMut.mutate({ token, depositPct, origin: window.location.origin });
  }


  if (!token) return <PortalShell><ErrorCard message="Invalid quote link." /></PortalShell>;

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

  const fmt = (cents: number) => formatQuoteCents(cents);

  const phaseSummary = quote.phaseSummary;
  const revisionLabel = quote.revisionNumber > 0 ? `Revision ${quote.revisionNumber}` : null;
  const phaseOneTotalCents = quote.phaseOneApprovedCents ?? phaseSummary.phaseOneTotalCents;
  const depositCents = roundQuoteCentsUp(phaseOneTotalCents * (depositPct / 100));
  const balanceCents = phaseOneTotalCents - depositCents;
  const isApproved = quote.clientAction === "approved";
  const isDeclined = quote.clientAction === "declined";
  const hasSignedPhaseOneAcceptance = isApproved
    && quote.signatureMode === "typed"
    && !!quote.signatureTypedText
    && !!quote.signedAt
    && !!quote.phaseOneSignatureConsentAt
    && quote.phaseOneAcceptanceScope === "phase_1";
  const hasDepositPaid = !!quote.depositPaidAt;

  const approvedPhaseSections = phaseSummary.approvedPhaseSections;
  const optionalFuturePhaseSections = phaseSummary.optionalFuturePhaseSections;
  const unassignedApprovedLineItems = phaseSummary.unassignedApprovedLineItems;

  return (
    <PortalShell>
      {/* PDF button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded-md px-3 py-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download PDF
        </button>
      </div>

      {/* Deposit success/cancel banner */}
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{quote.title}</h1>
            {revisionLabel && <span className="print:border-zinc-400 rounded border border-zinc-600 px-2 py-0.5 text-xs font-semibold text-zinc-300">{revisionLabel}</span>}
          </div>
        {quote.propertyAddress && (
          <div className="flex items-center gap-2 mt-2 text-zinc-400 text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{quote.propertyAddress}</span>
          </div>
        )}
        {quote.portalSentAt && (
          <p className="text-zinc-500 text-xs mt-2">
            Sent {new Date(quote.portalSentAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Approved / Declined banner */}
      {hasSignedPhaseOneAcceptance && (
        <div className="mb-6 rounded-lg bg-emerald-900/40 border border-emerald-700 p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-300 font-semibold text-sm">Phase 1 accepted and signed.</p>
            {quote.signatureTypedText && <p className="text-emerald-400/80 text-xs mt-0.5">Signed by {quote.signatureTypedText}</p>}
            {quote.signedAt && (
              <p className="text-emerald-400/80 text-xs mt-0.5">
                Accepted on {new Date(quote.signedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      )}
      {hasSignedPhaseOneAcceptance && (
        <div className="hidden print-only rounded-lg border border-emerald-700 bg-emerald-50 p-5 mb-6 text-zinc-900">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-800">Phase 1 Acceptance Record</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p><span className="font-semibold">Electronically signed by:</span> {quote.signatureTypedText}</p>
            <p><span className="font-semibold">Acceptance timestamp:</span> {quote.signedAt ? new Date(quote.signedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }) : "Recorded"}</p>
            <p><span className="font-semibold">Consent:</span> Electronic signature consent confirmed</p>
            <p><span className="font-semibold">Accepted scope:</span> Phase 1 — Current Approval only</p>
          </div>
        </div>
      )}
      {isApproved && !hasSignedPhaseOneAcceptance && (
        <div className="mb-6 rounded-lg bg-amber-900/30 border border-amber-700 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-200 text-sm">A typed Phase 1 signature is required before a deposit can be paid.</p>
        </div>
      )}
      {isDeclined && (
        <div className="mb-6 rounded-lg bg-red-900/30 border border-red-800 p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">This quote was declined.</p>
        </div>
      )}
      {quote.clientAction === "changes_requested" && (
        <div className="mb-6 rounded-lg bg-orange-900/30 border border-orange-700 p-4 flex items-start gap-3">
          <MessageSquareDiff className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-orange-300 text-sm">Changes were requested. Jon will follow up with a revised quote.</p>
        </div>
      )}

      {/* Job details */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mb-6">
        {quote.serviceType && (
          <div className="flex items-center justify-between px-5 py-3 gap-4 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-sm shrink-0">
              <Briefcase className="w-4 h-4 text-zinc-600" />
              Service
            </div>
            <span className="text-zinc-200 text-sm text-right">{quote.serviceType}</span>
          </div>
        )}
        {quote.acreage && (
          <div className="flex items-center justify-between px-5 py-3 gap-4 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-sm shrink-0">
              <MapPin className="w-4 h-4 text-zinc-600" />
              Acreage
            </div>
            <span className="text-zinc-200 text-sm text-right">{quote.acreage} acres</span>
          </div>
        )}
        {quote.estimatedDuration && (
          <div className="flex items-center justify-between px-5 py-3 gap-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm shrink-0">
              <Clock className="w-4 h-4 text-zinc-600" />
              Expected timeline
            </div>
            <span className="text-zinc-200 text-sm text-right">{formatWorkingDays(quote.estimatedDuration)}</span>
          </div>
        )}
      </div>

      {/* Client message */}
      {quote.clientMessage && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 mb-6">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-2">Message from Jon</p>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{quote.clientMessage}</p>
        </div>
      )}

      {quote.sitePhotoReferences.length > 0 && (
        <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5 print:border-zinc-300 print:bg-white print:text-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 print:text-amber-800">Site reference photos</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400 print:text-zinc-600">These photos document visible site conditions at the time of review and support the stated scope. Final conditions and scope remain subject to site verification.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 print:grid-cols-2">
            {quote.sitePhotoReferences.map((photo) => (
              <figure key={photo.url} className="break-inside-avoid overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950/30 print:border-zinc-300 print:bg-white">
                <img src={photo.url} alt={photo.caption} className="h-32 w-full object-cover print:h-36" />
                <figcaption className="space-y-2 p-2.5"><p className="text-xs leading-relaxed text-zinc-200 print:text-zinc-800">{photo.caption}</p>{photo.tags.length > 0 && <div className="flex flex-wrap gap-1">{photo.tags.map((tag) => <span key={tag} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-100 print:bg-amber-100 print:text-amber-900">{tag}</span>)}</div>}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Phase 1 — current approval */}
      {(approvedPhaseSections.length > 0 || unassignedApprovedLineItems.length > 0) && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-zinc-800">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest">Phase 1 — Current Approval</p>
            <p className="mt-1 text-zinc-500 text-xs">This is the work you are approving today.</p>
          </div>
          {approvedPhaseSections.map((section, sectionIndex) => (
            <div key={section.phase.phaseId ?? sectionIndex} className="border-b border-zinc-800 last:border-0">
              <div className="flex items-start justify-between gap-4 bg-zinc-800/35 px-5 py-3">
                <div>
                  <p className="text-zinc-100 text-sm font-semibold">{section.phase.description}</p>
                  {section.phase.estimatedDuration && <p className="mt-0.5 text-zinc-400 text-xs">Estimated duration: {section.phase.estimatedDuration} working day{section.phase.estimatedDuration === "1" ? "" : "s"}</p>}
                </div>
                <span className="text-amber-300 text-sm font-semibold shrink-0">{fmt(section.totalCents)}</span>
              </div>
              {(() => {
                const sectionItems = section.lineItems.filter((item) => item !== section.phase);
                const firstDiscountIndex = sectionItems.findIndex(isCustomerDiscount);
                return sectionItems.map((li, i) => (
                  <div key={`${section.phase.phaseId}-${i}`}>
                    {i === firstDiscountIndex && <div className="flex items-center justify-between border-t border-amber-500/30 bg-amber-500/[0.06] px-5 py-2 text-xs font-semibold text-zinc-200 print:border-zinc-300 print:bg-zinc-100 print:text-zinc-800"><span>Subtotal before discount</span><span>{fmt(section.subtotalCents)}</span></div>}
                    <div className={`flex items-start justify-between gap-4 border-t px-5 py-3 ${isCustomerDiscount(li) ? "border-emerald-400/45 border-l-2 border-t-emerald-400/30 bg-emerald-500/[0.10] print:border-emerald-700 print:bg-emerald-50" : "border-zinc-800"}`}>
                      <div className="flex-1">
                        <p className={isCustomerDiscount(li) ? "text-sm font-semibold text-emerald-200 print:text-emerald-900" : "text-sm text-zinc-200"}>{isCustomerDiscount(li) ? `Discount applied — ${li.description}` : li.description}</p>
                        {(li.qty !== 1 || isLinearFootQuoteLine(li)) && <p className="mt-0.5 text-xs text-zinc-500">{lineQuantityText(li)} &times; {fmt(li.unitPriceCents)}</p>}
                        <EstimatedFootageNotice item={li} />
                      </div>
                      <span className={isCustomerDiscount(li) ? "shrink-0 text-sm font-semibold text-emerald-200 print:text-emerald-900" : "shrink-0 text-sm font-medium text-amber-400"}>{fmt(li.qty * li.unitPriceCents)}</span>
                    </div>
                  </div>
                ));
              })()}
              <div className="border-t border-amber-500/25 bg-amber-500/[0.07] px-5 py-3">
                <div className="flex items-center justify-between text-xs text-zinc-300"><span>Phase subtotal</span><span>{fmt(section.subtotalCents)}</span></div>
                {section.discountCents < 0 && <div className="mt-1 flex items-center justify-between text-xs text-emerald-300"><span>Phase discounts</span><span>{fmt(section.discountCents)}</span></div>}
                <div className="mt-2 flex items-center justify-between text-sm font-semibold text-white"><span>Phase total</span><span className="text-amber-300">{fmt(section.totalCents)}</span></div>
              </div>
            </div>
          ))}
          {(() => {
            const firstDiscountIndex = unassignedApprovedLineItems.findIndex(isCustomerDiscount);
            const subtotalCents = unassignedApprovedLineItems
              .filter((item) => !isCustomerDiscount(item))
              .reduce((sum, item) => sum + (item.qty * item.unitPriceCents), 0);
            return unassignedApprovedLineItems.map((li, i) => (
              <div key={`unassigned-${i}`}>
                {i === firstDiscountIndex && <div className="flex items-center justify-between border-t border-amber-500/30 bg-amber-500/[0.06] px-5 py-2 text-xs font-semibold text-zinc-200 print:border-zinc-300 print:bg-zinc-100 print:text-zinc-800"><span>Subtotal before discount</span><span>{fmt(subtotalCents)}</span></div>}
                <div className={`flex items-start justify-between gap-4 border-b px-5 py-3 ${isCustomerDiscount(li) ? "border-emerald-400/45 border-l-2 bg-emerald-500/[0.10] print:border-emerald-700 print:bg-emerald-50" : "border-zinc-800"}`}>
                  <div className="min-w-0"><p className={isCustomerDiscount(li) ? "text-sm font-semibold text-emerald-200 print:text-emerald-900" : "text-sm text-zinc-200"}>{isCustomerDiscount(li) ? `Discount applied — ${li.description}` : li.description}</p>{(li.qty !== 1 || isLinearFootQuoteLine(li)) && <p className="mt-0.5 text-xs text-zinc-500">{lineQuantityText(li)} &times; {fmt(li.unitPriceCents)}</p>}<EstimatedFootageNotice item={li} /></div>
                  <span className={isCustomerDiscount(li) ? "shrink-0 text-sm font-semibold text-emerald-200 print:text-emerald-900" : "shrink-0 text-sm font-medium text-amber-400"}>{fmt(li.qty * li.unitPriceCents)}</span>
                </div>
              </div>
            ));
          })()}
          <div className="flex items-center justify-between px-5 py-4 bg-zinc-800/60">
            <span className="text-white font-bold text-sm">Phase 1 total</span>
            <span className="text-amber-400 font-bold text-lg">{fmt(phaseSummary.phaseOneTotalCents)}</span>
          </div>
        </div>
      )}

      {/* Optional future phases */}
      {phaseSummary.hasOptionalFuturePhases && (
        <>
          <div className="my-8 flex items-center gap-3" aria-label="Optional future phase separator">
            <div className="h-px flex-1 bg-indigo-500/45" />
            <p className="text-center text-[11px] font-bold uppercase tracking-widest text-indigo-200">Phase 2 and later — Optional future work</p>
            <div className="h-px flex-1 bg-indigo-500/45" />
          </div>
          <div className="rounded-xl border-2 border-indigo-500/45 bg-indigo-500/[0.07] overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-indigo-500/20">
            <p className="text-indigo-100 text-sm font-bold">Optional Future Phases</p>
            <p className="mt-2 text-indigo-100/80 text-sm leading-relaxed">These phases are shown for planning only. They are not included in today’s approval, deposit, or schedule. A separate authorization will be provided before any future phase begins.</p>
          </div>
          {optionalFuturePhaseSections.map((section, sectionIndex) => (
            <div key={section.phase.phaseId ?? sectionIndex} className="border-b border-indigo-500/15 last:border-0">
              <div className="flex items-start justify-between gap-4 bg-indigo-950/25 px-5 py-3">
                <div>
                  <p className="text-indigo-50 text-sm font-semibold">{section.phase.description}</p>
                  {section.phase.estimatedDuration && <p className="mt-0.5 text-indigo-200/60 text-xs">Estimated duration: {section.phase.estimatedDuration} working day{section.phase.estimatedDuration === "1" ? "" : "s"}</p>}
                </div>
                <span className="text-indigo-200 text-sm font-semibold shrink-0">{fmt(section.totalCents)}</span>
              </div>
              {(() => {
                const sectionItems = section.lineItems.filter((item) => item !== section.phase);
                const firstDiscountIndex = sectionItems.findIndex(isCustomerDiscount);
                return sectionItems.map((li, i) => (
                  <div key={`${section.phase.phaseId}-${i}`}>
                    {i === firstDiscountIndex && <div className="flex items-center justify-between border-t border-indigo-500/40 bg-indigo-500/[0.09] px-5 py-2 text-xs font-semibold text-indigo-100 print:border-zinc-300 print:bg-zinc-100 print:text-zinc-800"><span>Subtotal before discount</span><span>{fmt(section.subtotalCents)}</span></div>}
                    <div className={`flex items-start justify-between gap-4 border-t px-5 py-3 ${isCustomerDiscount(li) ? "border-emerald-400/45 border-l-2 border-t-emerald-400/30 bg-emerald-500/[0.10] print:border-emerald-700 print:bg-emerald-50" : "border-indigo-500/15"}`}>
                      <div className="flex-1">
                        <p className={isCustomerDiscount(li) ? "text-sm font-semibold text-emerald-200 print:text-emerald-900" : "text-sm text-indigo-50"}>{isCustomerDiscount(li) ? `Discount applied — ${li.description}` : li.description}</p>
                        {(li.qty !== 1 || isLinearFootQuoteLine(li)) && <p className="mt-0.5 text-xs text-indigo-200/60">{lineQuantityText(li)} &times; {fmt(li.unitPriceCents)}</p>}
                        <EstimatedFootageNotice item={li} />
                      </div>
                      <span className={isCustomerDiscount(li) ? "shrink-0 text-sm font-semibold text-emerald-200 print:text-emerald-900" : "shrink-0 text-sm font-medium text-indigo-200"}>{fmt(li.qty * li.unitPriceCents)}</span>
                    </div>
                  </div>
                ));
              })()}
              <div className="border-t border-indigo-500/30 bg-indigo-950/35 px-5 py-3">
                <div className="flex items-center justify-between text-xs text-indigo-100"><span>Phase subtotal</span><span>{fmt(section.subtotalCents)}</span></div>
                {section.discountCents < 0 && <div className="mt-1 flex items-center justify-between text-xs text-emerald-300"><span>Phase discounts</span><span>{fmt(section.discountCents)}</span></div>}
                <div className="mt-2 flex items-center justify-between text-sm font-semibold text-indigo-50"><span>Phase total</span><span>{fmt(section.totalCents)}</span></div>
              </div>
            </div>
          ))}
          <div className="px-5 py-3 bg-indigo-950/30">
            <div className="flex items-center justify-between text-sm text-indigo-100"><span>Optional future work</span><span className="font-semibold">{fmt(phaseSummary.optionalFutureTotalCents)}</span></div>
            <div className="mt-2 flex items-center justify-between text-xs text-indigo-200/70"><span>Potential full project total</span><span>{fmt(phaseSummary.allPhasesTotalCents)}</span></div>
          </div>
          </div>
        </>
      )}

      {/* Deposit section */}
      {hasSignedPhaseOneAcceptance && !hasDepositPaid && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 mb-6">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-4">Secure Phase 1 — Pay Deposit</p>
          <div className="flex gap-2 mb-4">
            {([25, 33, 50] as DepositPct[]).map(pct => (
              <button
                key={pct}
                onClick={() => setDepositPct(pct)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  depositPct === pct
                    ? "bg-amber-500 border-amber-500 text-black"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-zinc-400">Deposit ({depositPct}%)</span>
            <span className="text-white font-medium">{fmt(depositCents)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-zinc-400">Phase 1 balance due at completion</span>
            <span className="text-zinc-300">{fmt(balanceCents)}</span>
          </div>
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
            onClick={handleDeposit}
            disabled={depositMut.isPending}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {depositMut.isPending ? "Redirecting..." : `Pay ${fmt(depositCents)} Phase 1 Deposit`}
          </Button>
        </div>
      )}

      {hasDepositPaid && (
        <div className="mb-6 rounded-lg bg-green-900/40 border border-green-700 p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-green-300 font-semibold text-sm">Deposit paid — {fmt(quote.depositPaidCents ?? 0)}</p>
            {quote.depositPaidAt && (
              <p className="text-green-400/80 text-xs mt-0.5">
                Paid on {new Date(quote.depositPaidAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!hasSignedPhaseOneAcceptance && !isDeclined && (
        <div className="space-y-3 mb-6">
          {/* Signed Phase 1 acceptance */}
          {!showDeclineNote && !showChangesForm && !showAcceptanceForm && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12"
              onClick={() => setShowAcceptanceForm(true)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept Quote & Sign Phase 1
            </Button>
          )}

          {showAcceptanceForm && (
            <div className="rounded-xl border border-emerald-700 bg-emerald-950/30 p-4 space-y-4">
              <div>
                <p className="text-emerald-200 font-semibold text-sm">Accept Phase 1 Quote</p>
                <p className="mt-1 text-zinc-300 text-xs leading-relaxed">Your signature approves only the Phase 1 work and total shown above. Optional future phases are not approved, scheduled, or included in this acceptance.</p>
              </div>
              <div>
                <label htmlFor="phase-one-signature" className="block text-zinc-300 text-xs font-medium mb-1.5">Type your full legal name</label>
                <input
                  id="phase-one-signature"
                  value={typedSignature}
                  onChange={(event) => setTypedSignature(event.target.value)}
                  placeholder="Full name"
                  maxLength={255}
                  className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                />
              </div>
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signatureConsent}
                  onChange={(event) => setSignatureConsent(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                />
                <span>I agree that typing my name is my electronic signature. I accept the Phase 1 scope and total only, and understand that optional future phases require separate authorization.</span>
              </label>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={handleAcceptPhaseOne}
                  disabled={acceptPhaseOneMut.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {acceptPhaseOneMut.isPending ? "Recording acceptance..." : "Sign & Accept Phase 1"}
                </Button>
                <Button variant="outline" className="border-zinc-600 text-zinc-300" onClick={() => setShowAcceptanceForm(false)} disabled={acceptPhaseOneMut.isPending}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Request Changes */}
          {!showDeclineNote && !showAcceptanceForm && (
            <>
              {!showChangesForm ? (
                <Button
                  variant="outline"
                  className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800 h-10"
                  onClick={() => setShowChangesForm(true)}
                >
                  <MessageSquareDiff className="w-4 h-4 mr-2" />
                  Request Changes
                </Button>
              ) : (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                  <p className="text-zinc-400 text-sm font-medium">Describe the changes you need:</p>
                  <Textarea
                    value={changesNote}
                    onChange={e => setChangesNote(e.target.value)}
                    placeholder="What would you like adjusted?"
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                      onClick={handleRequestChanges}
                      disabled={actionMut.isPending}
                    >
                      {actionMut.isPending && pendingAction === "changes_requested" ? "Sending..." : "Send Request"}
                    </Button>
                    <Button variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => setShowChangesForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Decline */}
          {!showChangesForm && !showAcceptanceForm && (
            <>
              {!showDeclineNote ? (
                <Button
                  variant="ghost"
                  className="w-full text-zinc-500 hover:text-red-400 hover:bg-red-900/20 h-9 text-sm"
                  onClick={() => setShowDeclineNote(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              ) : (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                  <p className="text-zinc-400 text-sm font-medium">Optional — let Jon know why you're declining:</p>
                  <Textarea
                    value={declineMessage}
                    onChange={e => setDeclineMessage(e.target.value)}
                    placeholder="Not required, but appreciated."
                    className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm min-h-[70px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-red-700 hover:bg-red-800 text-white font-semibold"
                      onClick={handleDecline}
                      disabled={actionMut.isPending}
                    >
                      {actionMut.isPending && pendingAction === "declined" ? "Submitting..." : "Confirm Decline"}
                    </Button>
                    <Button variant="outline" className="border-zinc-700 text-zinc-400" onClick={() => setShowDeclineNote(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Contact */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 text-center">
        <p className="text-zinc-500 text-xs mb-3">Questions? Reach Jon directly.</p>
        <div className="flex items-center justify-center gap-6">
          <a href="tel:6154064819" className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors">
            615-406-4819
          </a>
          <a href="mailto:quotes@nolandearthworks.com" className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors">
            quotes@nolandearthworks.com
          </a>
        </div>
      </div>
    </PortalShell>
  );
}
