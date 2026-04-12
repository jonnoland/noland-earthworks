/**
 * Ops Clients page — live Jobber client data
 * Calls trpc.jobber.clients to fetch clients from Jobber CRM.
 * Shows a "Connect Jobber" banner when not connected.
 */
import { useState } from "react";
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
} from "lucide-react";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsClients() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.clients.useQuery({ first: 100 }, { retry: false });

  // Jobber throws a TRPCError when not connected
  const notConnected =
    !isLoading &&
    (error?.message?.includes("not connected") ||
      error?.message?.includes("not authorized") ||
      error?.message?.includes("token") ||
      !data);

  const nodes: Array<{
    id: string;
    name?: string | null;
    companyName?: string | null;
    isLead?: boolean | null;
    balance?: number | null;
    createdAt?: string | null;
    emails?: Array<{ address: string }>;
    phones?: Array<{ number: string; description?: string }>;
    billingAddress?: { street1?: string | null; city?: string | null; province?: string | null; postalCode?: string | null } | null;
  }> = (data as any)?.nodes ?? [];

  const filtered = nodes.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.companyName ?? "").toLowerCase().includes(q) ||
      getEmail(c.emails).toLowerCase().includes(q) ||
      getPhone(c.phones).toLowerCase().includes(q) ||
      getCity(c.billingAddress).toLowerCase().includes(q)
    );
  });

  const totalCount = (data as any)?.totalCount ?? nodes.length;

  return (
    <DashboardLayout title="Clients" subtitle="Live from Jobber CRM">
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              All Clients
            </h2>
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
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Company</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">City</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden xl:table-cell">Added</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((client, idx) => (
                        <tr
                          key={client.id}
                          className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors ${
                            idx % 2 === 0 ? "" : "bg-secondary/5"
                          }`}
                        >
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
                href="https://app.getjobber.com/clients"
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
    </DashboardLayout>
  );
}
