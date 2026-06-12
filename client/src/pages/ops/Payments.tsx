/**
 * Ops Payments Page — Noland Earthworks
 * Allows Jon to create deposit and final balance payment links for customers.
 * Links are generated via Stripe Checkout and can be copied/sent to the customer.
 */

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  CreditCard, DollarSign, Loader2, Copy, CheckCircle2,
  AlertCircle, Plus, X, ExternalLink, Clock, User,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Create Payment Link Modal ────────────────────────────────────────────────

function CreatePaymentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (url: string) => void;
}) {
  const [type, setType] = useState<"deposit" | "balance">("deposit");
  const [jobId, setJobId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amountDollars, setAmountDollars] = useState("");

  const { data: jobs = [], isLoading: jobsLoading } = trpc.ops.jobs.list.useQuery();
  const { data: customers = [], isLoading: customersLoading } = trpc.ops.settings.listUsers.useQuery();

  const createDeposit = trpc.payment.createDepositSession.useMutation({
    onSuccess: (data) => {
      toast.success("Deposit link created.");
      onCreated(data.url);
    },
    onError: (e) => toast.error(e.message || "Failed to create deposit link."),
  });

  const createBalance = trpc.payment.createBalanceSession.useMutation({
    onSuccess: (data) => {
      toast.success("Balance link created.");
      onCreated(data.url);
    },
    onError: (e) => toast.error(e.message || "Failed to create balance link."),
  });

  const isPending = createDeposit.isPending || createBalance.isPending;

  const amountCents = useMemo(() => {
    const val = parseFloat(amountDollars);
    if (isNaN(val) || val < 0.5) return 0;
    return Math.round(val * 100);
  }, [amountDollars]);

  const canSubmit =
    jobId && customerId && amountCents >= 50 && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const input = {
      jobId: parseInt(jobId),
      customerId: parseInt(customerId),
      amountCents,
      origin: window.location.origin,
    };
    if (type === "deposit") {
      createDeposit.mutate(input);
    } else {
      createBalance.mutate(input);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Create Payment Link</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Payment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["deposit", "balance"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "py-2.5 rounded-md text-xs font-medium border transition-colors",
                    type === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/30 text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {t === "deposit" ? "Deposit" : "Final Balance"}
                </button>
              ))}
            </div>
          </div>

          {/* Job selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Job
            </label>
            {jobsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3 h-3 animate-spin" />Loading jobs...
              </div>
            ) : (
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                required
                className="w-full bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
              >
                <option value="">Select a job...</option>
                {jobs.map((j: any) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.client}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Customer selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Customer (must have an account)
            </label>
            {customersLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3 h-3 animate-spin" />Loading customers...
              </div>
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full bg-secondary/30 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
              >
                <option value="">Select a customer...</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email} {c.email && c.name ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Amount (USD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="number"
                min="0.50"
                step="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-secondary/30 border border-border rounded-md pl-8 pr-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
              />
            </div>
            {amountCents > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {formatMoney(amountCents)} will be charged
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md text-xs text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Generate Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Payment Link Result Modal ────────────────────────────────────────────────

function PaymentLinkModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Link copied to clipboard.");
      setTimeout(() => setCopied(false), 3000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold text-foreground">Payment Link Ready</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Copy this link and send it to the customer. They will be taken to a secure Stripe checkout page.
        </p>
        <div className="bg-secondary/30 border border-border rounded-md px-3 py-2.5 text-[10px] font-mono text-muted-foreground break-all">
          {url}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-semibold transition-colors",
              copied
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Link"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-medium text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview
          </a>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Payment Status Badge ─────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: string }) {
  const config: Record<string, { cls: string; label: string }> = {
    paid:      { cls: "bg-green-500/15 text-green-400",  label: "Paid" },
    pending:   { cls: "bg-yellow-500/15 text-yellow-400", label: "Pending" },
    cancelled: { cls: "bg-secondary/50 text-muted-foreground", label: "Cancelled" },
  };
  const { cls, label } = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Payments() {
  const [showCreate, setShowCreate] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const { data: isConfigured, isLoading: configLoading } = trpc.payment.isConfigured.useQuery();
  const { data: allPayments = [], isLoading: paymentsLoading, refetch } =
    trpc.payment.listJobPaymentSummaries.useQuery();

  function handleCreated(url: string) {
    setShowCreate(false);
    setGeneratedUrl(url);
    refetch();
  }

  const paidTotal = useMemo(
    () => allPayments.filter((p: any) => p.status === "paid").reduce((sum: number, p: any) => sum + p.amountCents, 0),
    [allPayments]
  );
  const pendingTotal = useMemo(
    () => allPayments.filter((p: any) => p.status === "pending").reduce((sum: number, p: any) => sum + p.amountCents, 0),
    [allPayments]
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">Payments</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send deposit and balance payment links to customers via Stripe.
            </p>
          </div>
          {isConfigured && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Payment Link
            </button>
          )}
        </div>

        {/* Not configured warning */}
        {!configLoading && !isConfigured && (
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Stripe is not configured</p>
              <p className="text-xs text-muted-foreground">
                Go to <a href="/ops/settings" className="text-primary hover:underline">Settings &rarr; Payments</a> to set up your Stripe account.
              </p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        {isConfigured && (
          <div className="grid grid-cols-2 gap-4">
            <div className="ops-card p-4 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Collected</p>
              <p className="text-xl font-bold text-green-400">{formatMoney(paidTotal)}</p>
              <p className="text-[10px] text-muted-foreground">
                {allPayments.filter((p: any) => p.status === "paid").length} payments
              </p>
            </div>
            <div className="ops-card p-4 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-yellow-400">{formatMoney(pendingTotal)}</p>
              <p className="text-[10px] text-muted-foreground">
                {allPayments.filter((p: any) => p.status === "pending").length} outstanding
              </p>
            </div>
          </div>
        )}

        {/* Payments table */}
        <div className="ops-card">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Payment History</span>
            <button
              onClick={() => refetch()}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh"
            >
              <Loader2 className={cn("w-3.5 h-3.5", paymentsLoading ? "animate-spin" : "")} />
            </button>
          </div>

          {paymentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : allPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <CreditCard className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No payments yet.</p>
              {isConfigured && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Create your first payment link
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/10">
                    <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Job</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayments.map((p: any) => (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3 text-muted-foreground shrink-0" />
                          Job #{p.jobId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {p.type === "deposit" ? "Deposit" : "Final Balance"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {formatMoney(p.amountCents)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {p.status === "paid"
                          ? formatDate(p.paidAt)
                          : p.status === "pending"
                          ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(p.createdAt)}
                            </span>
                          )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How it works */}
        {isConfigured && (
          <div className="ops-card p-5 space-y-3">
            <p className="text-xs font-semibold text-foreground">How it works</p>
            <ol className="space-y-2 list-decimal list-inside">
              {[
                "Click \"New Payment Link\" and select the job, customer, amount, and type (deposit or balance).",
                "Copy the generated link and send it to the customer via text or email.",
                "The customer clicks the link, logs in, and pays securely through Stripe.",
                "Payment status updates automatically — no manual tracking needed.",
              ].map((step) => (
                <li key={step} className="text-xs text-muted-foreground">{step}</li>
              ))}
            </ol>
            <p className="text-[10px] text-muted-foreground">
              Test with card <span className="font-mono bg-secondary/50 px-1 rounded">4242 4242 4242 4242</span>, any future expiry, any CVC.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreatePaymentModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {generatedUrl && (
        <PaymentLinkModal
          url={generatedUrl}
          onClose={() => setGeneratedUrl(null)}
        />
      )}
    </DashboardLayout>
  );
}
