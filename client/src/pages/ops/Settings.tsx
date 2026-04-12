/**
 * Settings Page — Noland Earthworks
 * Account, business, notification settings + Quote Submission Log
 */

import DashboardLayout from "@/components/OpsDashboardLayout";
import { useState } from "react";
import {
  Save, User, Building2, Bell, Shield, CreditCard, Users,
  ClipboardList, CheckCircle2, XCircle, Clock, ExternalLink,
  RefreshCw, Loader2, Phone, Mail, MapPin, Wrench, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const tabs = [
  { id: "quotes", label: "Quote Log", icon: ClipboardList },
  { id: "profile", label: "Profile", icon: User },
  { id: "business", label: "Business", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
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
      {/* Main row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
      >
        {/* Status dot */}
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
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              {q.service}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {q.county} County{q.acreage ? ` · ${q.acreage}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {submittedAt}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded details */}
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

          {/* Jobber link or error */}
          {q.jobberStatus === "synced" && q.jobberRequestUrl && (
            <a
              href={q.jobberRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View in Jobber
            </a>
          )}

          {q.jobberStatus === "failed" && q.jobberError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">Sync Error</p>
              <p className="text-xs text-red-300 font-mono">{q.jobberError}</p>
              <a
                href="https://nolandearthworks.com/api/jobber/authorize"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-1.5 transition-colors"
              >
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
      {/* Header + refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Quote Submission Log
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every quote form submission — most recent first
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: quotes.length, color: "text-foreground" },
            { label: "Synced to Jobber", value: syncedCount, color: "text-green-400" },
            { label: "Sync Failed", value: failedCount, color: failedCount > 0 ? "text-red-400" : "text-muted-foreground" },
          ].map(stat => (
            <div key={stat.label} className="ops-card p-3 text-center">
              <div className={cn("text-xl font-bold", stat.color)}>{stat.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Jobber not connected warning */}
      {skippedCount > 0 && syncedCount === 0 && (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-300">Jobber Not Connected</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              {skippedCount} submission{skippedCount !== 1 ? "s" : ""} were not synced because Jobber was not authorized.{" "}
              <a
                href="https://nolandearthworks.com/api/jobber/authorize"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-300 transition-colors"
              >
                Authorize Jobber now →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Failed warning */}
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

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && quotes.length === 0 && (
        <div className="ops-card p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            No submissions yet
          </h4>
          <p className="text-xs text-muted-foreground">
            Quote form submissions will appear here as they come in.
          </p>
        </div>
      )}

      {/* Quote rows */}
      {!isLoading && quotes.length > 0 && (
        <div className="space-y-2">
          {quotes.map(q => (
            <QuoteRow key={q.id} q={q} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState("quotes");
  const [name, setName] = useState("Jon Noland");
  const [email, setEmail] = useState("jonnoland@nolandearthworks.com");
  const [phone, setPhone] = useState("(615) 406-4819");
  const [company, setCompany] = useState("Noland Earthworks, LLC");
  const [location, setLocation] = useState("Vanleer, TN");
  const [crewDayTarget, setCrewDayTarget] = useState("3500");
  const [monthlyTarget, setMonthlyTarget] = useState("75000");

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

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

            {activeTab === "profile" && (
              <div className="ops-card p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Profile Information
                  </h3>
                  <p className="text-xs text-muted-foreground">Update your personal details</p>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">JN</span>
                  </div>
                  <div>
                    <button
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                      onClick={() => toast.info("Photo upload — coming soon")}
                    >
                      Change photo
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", value: name, onChange: setName },
                    { label: "Email Address", value: email, onChange: setEmail },
                    { label: "Phone Number", value: phone, onChange: setPhone },
                    { label: "Location", value: location, onChange: setLocation },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                  >
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
                    { label: "Company Name", value: company, onChange: setCompany },
                    { label: "Business Location", value: location, onChange: setLocation },
                    { label: "Monthly Revenue Target ($)", value: monthlyTarget, onChange: setMonthlyTarget },
                    { label: "Target Crew-Day Rate ($)", value: crewDayTarget, onChange: setCrewDayTarget },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Services</label>
                  <div className="flex flex-wrap gap-2">
                    {["Land Clearing", "Forestry Mulching", "Vegetation Management", "Property Maintenance", "Right-of-Way Clearing"].map(service => (
                      <span key={service} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                >
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
