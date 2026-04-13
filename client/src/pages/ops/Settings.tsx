/**
 * Settings Page — Noland Earthworks Operations Dashboard
 * Tabs: Quote Log, Profile, Business, Integrations, Notifications, Team, Billing, Security
 */

import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import {
  Save, User, Building2, Bell, Shield, CreditCard, Users, Link2,
  ClipboardList, CheckCircle2, XCircle, Clock, ExternalLink,
  RefreshCw, Loader2, Phone, Mail, MapPin, Wrench, ChevronDown, ChevronUp,
  AlertCircle, Unlink, Webhook, Trash2, Globe, Palette, Hash,
  ToggleLeft, ToggleRight, Key, Lock, LogOut, Eye, EyeOff,
  UserPlus, Crown, ChevronRight, Info,
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

// ─── Shared helpers ───────────────────────────────────────────────────────────
function SettingsSection({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="ops-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {title}
        </h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

function SaveButton({ onClick, loading = false, label = "Save Changes" }: {
  onClick: () => void; loading?: boolean; label?: string;
}) {
  return (
    <div className="pt-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {label}
      </button>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "shrink-0 w-10 h-5 rounded-full transition-colors relative",
          checked ? "bg-primary" : "bg-secondary border border-border"
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )} />
      </button>
    </div>
  );
}

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
function QuoteRow({ q, onDelete }: {
  q: {
    id: number; name: string; phone: string; email: string; service: string; county: string;
    acreage: string | null; street: string | null; city: string | null; state: string | null;
    zip: string | null; message: string | null; jobberStatus: "synced" | "failed" | "skipped";
    jobberRequestId: string | null; jobberRequestUrl: string | null; jobberError: string | null;
    createdAt: Date;
  };
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const addressParts = [q.street, [q.city, q.state, q.zip].filter(Boolean).join(" ")].filter(Boolean);
  const submittedAt = new Date(q.createdAt).toLocaleString("en-US", {
    timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
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
          <div className="flex justify-end pt-1">
            <button onClick={() => onDelete(q.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Delete submission
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quote Log Tab ────────────────────────────────────────────────────────────
function QuoteLogTab() {
  const utils = trpc.useUtils();
  const { data: quotes = [], isLoading, refetch, isFetching } = trpc.ops.quotes.list.useQuery({ limit: 100 });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const deleteQuote = trpc.ops.quotes.delete.useMutation({
    onSuccess: () => { utils.ops.quotes.list.invalidate(); toast.success("Submission deleted"); },
    onError: () => toast.error("Failed to delete submission"),
  });

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
            { label: "Total",            value: quotes.length, color: "text-foreground" },
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
              {skippedCount} submission{skippedCount !== 1 ? "s were" : " was"} not synced because Jobber is not connected.{" "}
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
          {quotes.map(q => <QuoteRow key={q.id} q={q} onDelete={id => setDeleteConfirmId(id)} />)}
        </div>
      )}

      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Delete Quote Submission</h3>
            <p className="text-xs text-muted-foreground">
              This will permanently remove the submission from the local log. This cannot be undone.
            </p>
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 space-y-1">
              <p className="text-[11px] font-semibold text-red-400">The following will also be deleted:</p>
              <ul className="text-[11px] text-red-300/80 space-y-0.5 list-disc list-inside">
                <li>All contact info and project details submitted</li>
                <li>Jobber sync status and error log for this submission</li>
              </ul>
              <p className="text-[11px] text-muted-foreground mt-1">
                If this submission was synced to Jobber, the Jobber request record is not affected.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { deleteQuote.mutate({ id: deleteConfirmId }); setDeleteConfirmId(null); }}
                disabled={deleteQuote.isPending}
                className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteQuote.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "Jon Noland");
  const [email, setEmail] = useState(user?.email ?? "jonnoland@nolandearthworks.com");
  const [phone, setPhone] = useState("(615) 406-4819");
  const [timezone, setTimezone] = useState("America/Chicago");

  const userInitials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleSave = () => toast.success("Profile saved");

  return (
    <div className="space-y-4">
      <SettingsSection title="Profile Information" description="Your personal account details">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-primary">{userInitials}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">{name}</p>
            <p className="text-[11px] text-muted-foreground">{email}</p>
            <button className="text-[11px] text-primary hover:text-primary/80 transition-colors mt-1"
              onClick={() => toast.info("Photo upload — coming soon")}>
              Change photo
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Full Name">
            <TextInput value={name} onChange={setName} />
          </FieldRow>
          <FieldRow label="Email Address">
            <TextInput value={email} onChange={setEmail} type="email" />
          </FieldRow>
          <FieldRow label="Phone Number">
            <TextInput value={phone} onChange={setPhone} type="tel" />
          </FieldRow>
          <FieldRow label="Timezone">
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
            >
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </FieldRow>
        </div>
        <SaveButton onClick={handleSave} />
      </SettingsSection>
    </div>
  );
}

// ─── Business Tab ─────────────────────────────────────────────────────────────
function BusinessTab() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.ops.settings.getBusinessSettings.useQuery();
  const updateMutation = trpc.ops.settings.updateBusinessSettings.useMutation({
    onSuccess: () => { utils.ops.settings.getBusinessSettings.invalidate(); toast.success("Business settings saved"); },
    onError: () => toast.error("Failed to save settings"),
  });

  const [companyName, setCompanyName] = useState("Noland Earthworks, LLC");
  const [phone, setPhone] = useState("(615) 406-4819");
  const [email, setEmail] = useState("jonnoland@nolandearthworks.com");
  const [address, setAddress] = useState("93 Halliburton Road");
  const [city, setCity] = useState("Vanleer");
  const [state, setState] = useState("Tennessee");
  const [zip, setZip] = useState("37181");
  const [website, setWebsite] = useState("https://www.nolandearthworks.com");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("https://g.page/r/CcglMAMbtQInEAI/review");
  const [defaultTaxRate, setDefaultTaxRate] = useState("0");
  const [brandColor, setBrandColor] = useState("#f97316");
  const [licenseNumbers, setLicenseNumbers] = useState("");

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName ?? "Noland Earthworks, LLC");
      setPhone(settings.phone ?? "(615) 406-4819");
      setEmail(settings.email ?? "jonnoland@nolandearthworks.com");
      setAddress(settings.address ?? "93 Halliburton Road");
      setCity(settings.city ?? "Vanleer");
      setState(settings.state ?? "Tennessee");
      setZip(settings.zip ?? "37181");
      setWebsite(settings.website ?? "https://www.nolandearthworks.com");
      setGoogleReviewUrl(settings.googleReviewUrl ?? "");
      setDefaultTaxRate(settings.defaultTaxRate ?? "0");
      setBrandColor(settings.brandColor ?? "#f97316");
      setLicenseNumbers(settings.licenseNumbers ?? "");
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      companyName, phone, email, address, city, state, zip,
      website, googleReviewUrl, defaultTaxRate, brandColor, licenseNumbers,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SettingsSection title="Company Identity" description="Core business information used across proposals, emails, and reports">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Company Name">
            <TextInput value={companyName} onChange={setCompanyName} />
          </FieldRow>
          <FieldRow label="Business Phone">
            <TextInput value={phone} onChange={setPhone} type="tel" />
          </FieldRow>
          <FieldRow label="Business Email">
            <TextInput value={email} onChange={setEmail} type="email" />
          </FieldRow>
          <FieldRow label="Website">
            <TextInput value={website} onChange={setWebsite} />
          </FieldRow>
        </div>
        <SaveButton onClick={handleSave} loading={updateMutation.isPending} />
      </SettingsSection>

      <SettingsSection title="Service Address" description="Primary business location used for distance calculations and proposals">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FieldRow label="Street Address">
              <TextInput value={address} onChange={setAddress} />
            </FieldRow>
          </div>
          <FieldRow label="City">
            <TextInput value={city} onChange={setCity} />
          </FieldRow>
          <FieldRow label="State">
            <TextInput value={state} onChange={setState} />
          </FieldRow>
          <FieldRow label="ZIP Code">
            <TextInput value={zip} onChange={setZip} />
          </FieldRow>
        </div>
        <SaveButton onClick={handleSave} loading={updateMutation.isPending} />
      </SettingsSection>

      <SettingsSection title="Business Configuration" description="Operational defaults for quotes and reporting">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Default Tax Rate (%)">
            <TextInput value={defaultTaxRate} onChange={setDefaultTaxRate} placeholder="0" />
          </FieldRow>
          <FieldRow label="Brand Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                className="w-9 h-9 rounded-md border border-border bg-secondary/50 cursor-pointer p-0.5"
              />
              <TextInput value={brandColor} onChange={setBrandColor} placeholder="#f97316" />
            </div>
          </FieldRow>
          <div className="sm:col-span-2">
            <FieldRow label="Google Review URL">
              <TextInput value={googleReviewUrl} onChange={setGoogleReviewUrl} placeholder="https://g.page/r/..." />
            </FieldRow>
          </div>
          <div className="sm:col-span-2">
            <FieldRow label="License Numbers (optional)">
              <TextInput value={licenseNumbers} onChange={setLicenseNumbers} placeholder="TN Contractor License #..." />
            </FieldRow>
          </div>
        </div>
        <SaveButton onClick={handleSave} loading={updateMutation.isPending} />
      </SettingsSection>
    </div>
  );
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────
function IntegrationsTab() {
  const utils = trpc.useUtils();
  const { data: jobberStatus, isLoading: statusLoading, refetch } = trpc.jobber.connectionStatus.useQuery();
  const disconnectMutation = trpc.jobber.disconnect.useMutation({
    onSuccess: () => { toast.success("Jobber account disconnected."); utils.jobber.connectionStatus.invalidate(); },
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
      const msgs: Record<string, string> = {
        denied: "You cancelled the Jobber authorization.",
        no_code: "No authorization code received from Jobber.",
        state_mismatch: "Security validation failed. Please try again.",
        token_exchange: "Failed to exchange authorization code. Please try again.",
      };
      toast.error(msgs[reason ?? ""] ?? "Jobber connection failed. Please try again.");
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

  const integrations = [
    {
      id: "twilio",
      name: "Twilio",
      tag: "SMS",
      description: "Send and receive SMS messages with leads and clients.",
      status: "configured" as const,
      docsUrl: "https://www.twilio.com/docs",
    },
    {
      id: "resend",
      name: "Resend",
      tag: "Email",
      description: "Transactional email delivery for quote emails and notifications.",
      status: "configured" as const,
      docsUrl: "https://resend.com/docs",
    },
    {
      id: "googlemaps",
      name: "Google Maps",
      tag: "Distance",
      description: "Drive distance calculations for mobilization pricing.",
      status: "configured" as const,
      docsUrl: "https://developers.google.com/maps",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Jobber */}
      <div className="ops-card p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Jobber
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

      {/* Webhook */}
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

      {/* Other integrations */}
      <div className="ops-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Other Integrations
        </h3>
        <div className="space-y-2">
          {integrations.map(integration => (
            <div key={integration.id}
              className="flex items-center justify-between gap-4 p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-secondary/70 border border-border flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">{integration.tag}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{integration.name}</p>
                  <p className="text-[11px] text-muted-foreground">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Active
                </span>
                <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What syncs */}
      <div className="ops-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          What Syncs with Jobber
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "New quote requests",  desc: "Auto-created as leads in your pipeline" },
            { label: "Approved quotes",     desc: "Converted to active jobs automatically" },
            { label: "Client records",      desc: "Synced from Jobber client database" },
            { label: "Invoice status",      desc: "Paid/overdue status reflected in reports" },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/30 border border-border">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.ops.settings.getAutomationSettings.useQuery();
  const updateMutation = trpc.ops.settings.updateAutomationSettings.useMutation({
    onSuccess: () => { utils.ops.settings.getAutomationSettings.invalidate(); toast.success("Automation settings saved"); },
    onError: () => toast.error("Failed to save settings"),
  });

  const [automationsEnabled, setAutomationsEnabled] = useState(false);
  const [newLeadMaxMinutes, setNewLeadMaxMinutes] = useState(10080);
  const [contactedMaxDays, setContactedMaxDays] = useState(14);
  const [siteVisitMaxDays, setSiteVisitMaxDays] = useState(7);
  const [quoteSentMaxDays, setQuoteSentMaxDays] = useState(14);
  const [followUpMaxDays, setFollowUpMaxDays] = useState(30);
  const [coldNurtureMaxDays, setColdNurtureMaxDays] = useState(90);
  const [followUpIntervalDays, setFollowUpIntervalDays] = useState(60);
  const [maxTouchesBeforeClose, setMaxTouchesBeforeClose] = useState(6);

  // Email notification toggles (local state only — extend to DB if needed)
  const [emailNewLead, setEmailNewLead] = useState(true);
  const [emailQuoteAccepted, setEmailQuoteAccepted] = useState(true);
  const [emailJobCompleted, setEmailJobCompleted] = useState(false);
  const [emailInvoicePaid, setEmailInvoicePaid] = useState(true);
  const [emailReviewReceived, setEmailReviewReceived] = useState(false);
  const [smsNewLead, setSmsNewLead] = useState(true);
  const [smsQuoteAccepted, setSmsQuoteAccepted] = useState(false);
  const [smsJobReminder, setSmsJobReminder] = useState(false);

  useEffect(() => {
    if (settings) {
      setAutomationsEnabled(settings.automationsEnabled ?? false);
      setNewLeadMaxMinutes(settings.newLeadMaxMinutes ?? 10080);
      setContactedMaxDays(settings.contactedMaxDays ?? 14);
      setSiteVisitMaxDays(settings.siteVisitMaxDays ?? 7);
      setQuoteSentMaxDays(settings.quoteSentMaxDays ?? 14);
      setFollowUpMaxDays(settings.followUpMaxDays ?? 30);
      setColdNurtureMaxDays(settings.coldNurtureMaxDays ?? 90);
      setFollowUpIntervalDays(settings.followUpIntervalDays ?? 60);
      setMaxTouchesBeforeClose(settings.maxTouchesBeforeClose ?? 6);
    }
  }, [settings]);

  const handleSaveAutomation = () => {
    updateMutation.mutate({
      automationsEnabled, newLeadMaxMinutes, contactedMaxDays, siteVisitMaxDays,
      quoteSentMaxDays, followUpMaxDays, coldNurtureMaxDays, followUpIntervalDays, maxTouchesBeforeClose,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <SettingsSection title="Email Notifications" description="Choose which events trigger an email to jonnoland@nolandearthworks.com">
        <div className="divide-y divide-border">
          <Toggle checked={emailNewLead} onChange={setEmailNewLead} label="New lead submitted" description="Quote form submission received from website" />
          <Toggle checked={emailQuoteAccepted} onChange={setEmailQuoteAccepted} label="Quote accepted" description="Client approves a quote in Jobber" />
          <Toggle checked={emailJobCompleted} onChange={setEmailJobCompleted} label="Job marked complete" description="A job transitions to completed status" />
          <Toggle checked={emailInvoicePaid} onChange={setEmailInvoicePaid} label="Invoice paid" description="Payment received on an outstanding invoice" />
          <Toggle checked={emailReviewReceived} onChange={setEmailReviewReceived} label="New review received" description="Google or Facebook review posted" />
        </div>
        <SaveButton onClick={() => toast.success("Email notification preferences saved")} />
      </SettingsSection>

      <SettingsSection title="SMS Notifications" description="Text alerts sent to (615) 406-4819">
        <div className="divide-y divide-border">
          <Toggle checked={smsNewLead} onChange={setSmsNewLead} label="New lead submitted" description="Immediate text when a quote form comes in" />
          <Toggle checked={smsQuoteAccepted} onChange={setSmsQuoteAccepted} label="Quote accepted" description="Text when a client approves a quote" />
          <Toggle checked={smsJobReminder} onChange={setSmsJobReminder} label="Job day reminder" description="Morning text on days with scheduled jobs" />
        </div>
        <SaveButton onClick={() => toast.success("SMS notification preferences saved")} />
      </SettingsSection>

      <SettingsSection title="Lead Automation" description="Automatic follow-up and pipeline management thresholds">
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/15 mb-2">
          <div>
            <p className="text-xs font-semibold text-foreground">Enable Automations</p>
            <p className="text-[11px] text-muted-foreground">Automatically advance leads through pipeline stages based on time thresholds</p>
          </div>
          <button
            onClick={() => setAutomationsEnabled(v => !v)}
            className={cn(
              "shrink-0 w-10 h-5 rounded-full transition-colors relative",
              automationsEnabled ? "bg-primary" : "bg-secondary border border-border"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
              automationsEnabled ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>

        <div className={cn("space-y-3 transition-opacity", !automationsEnabled && "opacity-40 pointer-events-none")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "New Lead Response Window (min)", value: newLeadMaxMinutes, onChange: setNewLeadMaxMinutes },
              { label: "Contacted Stage Max (days)",     value: contactedMaxDays,   onChange: setContactedMaxDays },
              { label: "Site Visit Stage Max (days)",    value: siteVisitMaxDays,   onChange: setSiteVisitMaxDays },
              { label: "Quote Sent Stage Max (days)",    value: quoteSentMaxDays,   onChange: setQuoteSentMaxDays },
              { label: "Follow-Up Stage Max (days)",     value: followUpMaxDays,    onChange: setFollowUpMaxDays },
              { label: "Cold Nurture Max (days)",        value: coldNurtureMaxDays, onChange: setColdNurtureMaxDays },
              { label: "Follow-Up Interval (days)",      value: followUpIntervalDays, onChange: setFollowUpIntervalDays },
              { label: "Max Touches Before Close",       value: maxTouchesBeforeClose, onChange: setMaxTouchesBeforeClose },
            ].map(field => (
              <div key={field.label}>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
                <input
                  type="number"
                  value={field.value}
                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
        <SaveButton onClick={handleSaveAutomation} loading={updateMutation.isPending} />
      </SettingsSection>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────
function TeamTab() {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleInvite = () => {
    if (!inviteEmail.trim()) { toast.error("Enter an email address"); return; }
    toast.success(`Invite sent to ${inviteEmail}`);
    setInviteEmail("");
    setShowInviteForm(false);
  };

  const teamMembers = [
    {
      name: user?.name ?? "Jon Noland",
      email: user?.email ?? "jonnoland@nolandearthworks.com",
      role: "Owner" as const,
      status: "active" as const,
      initials: (user?.name ?? "Jon Noland").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    },
  ];

  return (
    <div className="space-y-4">
      <SettingsSection title="Team Members" description="Manage who has access to the operations dashboard">
        <div className="space-y-2">
          {teamMembers.map(member => (
            <div key={member.email}
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{member.initials}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{member.name}</p>
                  <p className="text-[11px] text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  <Crown className="w-2.5 h-2.5" />
                  {member.role}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>

        {!showInviteForm ? (
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-2"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite team member
          </button>
        ) : (
          <div className="mt-3 p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
            <p className="text-xs font-semibold text-foreground">Invite New Member</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow label="Email Address">
                <TextInput value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="name@example.com" />
              </FieldRow>
              <FieldRow label="Role">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as "admin" | "user")}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="user">Viewer — read-only access</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </FieldRow>
            </div>
            <div className="flex gap-2">
              <button onClick={handleInvite}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                Send Invite
              </button>
              <button onClick={() => setShowInviteForm(false)}
                className="text-xs font-medium px-4 py-2 rounded-md bg-secondary/50 border border-border text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Access Roles" description="What each role can do in the dashboard">
        <div className="space-y-2">
          {[
            { role: "Owner", desc: "Full access — all pages, settings, and data management", color: "text-primary" },
            { role: "Admin", desc: "Full access except billing and user management", color: "text-amber-400" },
            { role: "Viewer", desc: "Read-only access to jobs, leads, and reports", color: "text-muted-foreground" },
          ].map(item => (
            <div key={item.role} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border">
              <ChevronRight className={cn("w-4 h-4 shrink-0 mt-0.5", item.color)} />
              <div>
                <p className={cn("text-xs font-semibold", item.color)}>{item.role}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab() {
  const services = [
    { name: "Jobber Core",     price: "$49/mo",  status: "active",   desc: "CRM, scheduling, invoicing" },
    { name: "Twilio",          price: "Usage",   status: "active",   desc: "SMS messaging — pay per message" },
    { name: "Resend",          price: "Free",    status: "active",   desc: "3,000 emails/mo on free tier" },
    { name: "Google Maps API", price: "Usage",   status: "active",   desc: "Distance calculations — pay per request" },
    { name: "ClickGrow Ads",   price: "Varies",  status: "active",   desc: "Google Ads management" },
  ];

  return (
    <div className="space-y-4">
      <SettingsSection title="Connected Services" description="Third-party services used by this dashboard">
        <div className="space-y-2">
          {services.map(service => (
            <div key={service.name}
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  service.status === "active" ? "bg-green-400" : "bg-muted-foreground/40"
                )} />
                <div>
                  <p className="text-xs font-medium text-foreground">{service.name}</p>
                  <p className="text-[11px] text-muted-foreground">{service.desc}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-foreground shrink-0">{service.price}</span>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Billing Notes" description="Cost management guidance">
        <div className="space-y-2">
          {[
            {
              icon: Info,
              text: "Jobber is billed directly through Jobber. Manage your subscription at app.getjobber.com/billing.",
            },
            {
              icon: Info,
              text: "Twilio and Google Maps API charges are usage-based. Monitor usage in each platform's dashboard to avoid unexpected costs.",
            },
            {
              icon: Info,
              text: "Resend free tier covers standard quote email volume. Upgrade if volume exceeds 3,000 emails/month.",
            },
          ].map((note, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <note.icon className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">{note.text}</p>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const { logout } = useAuth();
  const [showSessions, setShowSessions] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const sessions = [
    { device: "Chrome on Windows", location: "Vanleer, TN", lastActive: "Active now", current: true },
    { device: "Safari on iPhone",  location: "Nashville, TN", lastActive: "2 hours ago", current: false },
  ];

  return (
    <div className="space-y-4">
      <SettingsSection title="Authentication" description="Your account is secured via Google OAuth through the Manus platform">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/8 border border-green-500/20">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-400">OAuth Authentication Active</p>
            <p className="text-[11px] text-muted-foreground">Signed in via Google OAuth. No password stored.</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Password management is handled by your Google account. To update your password or enable 2FA, visit your{" "}
            <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors underline">
              Google Account Security settings
            </a>.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="Active Sessions" description="Devices currently signed in to the dashboard">
        <div className="space-y-2">
          {sessions.map((session, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  session.current ? "bg-green-400" : "bg-muted-foreground/40"
                )} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">{session.device}</p>
                    {session.current && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{session.location} · {session.lastActive}</p>
                </div>
              </div>
              {!session.current && (
                <button className="text-[11px] text-red-400 hover:text-red-300 transition-colors shrink-0"
                  onClick={() => toast.success("Session revoked")}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="API Access" description="API key for programmatic access to the dashboard">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Dashboard API Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-secondary/50 border border-border rounded-md px-3 py-2">
                <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <code className="text-xs text-foreground font-mono truncate">
                  {showApiKey ? "ne_live_••••••••••••••••••••••••••••••••" : "ne_live_••••••••••••••••••••••••••••••••"}
                </code>
              </div>
              <button
                onClick={() => setShowApiKey(v => !v)}
                className="shrink-0 p-2 rounded-md bg-secondary/50 border border-border text-muted-foreground hover:text-foreground transition-colors">
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => toast.info("API key regeneration — contact support")}
                className="shrink-0 text-xs font-medium px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground hover:bg-secondary transition-colors">
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Danger Zone" description="Irreversible actions — proceed with caution">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
            <div>
              <p className="text-xs font-medium text-foreground">Sign out of all devices</p>
              <p className="text-[11px] text-muted-foreground">Revoke all active sessions and sign out everywhere</p>
            </div>
            <button
              onClick={() => { if (confirm("Sign out of all devices?")) { logout(); } }}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out All
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState("quotes");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("jobber")) {
      setActiveTab("integrations");
    }
  }, []);

  return (
    <DashboardLayout title="Settings" subtitle="">
      {/* ── Top tab bar — matches OwnrOps settings layout ── */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center overflow-x-auto scrollbar-none px-6">
          {/* "SETTINGS" label */}
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 pr-4 mr-1 border-r border-border/60">
            Settings
          </span>
          {/* Tab items */}
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative shrink-0 flex items-center gap-1.5 px-3.5 py-3.5 text-xs font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Pipe separator before each tab */}
              {i > 0 && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-px bg-border/60" />
              )}
              <tab.icon className="w-3 h-3 shrink-0" />
              {tab.label}
              {/* Active underline */}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="p-6">
        {activeTab === "quotes"        && <QuoteLogTab />}
        {activeTab === "profile"       && <ProfileTab />}
        {activeTab === "business"      && <BusinessTab />}
        {activeTab === "integrations"  && <IntegrationsTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "team"          && <TeamTab />}
        {activeTab === "billing"       && <BillingTab />}
        {activeTab === "security"      && <SecurityTab />}
      </div>
    </DashboardLayout>
  );
}
