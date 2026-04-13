/**
 * Ops Clients page — live Jobber client data
 * Calls trpc.jobber.clients to fetch clients from Jobber CRM.
 * Shows a "Connect Jobber" banner when not connected.
 * Supports per-row delete and bulk delete via checkboxes.
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Building2,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getClientName(client: {
  name?: string | null;
  companyName?: string | null;
}): string {
  return client.name || client.companyName || "Unknown";
}

function getEmail(emails?: Array<{ address: string }>): string {
  return emails?.[0]?.address ?? "—";
}

function getPhone(phones?: Array<{ number: string }>): string {
  return phones?.[0]?.number ?? "—";
}

function getCity(billingAddress?: { city?: string | null } | null): string {
  return billingAddress?.city ?? "—";
}

// ─── Not-connected banner ─────────────────────────────────────────────────────

function NotConnectedBanner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-yellow-500" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Jobber Not Connected</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Connect your Jobber account to view live client data from your CRM.
      </p>
      <Link href="/ops/settings">
        <Button variant="default" size="sm" className="mt-2">
          Connect Jobber in Settings
        </Button>
      </Link>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({
  title,
  description,
  warning,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string;
  description: React.ReactNode;
  warning: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 space-y-1">
          <p className="text-[11px] font-semibold text-red-400">The following will also be deleted in Jobber:</p>
          <ul className="text-[11px] text-red-300/80 space-y-0.5 list-disc list-inside">
            {warning}
          </ul>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            Delete from Jobber
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Client row type ──────────────────────────────────────────────────────────

type ClientNode = {
  id: string;
  name?: string | null;
  companyName?: string | null;
  isLead?: boolean | null;
  balance?: number | null;
  createdAt?: string | null;
  emails?: Array<{ address: string }>;
  phones?: Array<{ number: string; description?: string }>;
  billingAddress?: {
    street1?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
  } | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsClients() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ClientNode | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);

  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.clients.useQuery({ first: 100 }, { retry: false });

  const deleteClient = trpc.jobber.deleteClient.useMutation({
    onSuccess: () => {
      toast.success("Client deleted from Jobber.");
      utils.jobber.clients.invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete client.");
      setDeleteTarget(null);
    },
  });

  // Jobber throws a TRPCError when not connected
  const notConnected =
    !isLoading &&
    (error?.message?.includes("not connected") ||
      error?.message?.includes("not authorized") ||
      error?.message?.includes("token") ||
      !data);

  const nodes: ClientNode[] = useMemo(
    () => (data as any)?.nodes ?? [],
    [data]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return nodes;
    return nodes.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.companyName ?? "").toLowerCase().includes(q) ||
        getEmail(c.emails).toLowerCase().includes(q) ||
        getPhone(c.phones).toLowerCase().includes(q) ||
        getCity(c.billingAddress).toLowerCase().includes(q)
    );
  }, [nodes, search]);

  const totalCount = (data as any)?.totalCount ?? nodes.length;

  // ── Checkbox helpers ──────────────────────────────────────────────────────
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Bulk delete ───────────────────────────────────────────────────────────
  async function handleBulkDelete() {
    setBulkPending(true);
    const ids = Array.from(selected);
    let successCount = 0;
    let failCount = 0;
    for (const id of ids) {
      try {
        await deleteClient.mutateAsync({ id });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBulkPending(false);
    setShowBulkConfirm(false);
    setSelected(new Set());
    utils.jobber.clients.invalidate();
    if (successCount > 0) toast.success(`${successCount} client${successCount > 1 ? "s" : ""} deleted from Jobber.`);
    if (failCount > 0) toast.error(`${failCount} deletion${failCount > 1 ? "s" : ""} failed.`);
  }

  return (
    <DashboardLayout title="Clients" subtitle="Live from Jobber CRM">
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">All Clients</h2>
            {!isLoading && !notConnected && (
              <Badge variant="secondary" className="text-xs">
                {totalCount} total
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          </div>
        </div>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="text-xs font-medium text-red-400">
              {selected.size} client{selected.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowBulkConfirm(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete {selected.size} Selected
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Not connected */}
        {!isLoading && notConnected && <NotConnectedBanner />}

        {/* Table */}
        {!isLoading && !notConnected && (
          <>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Users className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search ? "No clients match your search." : "No clients found in Jobber."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20">
                        {/* Select-all checkbox */}
                        <th className="px-3 py-2.5 w-8">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleAll}
                            className="w-3.5 h-3.5 accent-primary cursor-pointer"
                            aria-label="Select all"
                          />
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Company</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">City</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden xl:table-cell">Added</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((client, idx) => (
                        <tr
                          key={client.id}
                          className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors ${
                            selected.has(client.id) ? "bg-red-500/5" : idx % 2 === 0 ? "" : "bg-secondary/5"
                          }`}
                        >
                          {/* Row checkbox */}
                          <td className="px-3 py-3 w-8">
                            <input
                              type="checkbox"
                              checked={selected.has(client.id)}
                              onChange={() => toggleOne(client.id)}
                              className="w-3.5 h-3.5 accent-primary cursor-pointer"
                              aria-label={`Select ${getClientName(client)}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary">
                                  {getClientName(client).slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-foreground">
                                {getClientName(client)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                            {client.companyName ? (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 shrink-0" />
                                {client.companyName}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {getEmail(client.emails) !== "—" ? (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 shrink-0" />
                                <a
                                  href={`mailto:${getEmail(client.emails)}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {getEmail(client.emails)}
                                </a>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                            {getPhone(client.phones) !== "—" ? (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 shrink-0" />
                                <a
                                  href={`tel:${getPhone(client.phones)}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {getPhone(client.phones)}
                                </a>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                            {getCity(client.billingAddress) !== "—" ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {getCity(client.billingAddress)}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                            {formatDate(client.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={client.isLead ? "outline" : "secondary"}
                              className="text-[10px]"
                            >
                              {client.isLead ? "Lead" : "Client"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={`https://secure.getjobber.com/home"")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in Jobber"
                                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Jobber
                              </a>
                              <button
                                onClick={() => setDeleteTarget(client)}
                                title="Delete client"
                                className="text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Jobber link */}
            <div className="flex justify-end">
              <a
                href="https://secure.getjobber.com/home"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open in Jobber
              </a>
            </div>
          </>
        )}
      </div>

      {/* Single delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          title="Delete Client"
          description={
            <>
              Permanently delete{" "}
              <span className="font-medium text-foreground">{getClientName(deleteTarget)}</span>{" "}
              from Jobber. This cannot be undone.
            </>
          }
          warning={
            <>
              <li>All quotes, jobs, and invoices linked to this client</li>
              <li>All contact details and billing address</li>
              <li>All communication history</li>
            </>
          }
          onConfirm={() => deleteClient.mutate({ id: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteClient.isPending}
        />
      )}

      {/* Bulk delete confirmation modal */}
      {showBulkConfirm && (
        <DeleteModal
          title={`Delete ${selected.size} Client${selected.size > 1 ? "s" : ""}`}
          description={
            <>
              Permanently delete{" "}
              <span className="font-medium text-foreground">{selected.size} selected client{selected.size > 1 ? "s" : ""}</span>{" "}
              from Jobber. This cannot be undone.
            </>
          }
          warning={
            <>
              <li>All quotes, jobs, and invoices linked to each client</li>
              <li>All contact details and billing addresses</li>
              <li>All communication history for each client</li>
            </>
          }
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkConfirm(false)}
          isPending={bulkPending}
        />
      )}
    </DashboardLayout>
  );
}
