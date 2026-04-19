/**
 * Team Page — /ops/team
 * Owner-only. Lists all employee registration requests with Approve / Deny actions.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/DashboardLayout";
import {
  CheckCircle2, XCircle, Clock, Users, HardHat, Briefcase, LayoutDashboard,
  ChevronDown, ChevronUp, Phone, Mail,
} from "lucide-react";

const roleLabels: Record<string, { label: string; icon: React.ElementType }> = {
  field_crew: { label: "Field Crew", icon: HardHat },
  office:     { label: "Office / Admin", icon: Briefcase },
  supervisor: { label: "Supervisor", icon: LayoutDashboard },
};

const statusConfig = {
  pending:  { label: "Pending",  color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  approved: { label: "Approved", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  denied:   { label: "Denied",   color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

type FilterStatus = "all" | "pending" | "approved" | "denied";

export default function Team() {
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [ownerNote, setOwnerNote] = useState<Record<number, string>>({});

  const utils = trpc.useUtils();

  const { data: registrations = [], isLoading } = trpc.team.listRegistrations.useQuery(
    { status: filter },
    { retry: false }
  );

  const approve = trpc.team.approveRegistration.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Registration approved.");
      setExpandedId(null);
      utils.team.listRegistrations.invalidate();
      utils.team.pendingCount.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deny = trpc.team.denyRegistration.useMutation({
    onSuccess: () => {
      toast.success("Registration denied.");
      setExpandedId(null);
      utils.team.listRegistrations.invalidate();
      utils.team.pendingCount.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filters: { id: FilterStatus; label: string }[] = [
    { id: "pending",  label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "denied",   label: "Denied" },
    { id: "all",      label: "All" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Team Access Requests
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and approve employee registration requests
            </p>
          </div>
          <a
            href="/ops/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Share registration link →
          </a>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border",
                filter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="ops-card p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : registrations.length === 0 ? (
            <div className="ops-card p-10 flex flex-col items-center gap-3 text-center">
              <Users className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {filter === "pending" ? "No pending requests." : `No ${filter} requests.`}
              </p>
              <p className="text-xs text-muted-foreground/60">
                Share the registration link with your team: <strong>/ops/register</strong>
              </p>
            </div>
          ) : (
            registrations.map((reg) => {
              const RoleIcon = roleLabels[reg.requestedRole]?.icon ?? HardHat;
              const roleLabel = roleLabels[reg.requestedRole]?.label ?? reg.requestedRole;
              const statusCfg = statusConfig[reg.status as keyof typeof statusConfig] ?? statusConfig.pending;
              const isExpanded = expandedId === reg.id;
              const isPending = reg.status === "pending";

              return (
                <div key={reg.id} className="ops-card overflow-hidden">
                  {/* Row */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : reg.id)}
                    className="w-full text-left flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
                  >
                    {/* Icon */}
                    <div className="p-2 rounded-md bg-secondary shrink-0">
                      <RoleIcon className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{reg.name}</span>
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                          statusCfg.color
                        )}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{reg.email}</span>
                        <span className="text-xs text-muted-foreground/60">
                          Requested: <strong className="text-muted-foreground">{roleLabel}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Date + expand */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-muted-foreground/60 hidden sm:block">
                        {new Date(reg.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                      {/* Contact details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <a href={`mailto:${reg.email}`} className="hover:text-primary transition-colors truncate">
                            {reg.email}
                          </a>
                        </div>
                        {reg.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <a href={`tel:${reg.phone}`} className="hover:text-primary transition-colors">
                              {reg.phone}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Employee message */}
                      {reg.message && (
                        <div className="bg-secondary rounded-md p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1">
                            Note from employee
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{reg.message}</p>
                        </div>
                      )}

                      {/* Owner note on already-decided requests */}
                      {!isPending && reg.ownerNote && (
                        <div className="bg-secondary rounded-md p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1">
                            Your note
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{reg.ownerNote}</p>
                        </div>
                      )}

                      {/* Approve / Deny actions for pending requests */}
                      {isPending && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Note (optional — visible to you only)
                            </label>
                            <textarea
                              value={ownerNote[reg.id] ?? ""}
                              onChange={(e) =>
                                setOwnerNote((n) => ({ ...n, [reg.id]: e.target.value }))
                              }
                              placeholder="e.g. Hired as mulcher operator starting May 1"
                              rows={2}
                              className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              disabled={approve.isPending}
                              onClick={() =>
                                approve.mutate({
                                  id: reg.id,
                                  ownerNote: ownerNote[reg.id] || undefined,
                                })
                              }
                              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={deny.isPending}
                              onClick={() =>
                                deny.mutate({
                                  id: reg.id,
                                  ownerNote: ownerNote[reg.id] || undefined,
                                })
                              }
                              className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-red-400/30 text-red-400 text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Deny
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
                            Approving marks this request as approved. The employee will need to sign in using the email address they provided. You can manage user roles directly in the database if further changes are needed.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
