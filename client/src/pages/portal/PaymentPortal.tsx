/**
 * Customer Payment Portal — Noland Earthworks
 *
 * Customers land here when they follow a payment link Jon sends them.
 * They must be logged in to pay. This page shows their payment history
 * and any outstanding balances.
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Loader2, CreditCard, CheckCircle2, Clock, AlertCircle, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

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
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: any }) {
  const isPending = payment.status === "pending";
  const isPaid = payment.status === "paid";

  return (
    <div
      className={cn(
        "border rounded-lg p-4 space-y-3 transition-colors",
        isPending
          ? "border-yellow-500/30 bg-yellow-500/5"
          : isPaid
          ? "border-green-500/20 bg-green-500/5"
          : "border-border bg-secondary/10"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            {payment.jobTitle || `Job #${payment.jobId}`}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {payment.type === "deposit" ? "Deposit" : "Final Balance"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-foreground">{formatMoney(payment.amountCents)}</p>
          {isPaid ? (
            <span className="flex items-center gap-1 text-[10px] text-green-400 justify-end">
              <CheckCircle2 className="w-3 h-3" />Paid {formatDate(payment.paidAt)}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-yellow-400 justify-end">
              <Clock className="w-3 h-3" />Outstanding
            </span>
          )}
        </div>
      </div>

      {isPending && (
        <a
          href={`/portal/pay/${payment.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors"
        >
          <CreditCard className="w-3.5 h-3.5" />
          Pay Now
        </a>
      )}
    </div>
  );
}

// ─── Main Portal Page ─────────────────────────────────────────────────────────

export default function PaymentPortal() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: payments = [], isLoading: paymentsLoading } = trpc.payment.listMyPayments.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const pending = payments.filter((p: any) => p.status === "pending");
  const paid = payments.filter((p: any) => p.status === "paid");
  const pendingTotal = pending.reduce((sum: number, p: any) => sum + p.amountCents, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <CreditCard className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Customer Payment Portal</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to view and pay your outstanding balances with Noland Earthworks.
            </p>
          </div>
          <a
            href={getLoginUrl("/portal")}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
          >
            Sign In to Continue
          </a>
          <p className="text-xs text-muted-foreground">
            Need help? Call us at{" "}
            <a href="tel:+16154004064" className="text-primary hover:underline">
              (615) 400-4064
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Noland Earthworks Payments</span>
          </div>
          <span className="text-xs text-muted-foreground">{user?.name || user?.email}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {paymentsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">All clear</p>
              <p className="text-sm text-muted-foreground">
                You have no outstanding payments with Noland Earthworks.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Outstanding balance summary */}
            {pending.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                  <p className="text-sm font-semibold text-foreground">Outstanding Balance</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatMoney(pendingTotal)}</p>
                <p className="text-xs text-muted-foreground">
                  {pending.length} payment{pending.length !== 1 ? "s" : ""} due
                </p>
              </div>
            )}

            {/* Pending payments */}
            {pending.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Due Now
                </p>
                {pending.map((p: any) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </div>
            )}

            {/* Paid payments */}
            {paid.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment History
                </p>
                {paid.map((p: any) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-6 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Questions about your invoice?
          </p>
          <p className="text-xs text-muted-foreground">
            Call{" "}
            <a href="tel:+16154004064" className="text-primary hover:underline">
              (615) 400-4064
            </a>{" "}
            or email{" "}
            <a href="mailto:jon@nolandearthworks.com" className="text-primary hover:underline">
              jon@nolandearthworks.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
