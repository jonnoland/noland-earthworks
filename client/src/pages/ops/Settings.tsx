/**
 * Settings Page — Noland Earthworks Operations Dashboard
 * Account, business, integrations (Jobber), notifications + Quote Submission Log
 */

import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import {
  Save, User, Building2, Bell, Shield, CreditCard, Users, Link2,
  ClipboardList, CheckCircle2, XCircle, Clock, ExternalLink,
  RefreshCw, Loader2, Phone, Mail, MapPin, Wrench, ChevronDown, ChevronUp,
  AlertCircle, Unlink, Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const tabs = [
  { id: "quotes",        label: "Quote Log",     icon: ClipboardList },
  { id: "profile",       label: "Profile",       icon: User },
  { id: "business",      label: "Business",      icon: Building2 },
  { id: "integrations",  label: "Integrations",  icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team",          label: "Team",          icon: Users },
  { id: "billing",       label: "Billing",       icon: CreditCard },
  { id: "security",      label: "Security",      icon: Shield },
];

// ─── Jobber status badge ──────────────────────────────────────────────────────
function JobberBadge({ status }: { status: "synced" | "failed" | "skipped" }) {
  if (status === "synced") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
        <CheckCircle2 className="w-3 h-3" />
        Synced to Jobber
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
        <XCircle className="w-3 h-3" />
        Jobber Sync Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
      <Clock className="w-3 h-3" />
      Not Synced
    </span>
  );
}

// ─── Single quote row ─────────────────────────────────────────────────────────
function QuoteRow({ q }: { q: {
  id: number;
  name: string;
  phone: string;
  email: string;
  service: string;
  county: string;
  acreage: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  message: string | null;
  jobberStatus: "synced" | "failed" | "skipped";
  jobberRequestId: string | null;
  jobberRequestUrl: string | null;
  jobberError: string | null;
  createdAt: Date;
}}) {
  const [expanded, setExpanded] = useState(false);

  const addressParts = [q.street, [q.city, q.state, q.zip].filter(Boolean).join(" ")].filter(Boolean);
  const submittedAt = new Date(q.createdAt).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className={cn(
          "mt-0.5 w-2 h-2 rounded-full shrink-0",
          q.jobberStatus === "synced" ? "bg-green-400" :
          q.jobberStatus === "failed" ? "bg-red-400" : "bg-muted-foreground/40"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{q.name}</span>
            <JobberBadge status={q.jobberStatus} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{q.service}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{q.county} County{q.acreage ? ` · ${q.acreage}` : ""}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{submittedAt}</span>
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-secondary/20 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Contact</p>
              <p className="text-xs text-foreground flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <a href={`tel:${q.phone}`} className="hover:text-primary transition-colors">{q.phone}</a>
              </p>
              <p className="text-xs text-foreground flex items-center gap-1.5 mt-1">
                <Mail className="w-3 h-3 text-muted-foreground" />
                <a href={`mailto:${q.email}`} className="hover:text-primary transition-colors">{q.email}</a>
              </p>
            </div>
            {addressParts.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Property Address</p>
                {addressParts.map((line, i) => (
                  <p key={i} className="text-xs text-foreground">{line}</p>
                ))}
              </div>
            )}
          </div>

          {q.message && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Project Notes</p>
              <p className="text-xs text-foreground bg-secondary/50 rounded-md p-2.5 whitespace-pre-wrap">{q.message}</p>
            </div>
          )}

          {q.jobberStatus === "synced" && q.jobberRequestUrl && (
            <a href={q.jobberRequestUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              View in Jobber
            </a>
          )}

          {q.jobberStatus === "failed" && q.jobberError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">Sync Error</p>
              <p className="text-xs text-red-300 font-mono">{q.jobberError}</p>
              <a href="https://nolandearthworks.com/api/jobber/authorize" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-1.5 transition-colors">
                <ExternalLink className="w-3 h-3" />
                Re-authorize Jobber
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quote Log Tab ────────────────────────────────────────────────────────────
function QuoteLogTab() {
  const { data: quotes = [], isLoading, refetch, isFetching } = trpc.ops.quotes.list.useQuery({ limit: 100 });

  const syncedCount = quotes.filter(q => q.jobberStatus === "synced").length;
  const failedCount = quotes.filter(q => q.jobberStatus === "failed").length;
  const skippedCount = quotes.filter(q => q.jobberStatus === "skipped").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Quote Submission Log
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Every quote form submission — most recent first</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {quotes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",           value: quotes.length,  color: "text-foreground" },
            { label: "Synced to Jobber", value: syncedCount,   color: "text-green-400" },
            { label: "Sync Failed",      value: failedCount,   color: failedCount > 0 ? "text-red-400" : "text-muted-foreground" },
          ].map(stat => (
            <div key={stat.label} className="ops-card p-3 text-center">
              <div className={cn("text-xl font-bold", stat.color)}>{stat.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {skippedCount > 0 && syncedCount === 0 && (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-300">Jobber Not Connected</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              {skippedCount} submission{skippedCount !== 1 ? "s" : ""} were not synced because Jobber was not authorized.{" "}
              <a href="https://nolandearthworks.com/api/jobber/authorize" target="_blank" rel="noopener noreferrer"
                className="underline hover:text-amber-300 transition-colors">
                Authorize Jobber now →
              </a>
            </p>
          </div>
        </div>
      )}

      {failedCount > 0 && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-300">
              {failedCount} Submission{failedCount !== 1 ? "s" : ""} Failed to Sync
            </p>
            <p className="text-xs text-red-400/80 mt-0.5">
              These leads need to be added to Jobber manually. Expand each row to see the error details.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && quotes.length === 0 && (
        <div className="ops-card p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            No submissions yet
          </h4>
          <p className="text-xs text-muted-foreground">Quote form submissions will appear here as they come in.</p>
        </div>
      )}

      {!isLoading && quotes.length > 0 && (
        <div className="space-y-2">
          {quotes.map(q => <QuoteRow key={q.id} q={q} />)}
        </div>
      )}
    </div>
  );
}

// ─── Jobber Integration Panel ─────────────────────────────────────────────────
function JobberPanel() {
  const utils = trpc.useUtils();
  const { data: jobberStatus, isLoading: statusLoading, refetch } = trpc.jobber.connectionStatus.useQuery();
  const disconnectMutation = trpc.jobber.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Jobber account disconnected.");
      utils.jobber.connectionStatus.invalidate();
    },
    onError: () => toast.error("Failed to disconnect Jobber. Please try again."),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobberParam = params.get("jobber");
    const reason = params.get("reason");
    if (jobberParam === "connected") {
      toast.success("Jobber connected successfully.");
      refetch();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (jobberParam === "error") {
      const messages: Record<string, string> = {
        denied: "You cancelled the Jobber authorization.",
        no_code: "No authorization code received from Jobber.",
        state_mismatch: "Security validation failed. Please try again.",
        token_exchange: "Failed to exchange authorization code. Please try again.",
      };
      toast.error(messages[reason ?? ""] ?? "Jobber connection failed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleConnect = () => { window.location.href = "/api/jobber/authorize"; };
  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect your Jobber account? This will remove all stored credentials.")) {
      disconnectMutation.mutate();
    }
  };

  const webhookUrl = `${window.location.origin}/api/jobber/webhook`;

  return (
    <div className="space-y-5">
      {/* Connection card */}
      <div className="ops-card p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Jobber Integration
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect your Jobber account to sync jobs, quotes, and client data.
            </p>
          </div>
          <div className="shrink-0 w-10 h-10 rounded-lg bg-[#1a1f2b] border border-border flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">JBR</span>
          </div>
        </div>

        {statusLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking connection status...
          </div>
        ) : jobberStatus?.connected ? (
          <>
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-green-500/8 border border-green-500/20 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-green-400">Connected</p>
                {jobberStatus.accountName && (
                  <p className="text-[11px] text-muted-foreground truncate">Account: {jobberStatus.accountName}</p>
                )}
                {jobberStatus.connectedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Connected {new Date(jobberStatus.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              <button className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                onClick={() => refetch()} title="Refresh status">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleConnect}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground hover:bg-secondary transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
                Reconnect
              </button>
              <button onClick={handleDisconnect} disabled={disconnectMutation.isPending}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-red-400 hover:bg-destructive/20 transition-colors disabled:opacity-50">
                {disconnectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                Disconnect
              </button>
              <a href="https://app.getjobber.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground hover:bg-secondary transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                Open Jobber
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-secondary/50 border border-border mb-4">
              <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Not connected</p>
                <p className="text-[11px] text-muted-foreground">Connect Jobber to automatically sync jobs, quotes, and client records.</p>
              </div>
            </div>
            <button onClick={handleConnect}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors">
              <Link2 className="w-3.5 h-3.5" />
              Connect Jobber Account
            </button>
          </>
        )}
      </div>

      {/* Webhook card */}
      <div className="ops-card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Webhook Configuration
          </h3>
          <p className="text-xs text-muted-foreground">
            Add this URL in your Jobber developer settings to receive real-time events.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Webhook Endpoint URL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-secondary/50 border border-border rounded-md px-3 py-2">
                <Webhook className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <code className="text-xs text-foreground font-mono truncate">{webhookUrl}</code>
              </div>
              <button
                className="shrink-0 text-xs font-medium px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground hover:bg-secondary transition-colors"
                onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Webhook URL copied to clipboard"); }}>
                Copy
              </button>
            </div>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-primary">Setup:</span> In Jobber, go to Settings &rarr; Developer Tools &rarr; Webhooks.
              Add the URL above and select: <span className="text-foreground">QUOTE_APPROVED</span>,{" "}
              <span className="text-foreground">REQUEST_CREATED</span>, <span className="text-foreground">JOB_CREATED</span>.
            </p>
          </div>
        </div>
      </div>

      {/* What syncs */}
      <div className="ops-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          What Syncs with Jobber
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "New quote requests",  desc: "Auto-created as leads in your pipeline",       status: "ready" },
            { label: "Approved quotes",     desc: "Converted to active jobs automatically",        status: "ready" },
            { label: "Client records",      desc: "Synced from Jobber client database",            status: "ready" },
            { label: "Invoice status",      desc: "Paid/overdue status reflected in reports",      status: "ready" },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/30 border border-border">
              {item.status === "ready" ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                {item.status === "coming" && (
                  <span className="text-[10px] font-medium text-primary/70 mt-0.5 block">Coming soon</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("quotes");
  const [name, setName] = useState(user?.name ?? "Jon Noland");
  const [email, setEmail] = useState(user?.email ?? "jonnoland@nolandearthworks.com");
  const [phone, setPhone] = useState("(615) 406-4819");
  const [company, setCompany] = useState("Noland Earthworks, LLC");
  const [location, setLocation] = useState("Vanleer, TN");
  const [crewDayTarget, setCrewDayTarget] = useState("3500");
  const [monthlyTarget, setMonthlyTarget] = useState("75000");

  // Auto-switch to integrations tab if redirected from Jobber OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("jobber")) {
      setActiveTab("integrations");
    }
  }, []);

  const handleSave = () => { toast.success("Settings saved successfully"); };

  const userInitials = (user?.name ?? "Jon Noland")
    .split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and business preferences">
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Sidebar tabs */}
          <div className="lg:w-48 shrink-0">
            <nav className="space-y-0.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium transition-all text-left",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "quotes" && <QuoteLogTab />}

            {activeTab === "integrations" && <JobberPanel />}

            {activeTab === "profile" && (
              <div className="ops-card p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Profile Information
                  </h3>
                  <p className="text-xs text-muted-foreground">Update your personal details</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">{userInitials}</span>
                  </div>
                  <div>
                    <button className="text-xs text-primary hover:text-primary/80 transition-colors"
                      onClick={() => toast.info("Photo upload — coming soon")}>
                      Change photo
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG up to 2MB</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name",     value: name,     onChange: setName },
                    { label: "Email Address", value: email,    onChange: setEmail },
                    { label: "Phone Number",  value: phone,    onChange: setPhone },
                    { label: "Location",      value: location, onChange: setLocation },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
                      <input type="text" value={field.value} onChange={e => field.onChange(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <button onClick={handleSave}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors">
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === "business" && (
              <div className="ops-card p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Business Settings
                  </h3>
                  <p className="text-xs text-muted-foreground">Configure your business targets and preferences</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Company Name",                value: company,       onChange: setCompany },
                    { label: "Business Location",           value: location,      onChange: setLocation },
                    { label: "Monthly Revenue Target ($)",  value: monthlyTarget, onChange: setMonthlyTarget },
                    { label: "Target Crew-Day Rate ($)",    value: crewDayTarget, onChange: setCrewDayTarget },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
                      <input type="text" value={field.value} onChange={e => field.onChange(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Services Offered</label>
                  <div className="flex flex-wrap gap-2">
                    {["Land Clearing", "Forestry Mulching", "Vegetation Management", "Property Maintenance", "Right-of-Way Clearing"].map(service => (
                      <span key={service} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary cursor-pointer hover:bg-primary/20 transition-colors">
                        {service}
                      </span>
                    ))}
                    <button className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
                      onClick={() => toast.info("Add service — coming soon")}>
                      + Add
                    </button>
                  </div>
                </div>
                <button onClick={handleSave}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors">
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            )}

            {(activeTab === "notifications" || activeTab === "team" || activeTab === "billing" || activeTab === "security") && (
              <div className="ops-card p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  {(() => {
                    const tab = tabs.find(t => t.id === activeTab);
                    return tab ? <tab.icon className="w-5 h-5 text-primary" /> : null;
                  })()}
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {tabs.find(t => t.id === activeTab)?.label} Settings
                </h3>
                <p className="text-xs text-muted-foreground">This section is coming soon in the next update.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
