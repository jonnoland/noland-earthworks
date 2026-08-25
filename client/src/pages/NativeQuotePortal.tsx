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

// ─── Shell ─────────────────────────────────────────────────────────────────────
function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
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
        pendingAction === "approved"
          ? "Quote approved. Jon will be in touch shortly."
          : pendingAction === "declined"
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

  function handleApprove() {
    setPendingAction("approved");
    actionMut.mutate({ token, action: "approved" });
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
  const phaseOneTotalCents = quote.phaseOneApprovedCents ?? phaseSummary.phaseOneTotalCents;
  const depositCents = roundQuoteCentsUp(phaseOneTotalCents * (depositPct / 100));
  const balanceCents = phaseOneTotalCents - depositCents;
  const isActioned = !!quote.clientAction;
  const isApproved = quote.clientAction === "approved";
  const isDeclined = quote.clientAction === "declined";
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
        <h1 className="text-2xl font-bold text-white">{quote.title}</h1>
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
      {isApproved && (
        <div className="mb-6 rounded-lg bg-emerald-900/40 border border-emerald-700 p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-300 font-semibold text-sm">Phase 1 approved.</p>
            {quote.clientActionAt && (
              <p className="text-emerald-400/80 text-xs mt-0.5">
                Approved on {new Date(quote.clientActionAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
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
              {section.lineItems.filter((item) => item !== section.phase).map((li, i) => (
                <div key={`${section.phase.phaseId}-${i}`} className="flex items-start justify-between px-5 py-3 border-t border-zinc-800 gap-4">
                  <div className="flex-1">
                    <p className={li.totalCents < 0 || li.kind === "discount" ? "text-emerald-300 text-sm" : "text-zinc-200 text-sm"}>{li.description}</p>
                    {li.qty !== 1 && <p className="text-zinc-500 text-xs mt-0.5">{li.qty} &times; {fmt(li.unitPriceCents)}</p>}
                  </div>
                  <span className={li.totalCents < 0 || li.kind === "discount" ? "text-emerald-300 text-sm font-medium shrink-0" : "text-amber-400 text-sm font-medium shrink-0"}>{fmt(li.qty * li.unitPriceCents)}</span>
                </div>
              ))}
            </div>
          ))}
          {unassignedApprovedLineItems.map((li, i) => (
            <div key={`unassigned-${i}`} className="flex items-start justify-between px-5 py-3 border-b border-zinc-800 last:border-0 gap-4">
              <p className="text-zinc-200 text-sm">{li.description}</p>
              <span className="text-amber-400 text-sm font-medium shrink-0">{fmt(li.qty * li.unitPriceCents)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-4 bg-zinc-800/60">
            <span className="text-white font-bold text-sm">Phase 1 total</span>
            <span className="text-amber-400 font-bold text-lg">{fmt(phaseSummary.phaseOneTotalCents)}</span>
          </div>
        </div>
      )}

      {/* Optional future phases */}
      {phaseSummary.hasOptionalFuturePhases && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.07] overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-indigo-500/20">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">Optional Future Phases</p>
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
              {section.lineItems.filter((item) => item !== section.phase).map((li, i) => (
                <div key={`${section.phase.phaseId}-${i}`} className="flex items-start justify-between px-5 py-3 border-t border-indigo-500/15 gap-4">
                  <div className="flex-1">
                    <p className={li.totalCents < 0 || li.kind === "discount" ? "text-emerald-300 text-sm" : "text-indigo-50 text-sm"}>{li.description}</p>
                    {li.qty !== 1 && <p className="text-indigo-200/60 text-xs mt-0.5">{li.qty} &times; {fmt(li.unitPriceCents)}</p>}
                  </div>
                  <span className={li.totalCents < 0 || li.kind === "discount" ? "text-emerald-300 text-sm font-medium shrink-0" : "text-indigo-200 text-sm font-medium shrink-0"}>{fmt(li.qty * li.unitPriceCents)}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="px-5 py-3 bg-indigo-950/30">
            <div className="flex items-center justify-between text-sm text-indigo-100"><span>Optional future work</span><span className="font-semibold">{fmt(phaseSummary.optionalFutureTotalCents)}</span></div>
            <div className="mt-2 flex items-center justify-between text-xs text-indigo-200/70"><span>Potential full project total</span><span>{fmt(phaseSummary.allPhasesTotalCents)}</span></div>
          </div>
        </div>
      )}

      {/* Deposit section */}
      {isApproved && !hasDepositPaid && (
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
      {!isActioned && (
        <div className="space-y-3 mb-6">
          {/* Approve */}
          {!showDeclineNote && !showChangesForm && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12"
              onClick={handleApprove}
              disabled={actionMut.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {actionMut.isPending && pendingAction === "approved" ? "Approving..." : "Approve Phase 1"}
            </Button>
          )}

          {/* Request Changes */}
          {!showDeclineNote && (
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
          {!showChangesForm && (
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
