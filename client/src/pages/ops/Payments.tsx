/**
 * Native Payments View — Noland Earthworks
 *
 * Payment tracking now comes from native invoices and recorded quote deposits.
 * Deposit checkout starts from an approved quote portal; final collection is
 * managed with the native invoice workspace.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowUpRight, CheckCircle2, CircleDollarSign, FileText, Receipt, WalletCards } from "lucide-react";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function displayDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Payments() {
  const { data: invoices = [], isLoading: invoicesLoading } = trpc.nativeJobs.listInvoices.useQuery({});
  const { data: quoteResult, isLoading: quotesLoading } = trpc.nativeQuotes.list.useQuery({ limit: 100 });
  const quotes = quoteResult?.quotes ?? [];

  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const openInvoices = invoices.filter((invoice) => invoice.status === "unpaid" || invoice.status === "sent");
  const deposits = quotes.filter((quote) => (quote.depositPaidCents ?? 0) > 0);
  const collectedCents = paidInvoices.reduce((sum, invoice) => sum + invoice.totalCents, 0)
    + deposits.reduce((sum, quote) => sum + (quote.depositPaidCents ?? 0), 0);
  const outstandingCents = openInvoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);

  return (
    <DashboardLayout title="Payments" subtitle="Native invoice and approved-quote payment activity">
      <main className="space-y-5 p-4 sm:p-6">
        <section className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Single payment workflow</p>
            <h1 className="mt-1 text-lg font-semibold text-foreground">Deposits begin in approved quote portals. Final balances are tracked in Invoices.</h1>
            <p className="mt-1 text-sm text-muted-foreground">This view is read-only by design so payment status has one source of truth.</p>
          </div>
          <Link href="/ops/invoices" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <Receipt className="h-4 w-4" />Open Invoices
          </Link>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">Collected</p><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">{money(collectedCents)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{paidInvoices.length} paid invoice{paidInvoices.length === 1 ? "" : "s"} and {deposits.length} deposit{deposits.length === 1 ? "" : "s"}</p>
          </section>
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">Outstanding</p><CircleDollarSign className="h-4 w-4 text-amber-400" /></div>
            <p className="mt-2 text-2xl font-semibold text-amber-400">{money(outstandingCents)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{openInvoices.length} invoice{openInvoices.length === 1 ? "" : "s"} awaiting payment</p>
          </section>
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">Payment records</p><WalletCards className="h-4 w-4 text-primary" /></div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{paidInvoices.length + openInvoices.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Native invoices only; no legacy job balances mixed in</p>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div><h2 className="text-sm font-semibold text-foreground">Invoice Payment Status</h2><p className="mt-0.5 text-xs text-muted-foreground">Final balances and their current collection state.</p></div>
            <Link href="/ops/invoices" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">Manage invoices <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </header>
          {invoicesLoading ? <div className="p-5 text-sm text-muted-foreground">Loading invoices…</div> : invoices.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No native invoices have been created yet.</div> : (
            <div className="divide-y divide-border">
              {invoices.slice(0, 12).map((invoice) => <Link key={invoice.id} href="/ops/invoices" className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/20">
                <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{invoice.clientName}</p><p className="truncate text-xs text-muted-foreground">{invoice.serviceType || "Land Management"} · {displayDate(invoice.paidAt ?? invoice.emailSentAt ?? invoice.createdAt)}</p></div>
                <div className="text-right"><p className="text-sm font-semibold text-foreground">{money(invoice.totalCents)}</p><p className={invoice.status === "paid" ? "text-xs text-emerald-400" : "text-xs text-amber-400"}>{invoice.status}</p></div>
              </Link>)}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div><h2 className="text-sm font-semibold text-foreground">Approved Quote Deposits</h2><p className="mt-0.5 text-xs text-muted-foreground">Deposits recorded after client approval in the quote portal.</p></div>
            <Link href="/ops/quotes" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open quotes <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </header>
          {quotesLoading ? <div className="p-5 text-sm text-muted-foreground">Loading quote deposits…</div> : deposits.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No approved quote deposits have been recorded yet.</div> : (
            <div className="divide-y divide-border">
              {deposits.slice(0, 12).map((quote) => <Link key={quote.id} href={`/ops/quotes?quote=${quote.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/20">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{quote.clientName}</p><p className="truncate text-xs text-muted-foreground">{quote.title} · {displayDate(quote.depositPaidAt)}</p></div>
                <p className="text-sm font-semibold text-emerald-400">{money(quote.depositPaidCents ?? 0)}</p>
              </Link>)}
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
  );
}
