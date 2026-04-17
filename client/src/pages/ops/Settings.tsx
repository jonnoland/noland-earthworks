/**
 * Settings Page — Noland Earthworks Operations Dashboard
 * 12 tabs matching OwnrOps layout:
 * General | Automations | Phone | Trust Center | Team | Service Catalog |
 * Template Editor | Template Assignments | Reminders | Integrations | Payments | Billing
 */

import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import {
  Save, User, Building2, Bell, Shield, CreditCard, Users, Link2,
  ClipboardList, CheckCircle2, XCircle, Clock, ExternalLink,
  RefreshCw, Loader2, Phone, Mail, MapPin, Wrench, ChevronDown, ChevronUp,
  AlertCircle, Trash2, Globe, Hash,
  Key, LogOut, Eye, EyeOff,
  UserPlus, Crown, Info, Plus, BookOpen, Zap, FileText,
  AlarmClock, CreditCard as CardIcon, BarChart2, Copy, RotateCcw,
  Settings as SettingsIcon, CalendarOff, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Tab definitions ──────────────────────────────────────────────────────────
const tabs = [
  { id: "general",              label: "General",              icon: SettingsIcon },
  { id: "automations",          label: "Automations",          icon: Zap },
  { id: "phone",                label: "Phone",                icon: Phone },
  { id: "trust-center",         label: "Trust Center",         icon: Shield },
  { id: "team",                 label: "Team",                 icon: Users },
  { id: "service-catalog",      label: "Service Catalog",      icon: BookOpen },
  { id: "template-editor",      label: "Template Editor",      icon: FileText },
  { id: "template-assignments", label: "Template Assignments", icon: ClipboardList },
  { id: "reminders",            label: "Reminders",            icon: AlarmClock },
  { id: "integrations",         label: "Integrations",         icon: Link2 },
  { id: "payments",             label: "Payments",             icon: CardIcon },
  { id: "billing",              label: "Billing",              icon: CreditCard },
  { id: "scheduling",           label: "Scheduling",           icon: CalendarOff },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────
function SettingsSection({ title, description, children, action }: {
  title: string; description?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="ops-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {title}
          </h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/70 mt-1">{hint}</p>}
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

function NumberInput({ value, onChange, min = 0, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
    />
  );
}

// ─── Jobber status badge ──────────────────────────────────────────────────────
function JobberBadge({ status }: { status: "synced" | "failed" | "skipped" }) {
  if (status === "synced") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
        <CheckCircle2 className="w-3 h-3" />Synced to Jobber
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
        <XCircle className="w-3 h-3" />Jobber Sync Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
      <Clock className="w-3 h-3" />Not Synced
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Address</p>
                {addressParts.map((part, i) => (
                  <p key={i} className="text-xs text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-muted-foreground" />{part}
                  </p>
                ))}
              </div>
            )}
          </div>
          {q.message && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Message</p>
              <p className="text-xs text-foreground bg-secondary/40 rounded p-2">{q.message}</p>
            </div>
          )}
          {q.jobberError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded p-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{q.jobberError}</p>
            </div>
          )}
          {q.jobberRequestUrl && (
            <a href="https://secure.getjobber.com/home" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink className="w-3 h-3" />View in Jobber
            </a>
          )}
          <div className="pt-1">
            <button
              onClick={() => onDelete(q.id)}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />Delete submission
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function GeneralTab() {
  const { data: biz, isLoading } = trpc.ops.settings.getBusinessSettings.useQuery();
  const update = trpc.ops.settings.updateBusinessSettings.useMutation({
    onSuccess: () => toast.success("Settings saved"),
    onError: () => toast.error("Failed to save settings"),
  });

  const [form, setForm] = useState({
    companyName: "", phone: "", email: "", address: "", city: "", state: "", zip: "",
    website: "", googleReviewUrl: "", defaultTaxRate: "", brandColor: "", licenseNumbers: "",
  });
  const [licInput, setLicInput] = useState("");

  useEffect(() => {
    if (biz) {
      setForm({
        companyName: biz.companyName ?? "",
        phone: biz.phone ?? "",
        email: biz.email ?? "",
        address: biz.address ?? "",
        city: biz.city ?? "",
        state: biz.state ?? "",
        zip: biz.zip ?? "",
        website: biz.website ?? "",
        googleReviewUrl: biz.googleReviewUrl ?? "",
        defaultTaxRate: biz.defaultTaxRate ?? "",
        brandColor: biz.brandColor ?? "",
        licenseNumbers: biz.licenseNumbers ?? "",
      });
    }
  }, [biz]);

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const licenses = form.licenseNumbers ? form.licenseNumbers.split(",").map(s => s.trim()).filter(Boolean) : [];

  const addLicense = () => {
    if (!licInput.trim()) return;
    const updated = [...licenses, licInput.trim()].join(", ");
    setForm(p => ({ ...p, licenseNumbers: updated }));
    setLicInput("");
  };

  const removeLicense = (idx: number) => {
    const updated = licenses.filter((_, i) => i !== idx).join(", ");
    setForm(p => ({ ...p, licenseNumbers: updated }));
  };

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  // Setup progress
  const progressItems = [
    { label: "Company name", done: !!form.companyName },
    { label: "Phone number", done: !!form.phone },
    { label: "Email address", done: !!form.email },
    { label: "Business address", done: !!form.address },
    { label: "Website URL", done: !!form.website },
    { label: "Google Review URL", done: !!form.googleReviewUrl },
  ];
  const doneCount = progressItems.filter(i => i.done).length;

  return (
    <div className="space-y-4">
      <SettingsSection title="Company Profile">
        <div className="space-y-4">
          <FieldRow label="Company Name *">
            <TextInput value={form.companyName} onChange={f("companyName")} placeholder="Noland Earthworks, LLC" />
          </FieldRow>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Phone">
              <TextInput value={form.phone} onChange={f("phone")} placeholder="(555) 123-4567" type="tel" />
            </FieldRow>
            <FieldRow label="Email">
              <TextInput value={form.email} onChange={f("email")} placeholder="info@company.com" type="email" />
            </FieldRow>
          </div>
          <FieldRow label="Address">
            <TextInput value={form.address} onChange={f("address")} placeholder="123 Main St" />
          </FieldRow>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FieldRow label="City">
              <TextInput value={form.city} onChange={f("city")} placeholder="Columbia" />
            </FieldRow>
            <FieldRow label="State">
              <TextInput value={form.state} onChange={f("state")} placeholder="Tennessee" />
            </FieldRow>
            <FieldRow label="ZIP">
              <TextInput value={form.zip} onChange={f("zip")} placeholder="38401" />
            </FieldRow>
          </div>
          <FieldRow label="Website">
            <TextInput value={form.website} onChange={f("website")} placeholder="https://yourcompany.com" />
          </FieldRow>
          <FieldRow
            label="Google Review URL"
            hint='Shown to customers after payment. Find yours in Google Business Profile under "Ask for reviews".'
          >
            <TextInput value={form.googleReviewUrl} onChange={f("googleReviewUrl")} placeholder="https://g.page/r/..." />
          </FieldRow>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Default Tax Rate (%)" hint="Applied automatically when creating new invoices">
              <TextInput value={form.defaultTaxRate} onChange={f("defaultTaxRate")} placeholder="e.g. 7.25" type="number" />
            </FieldRow>
            <FieldRow label="Brand Color" hint="Used for email CTA buttons. Leave blank for default orange.">
              <div className="flex gap-2">
                <TextInput value={form.brandColor} onChange={f("brandColor")} placeholder="#f97316" />
                {form.brandColor && (
                  <div className="w-9 h-9 rounded-md border border-border shrink-0" style={{ backgroundColor: form.brandColor }} />
                )}
              </div>
            </FieldRow>
          </div>
          <FieldRow label="License Numbers">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={licInput}
                onChange={e => setLicInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addLicense()}
                placeholder="Enter license number"
                className="flex-1 bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
              />
              <button onClick={addLicense} className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 border border-border text-xs px-3 py-2 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" />Add
              </button>
            </div>
            {licenses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {licenses.map((lic, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-secondary border border-border text-xs px-2.5 py-1 rounded-full">
                    <Hash className="w-3 h-3 text-muted-foreground" />{lic}
                    <button onClick={() => removeLicense(i)} className="text-muted-foreground hover:text-red-400 transition-colors ml-0.5">
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </FieldRow>
          <SaveButton onClick={() => update.mutate(form)} loading={update.isPending} />
        </div>
      </SettingsSection>

      <SettingsSection title="Setup Progress" description={`${doneCount}/6 complete`}>
        <div className="space-y-2">
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${(doneCount / 6) * 100}%` }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {progressItems.map(item => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                {item.done
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  : <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />}
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function AutomationsTab() {
  const { data: auto, isLoading } = trpc.ops.settings.getAutomationSettings.useQuery();
  const update = trpc.ops.settings.updateAutomationSettings.useMutation({
    onSuccess: () => toast.success("Automation settings saved"),
    onError: () => toast.error("Failed to save"),
  });

  const [form, setForm] = useState({
    automationsEnabled: false,
    newLeadMaxMinutes: 10080,
    contactedMaxDays: 14,
    siteVisitMaxDays: 7,
    quoteSentMaxDays: 14,
    followUpMaxDays: 30,
    coldNurtureMaxDays: 90,
    followUpIntervalDays: 60,
    maxTouchesBeforeClose: 6,
  });

  useEffect(() => {
    if (auto) setForm({
      automationsEnabled: auto.automationsEnabled,
      newLeadMaxMinutes: auto.newLeadMaxMinutes,
      contactedMaxDays: auto.contactedMaxDays,
      siteVisitMaxDays: auto.siteVisitMaxDays,
      quoteSentMaxDays: auto.quoteSentMaxDays,
      followUpMaxDays: auto.followUpMaxDays,
      coldNurtureMaxDays: auto.coldNurtureMaxDays,
      followUpIntervalDays: auto.followUpIntervalDays,
      maxTouchesBeforeClose: auto.maxTouchesBeforeClose,
    });
  }, [auto]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <SettingsSection title="SMS & Email Automations" description="Configure automated workflows, stage timeouts, and nurture sequences.">
        <Toggle
          checked={form.automationsEnabled}
          onChange={v => setForm(p => ({ ...p, automationsEnabled: v }))}
          label="Enable Automations"
          description="When enabled, automated SMS and email messages will be sent based on lead stage and timing rules."
        />
        {!form.automationsEnabled && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">Automations are paused — No automated SMS or email messages will be sent.</p>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Automation Settings">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Stage Timeouts</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <FieldRow label="New Lead (minutes)">
                <NumberInput value={form.newLeadMaxMinutes} onChange={v => setForm(p => ({ ...p, newLeadMaxMinutes: v }))} />
              </FieldRow>
              <FieldRow label="Contacted (days)">
                <NumberInput value={form.contactedMaxDays} onChange={v => setForm(p => ({ ...p, contactedMaxDays: v }))} />
              </FieldRow>
              <FieldRow label="Site Visit (days)">
                <NumberInput value={form.siteVisitMaxDays} onChange={v => setForm(p => ({ ...p, siteVisitMaxDays: v }))} />
              </FieldRow>
              <FieldRow label="Quote Sent (days)">
                <NumberInput value={form.quoteSentMaxDays} onChange={v => setForm(p => ({ ...p, quoteSentMaxDays: v }))} />
              </FieldRow>
              <FieldRow label="Follow Up (days)">
                <NumberInput value={form.followUpMaxDays} onChange={v => setForm(p => ({ ...p, followUpMaxDays: v }))} />
              </FieldRow>
              <FieldRow label="Cold Nurture (days)">
                <NumberInput value={form.coldNurtureMaxDays} onChange={v => setForm(p => ({ ...p, coldNurtureMaxDays: v }))} />
              </FieldRow>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Nurture Defaults</p>
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="Follow-Up Interval (days)">
                <NumberInput value={form.followUpIntervalDays} onChange={v => setForm(p => ({ ...p, followUpIntervalDays: v }))} />
              </FieldRow>
              <FieldRow label="Max Touches Before Close">
                <NumberInput value={form.maxTouchesBeforeClose} onChange={v => setForm(p => ({ ...p, maxTouchesBeforeClose: v }))} />
              </FieldRow>
            </div>
          </div>
          <SaveButton onClick={() => update.mutate(form)} loading={update.isPending} label="Save Automation Settings" />
        </div>
      </SettingsSection>
    </div>
  );
}

function PhoneTab() {
  return (
    <div className="space-y-4">
      <SettingsSection title="Phone Numbers" description="Your business phone numbers, call routing, and compliance settings.">
        <div className="flex items-center justify-between p-3 bg-secondary/40 border border-border rounded-lg">
          <div>
            <p className="text-sm font-semibold text-foreground">+1 (931) 516-6917</p>
            <span className="inline-flex items-center gap-1 text-[11px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-semibold mt-1">Primary</span>
          </div>
          <div className="flex gap-2">
            {["Browser", "Forward", "Voicemail"].map(mode => (
              <button key={mode} onClick={() => toast.info("Feature coming soon")}
                className="text-xs bg-secondary hover:bg-secondary/80 border border-border px-3 py-1.5 rounded-md transition-colors">
                {mode}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => toast.info("Feature coming soon")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />Get new number (1/3)
        </button>
      </SettingsSection>

      <SettingsSection title="Voice Mode">
        <div className="space-y-2 text-xs text-foreground">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Inbound Call Routing</span>
            <span>Forward — calls ring your phone</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Call Recording</span>
            <span className="text-muted-foreground">Disabled</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="SMS Usage">
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Messages this month</span>
            <span className="font-semibold text-foreground">0 / 3,000</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: "0%" }} />
          </div>
          <p className="text-[11px] text-muted-foreground">0% of monthly limit used. Resets on the 1st of each month.</p>
        </div>
      </SettingsSection>

      <SettingsSection title="Business Hours">
        <div className="space-y-2 text-xs text-foreground">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Send Window</span>
            <span>6:00 AM – 6:00 PM</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Business Days</span>
            <span>Mon – Sun</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Timezone</span>
            <span>America/Chicago</span>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function TrustCenterTab() {
  return (
    <div className="space-y-4">
      <SettingsSection title="Carrier Registration (A2P 10DLC)" description="US carriers require business verification to deliver text messages reliably. This typically takes 1–7 business days.">
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">Your business is not registered with US carriers. Text messages may be filtered or blocked.</p>
        </div>
        <button onClick={() => toast.info("Feature coming soon")}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors">
          Register Now
        </button>
      </SettingsSection>

      <SettingsSection title="Messaging Rate Limits">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "SMS Sent", value: "$0.0079/msg" },
            { label: "SMS Received", value: "$0.0075/msg" },
            { label: "Phone Number", value: "$1.15/mo" },
            { label: "A2P Registration", value: "$4 one-time + $0.75/mo" },
          ].map(item => (
            <div key={item.label} className="bg-secondary/40 border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-xs font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Tips for Approval">
        <ul className="space-y-2">
          {[
            "Use a real business name that matches your registration",
            "Provide an accurate description of how you use SMS",
            "Include opt-in language in your message templates",
            "Ensure your website has a privacy policy",
            "Do not send unsolicited messages",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
}

function TeamTab() {
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Team & Organization"
        description="Manage team members, roles, and permissions."
        action={
          <button
            onClick={() => setShowInvite(s => !s)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-md transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />Invite Member
          </button>
        }
      >
        <p className="text-xs text-muted-foreground">1 team member</p>

        {showInvite && (
          <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/20">
            <p className="text-xs font-semibold text-foreground">Invite a team member</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow label="Email address">
                <TextInput value={inviteEmail} onChange={setInviteEmail} placeholder="crew@example.com" type="email" />
              </FieldRow>
              <FieldRow label="Role">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </FieldRow>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { toast.info("Invite feature coming soon"); setShowInvite(false); }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-md transition-colors"
              >
                Send Invite
              </button>
              <button onClick={() => setShowInvite(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="border border-border rounded-lg p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">JN</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Jon Noland</span>
              <span className="text-[11px] bg-secondary border border-border px-2 py-0.5 rounded-full text-muted-foreground">You</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">jonnoland@nolandearthworks.com</p>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-semibold">
              <Crown className="w-3 h-3" />Owner
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">Active</span>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function ServiceCatalogTab() {
  const { data: catalog, isLoading, refetch } = trpc.ops.settings.getServiceCatalog.useQuery();
  const upsert = trpc.ops.settings.upsertServiceCatalog.useMutation({
    onSuccess: () => { toast.success("Service catalog saved"); refetch(); },
    onError: () => toast.error("Failed to save"),
  });

  const [rows, setRows] = useState<{ serviceType: string; easyAcresPerDay: string; normalAcresPerDay: string; hardAcresPerDay: string; sortOrder: number }[]>([]);

  useEffect(() => {
    if (catalog) setRows(catalog.map((c, i) => ({
      serviceType: c.serviceType,
      easyAcresPerDay: String(c.easyAcresPerDay),
      normalAcresPerDay: String(c.normalAcresPerDay),
      hardAcresPerDay: String(c.hardAcresPerDay),
      sortOrder: i,
    })));
  }, [catalog]);

  const updateRow = (idx: number, field: string, val: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  const addRow = () => {
    setRows(prev => [...prev, { serviceType: "", easyAcresPerDay: "1", normalAcresPerDay: "0.75", hardAcresPerDay: "0.5", sortOrder: prev.length }]);
  };

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <SettingsSection title="Service Catalog" description="Configure service types and production rates used for generating estimates.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Service Type</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Easy (acres/day)</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Normal (acres/day)</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Hard (acres/day)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      value={row.serviceType}
                      onChange={e => updateRow(idx, "serviceType", e.target.value)}
                      className="w-full bg-secondary/50 border border-border rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                      placeholder="Service name"
                    />
                  </td>
                  {(["easyAcresPerDay", "normalAcresPerDay", "hardAcresPerDay"] as const).map(field => (
                    <td key={field} className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row[field]}
                        onChange={e => updateRow(idx, field, e.target.value)}
                        className="w-24 bg-secondary/50 border border-border rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                      />
                    </td>
                  ))}
                  <td className="py-2 pl-2">
                    <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-3.5 h-3.5" />Add service
          </button>
        </div>
        <SaveButton
          onClick={() => upsert.mutate(rows.map((r, i) => ({ ...r, sortOrder: i })))}
          loading={upsert.isPending}
          label="Save"
        />
      </SettingsSection>
    </div>
  );
}

const TEMPLATE_CATEGORIES = [
  { group: "QUOTES",    items: [{ cat: "quotes",    ch: "email", label: "Quote Email" }, { cat: "quotes",    ch: "sms", label: "Quote SMS" }] },
  { group: "INVOICES",  items: [{ cat: "invoices",  ch: "email", label: "Invoice Email" }, { cat: "invoices",  ch: "sms", label: "Invoice SMS" }] },
  { group: "REMINDERS", items: [{ cat: "reminders", ch: "email", label: "Reminder Email" }, { cat: "reminders", ch: "sms", label: "Reminder SMS" }] },
  { group: "FOLLOW-UP", items: [{ cat: "follow_up", ch: "email", label: "Follow-Up Email" }, { cat: "follow_up", ch: "sms", label: "Follow-Up SMS" }] },
  { group: "THANK YOU", items: [{ cat: "thank_you", ch: "email", label: "Thank You Email" }] },
];

const TEMPLATE_VARIABLES = [
  "{{first_name}}", "{{last_name}}", "{{company_name}}", "{{phone}}", "{{email}}",
  "{{quote_total}}", "{{invoice_total}}", "{{job_address}}", "{{due_date}}", "{{visit_date}}",
];

function TemplateEditorTab() {
  const { data: templates, isLoading, refetch } = trpc.ops.settings.getMessageTemplates.useQuery();
  const upsert = trpc.ops.settings.upsertMessageTemplate.useMutation({
    onSuccess: () => { toast.success("Template saved"); refetch(); },
    onError: () => toast.error("Failed to save"),
  });

  const [showVars, setShowVars] = useState(false);
  const [editForm, setEditForm] = useState<{ category: string; channel: string; subject: string; body: string } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", body: "" });

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const count = templates?.length ?? 0;

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Message Templates"
        description="Create reusable SMS templates with merge fields like {{first_name}}, {{company_name}}, and {{quote_total}}."
        action={
          <button
            onClick={() => setShowNew(s => !s)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />New Template
          </button>
        }
      >
        <button
          onClick={() => setShowVars(s => !s)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="w-3.5 h-3.5" />Available Variables
          {showVars ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showVars && (
          <div className="flex flex-wrap gap-2 p-3 bg-secondary/30 border border-border rounded-lg">
            {TEMPLATE_VARIABLES.map(v => (
              <span key={v} onClick={() => { navigator.clipboard.writeText(v); toast.success("Copied"); }}
                className="text-[11px] font-mono bg-secondary border border-border px-2 py-0.5 rounded cursor-pointer hover:border-primary/50 transition-colors">
                {v}
              </span>
            ))}
          </div>
        )}

        {showNew && (
          <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/20">
            <p className="text-xs font-semibold text-foreground">New SMS Template</p>
            <FieldRow label="Template Name">
              <TextInput value={newForm.name} onChange={v => setNewForm(p => ({ ...p, name: v }))} placeholder="e.g. Quick Follow-Up" />
            </FieldRow>
            <FieldRow label="Message Body">
              <textarea
                value={newForm.body}
                onChange={e => setNewForm(p => ({ ...p, body: e.target.value }))}
                placeholder="Hi {{first_name}}, just following up on your land clearing inquiry..."
                rows={4}
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </FieldRow>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!newForm.name || !newForm.body) { toast.error("Name and body required"); return; }
                  upsert.mutate({ category: "custom", channel: "sms", subject: newForm.name, body: newForm.body });
                  setShowNew(false);
                  setNewForm({ name: "", body: "" });
                }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-md transition-colors"
              >
                Save Template
              </button>
              <button onClick={() => setShowNew(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2">Cancel</button>
            </div>
          </div>
        )}

        {count === 0 && !showNew ? (
          <div className="text-center py-10 border border-dashed border-border rounded-lg">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No message templates yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create your own or use the Template Assignments tab to set up email templates.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates?.map(t => (
              <div key={t.id} className="border border-border rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">{t.subject || `${t.category} ${t.channel}`}</span>
                    <span className="text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded text-muted-foreground uppercase">{t.channel}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.body || "No body"}</p>
                </div>
                <button onClick={() => setEditForm({ category: t.category, channel: t.channel, subject: t.subject ?? "", body: t.body ?? "" })}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">Edit</button>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}

function TemplateAssignmentsTab() {
  const { data: templates, isLoading, refetch } = trpc.ops.settings.getMessageTemplates.useQuery();
  const upsert = trpc.ops.settings.upsertMessageTemplate.useMutation({
    onSuccess: () => { toast.success("Template saved"); refetch(); },
    onError: () => toast.error("Failed to save"),
  });

  const [selected, setSelected] = useState<{ cat: string; ch: string; label: string }>({ cat: "quotes", ch: "email", label: "Quote Email" });
  const [showVars, setShowVars] = useState(false);

  const current = templates?.find(t => t.category === selected.cat && t.channel === selected.ch);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    setSubject(current?.subject ?? "");
    setBody(current?.body ?? "");
  }, [current, selected]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <SettingsSection title="Templates" description="Customize the messages sent with quotes, invoices, reminders, and follow-ups. Use {{variables}} to personalize content.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: category list */}
          <div className="space-y-3">
            {TEMPLATE_CATEGORIES.map(group => (
              <div key={group.group}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{group.group}</p>
                <div className="space-y-0.5">
                  {group.items.map(item => (
                    <button
                      key={`${item.cat}-${item.ch}`}
                      onClick={() => setSelected(item)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-left transition-colors",
                        selected.cat === item.cat && selected.ch === item.ch
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      )}
                    >
                      {item.ch === "email" ? <Mail className="w-3.5 h-3.5 shrink-0" /> : <Phone className="w-3.5 h-3.5 shrink-0" />}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right: editor */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{selected.label}</p>
              <div className="flex gap-2">
                <button onClick={() => { setSubject(""); setBody(""); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-2.5 py-1.5 rounded-md">
                  <RotateCcw className="w-3 h-3" />Reset
                </button>
                <button
                  onClick={() => upsert.mutate({ category: selected.cat, channel: selected.ch, subject, body })}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                >
                  <Save className="w-3 h-3" />Save
                </button>
              </div>
            </div>

            {selected.ch === "email" && (
              <FieldRow label="Subject Line">
                <TextInput value={subject} onChange={setSubject} placeholder="Email subject..." />
              </FieldRow>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {selected.ch === "email" ? "Email Body" : "SMS Body"}
                </label>
                <button onClick={() => setShowVars(s => !s)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <Hash className="w-3 h-3" />Insert Variable
                </button>
              </div>
              {showVars && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-secondary/30 border border-border rounded-lg mb-2">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button key={v} onClick={() => { setBody(b => b + v); setShowVars(false); }}
                      className="text-[11px] font-mono bg-secondary border border-border px-2 py-0.5 rounded hover:border-primary/50 transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={selected.ch === "email" ? "Email body..." : "SMS message..."}
                rows={8}
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </div>

            {body && (
              <div className="border border-border rounded-lg p-3 bg-secondary/20">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{body}</p>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function RemindersTab() {
  const { data: rules, isLoading, refetch } = trpc.ops.settings.getReminderRules.useQuery();
  const create = trpc.ops.settings.createReminderRule.useMutation({
    onSuccess: () => { toast.success("Reminder rule added"); refetch(); setShowAdd(null); },
    onError: () => toast.error("Failed to add rule"),
  });
  const del = trpc.ops.settings.deleteReminderRule.useMutation({
    onSuccess: () => { toast.success("Rule deleted"); refetch(); },
    onError: () => toast.error("Failed to delete"),
  });

  const [showAdd, setShowAdd] = useState<"invoice" | "visit" | null>(null);
  const [newOffset, setNewOffset] = useState(-1);
  const [newChannel, setNewChannel] = useState<"email" | "sms" | "both">("sms");

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const invoiceRules = rules?.filter(r => r.ruleType === "invoice") ?? [];
  const visitRules = rules?.filter(r => r.ruleType === "visit") ?? [];

  const offsetLabel = (days: number) => {
    if (days === 0) return "On the day";
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} before`;
    return `${days} day${days !== 1 ? "s" : ""} after`;
  };

  const RuleSection = ({ type, label, desc, ruleList }: { type: "invoice" | "visit"; label: string; desc: string; ruleList: typeof invoiceRules }) => (
    <SettingsSection title={label} description={desc}>
      {ruleList.length === 0 && showAdd !== type ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <AlarmClock className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No reminder rules configured. Add one to start sending automatic reminders.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ruleList.map(rule => (
            <div key={rule.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-foreground">{offsetLabel(rule.offsetDays)}</span>
                <span className="text-muted-foreground">via</span>
                <span className="uppercase font-semibold text-primary text-[11px]">{rule.channel}</span>
              </div>
              <button onClick={() => del.mutate({ id: rule.id })} className="text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd === type ? (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/20">
          <p className="text-xs font-semibold text-foreground">New Reminder Rule</p>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Offset (days, negative = before)">
              <NumberInput value={newOffset} onChange={setNewOffset} step={1} />
            </FieldRow>
            <FieldRow label="Channel">
              <select
                value={newChannel}
                onChange={e => setNewChannel(e.target.value as "email" | "sms" | "both")}
                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="both">Both</option>
              </select>
            </FieldRow>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => create.mutate({ ruleType: type, offsetDays: newOffset, channel: newChannel })}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-md transition-colors"
            >
              Add Rule
            </button>
            <button onClick={() => setShowAdd(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setShowAdd(type); setNewOffset(-1); setNewChannel("sms"); }}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-lg py-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />Add Reminder Rule
        </button>
      )}
    </SettingsSection>
  );

  return (
    <div className="space-y-4">
      <RuleSection type="invoice" label="Invoice Reminders" desc="Configure automatic payment reminders. Rules trigger relative to the invoice due date." ruleList={invoiceRules} />
      <RuleSection type="visit" label="Visit Reminders" desc="Configure automatic site visit reminders. Rules trigger relative to the visit start time." ruleList={visitRules} />
    </div>
  );
}

function IntegrationsTab() {
  const { data: status, isLoading, refetch } = trpc.ops.settings.getIntegrationStatus.useQuery();
  const { data: jobberAuth } = trpc.jobber.getAuthUrl.useQuery();
  const jobberDisconnect = trpc.jobber.disconnect.useMutation({
    onSuccess: () => { toast.success("Jobber disconnected"); refetch(); },
    onError: () => toast.error("Failed to disconnect"),
  });

  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const webhookUrl = `${window.location.origin}/api/webhooks/leads`;
  const apiKey = "whk_ne-api-key-placeholder";
  const copy = (val: string) => { navigator.clipboard.writeText(val); toast.success("Copied to clipboard"); };

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const ConnectedBadge = ({ ok, label }: { ok: boolean; label?: string }) => ok ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
      <CheckCircle2 className="w-3 h-3" />{label ?? "Connected"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
      <XCircle className="w-3 h-3" />{label ?? "Not Connected"}
    </span>
  );

  return (
    <div className="space-y-4">

      {/* ── Jobber ── */}
      <SettingsSection
        title="Jobber"
        description="Field service management — clients, requests, jobs, invoices, and scheduling."
        action={<ConnectedBadge ok={!!status?.jobber.connected} />}
      >
        {status?.jobber.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Jobber is connected</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">New quote submissions are automatically sent to Jobber as service requests.</p>
              </div>
            </div>
            <div className="flex gap-2">
              {jobberAuth?.url && (
                <a href={jobberAuth.url}
                  className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border text-xs px-3 py-2 rounded-md transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />Reconnect
                </a>
              )}
              <button
                onClick={() => jobberDisconnect.mutate()}
                disabled={jobberDisconnect.isPending}
                className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-red-500/30 text-xs text-red-400 px-3 py-2 rounded-md transition-colors disabled:opacity-50">
                {jobberDisconnect.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">Jobber is not connected. Quote form submissions will not be forwarded to Jobber until you connect.</p>
            </div>
            {jobberAuth?.url ? (
              <a href={jobberAuth.url}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors">
                <Link2 className="w-3.5 h-3.5" />Connect Jobber
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">Jobber client credentials are not configured. Add JOBBER_CLIENT_ID and JOBBER_CLIENT_SECRET to your secrets.</p>
            )}
          </div>
        )}
      </SettingsSection>

      {/* ── Twilio ── */}
      <SettingsSection
        title="Twilio SMS"
        description="Outbound SMS for lead follow-ups, quote notifications, and automated reminders."
        action={<ConnectedBadge ok={!!status?.twilio.configured} label={status?.twilio.configured ? "Configured" : "Not Configured"} />}
      >
        {status?.twilio.configured ? (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Twilio is configured</p>
              {status.twilio.fromNumber && (
                <p className="text-[11px] text-muted-foreground mt-0.5">Sending from: <span className="font-mono">{status.twilio.fromNumber}</span></p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-secondary/40 border border-border rounded-md p-3">
            <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER are not set. Add them via Settings &gt; Secrets to enable SMS.</p>
          </div>
        )}
      </SettingsSection>

      {/* ── Resend ── */}
      <SettingsSection
        title="Resend Email"
        description="Transactional email for quote confirmations, notifications, and follow-ups."
        action={<ConnectedBadge ok={!!status?.resend.configured} label={status?.resend.configured ? "Configured" : "Not Configured"} />}
      >
        {status?.resend.configured ? (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-xs font-semibold text-foreground">Resend is configured — transactional emails are active.</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-secondary/40 border border-border rounded-md p-3">
            <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">RESEND_API_KEY is not set. Add it via Settings &gt; Secrets to enable email delivery.</p>
          </div>
        )}
      </SettingsSection>

      {/* ── Google Maps ── */}
      <SettingsSection
        title="Google Maps"
        description="Service area map, address autocomplete, and county boundary display on the public website."
        action={<ConnectedBadge ok={true} label="Active" />}
      >
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-xs font-semibold text-foreground">Google Maps is active via the built-in proxy — no API key required.</p>
        </div>
      </SettingsSection>

      {/* ── ClickGrow ── */}
      <SettingsSection
        title="ClickGrow Ads"
        description="Automated Google Ads management for Noland Earthworks."
        action={<span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30"><Globe className="w-3 h-3" />External</span>}
      >
        <div className="flex items-center gap-3 p-3 bg-secondary/40 border border-border rounded-lg">
          <Globe className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">Managed via ClickGrow dashboard</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Google Ads campaigns are managed externally. No integration required here.</p>
          </div>
          <a href="https://app.clickgrow.com" target="_blank" rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 text-xs text-primary hover:underline">
            Open <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </SettingsSection>

      {/* ── Webhook ── */}
      <SettingsSection
        title="Zapier / Make Webhook"
        description="Connect any lead source to your pipeline. No coding required."
        action={<span className="text-[11px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-semibold">Recommended</span>}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Webhook URL</label>
              <div className="flex gap-2 mt-1">
                <code className="flex-1 bg-secondary/60 border border-border rounded px-3 py-2 text-xs font-mono text-foreground truncate">{webhookUrl}</code>
                <button onClick={() => copy(webhookUrl)} className="shrink-0 p-2 bg-secondary border border-border rounded hover:bg-secondary/80 transition-colors">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider">API Key</label>
              <div className="flex gap-2 mt-1">
                <code className="flex-1 bg-secondary/60 border border-border rounded px-3 py-2 text-xs font-mono text-foreground truncate">
                  {apiKeyVisible ? apiKey : apiKey.slice(0, 8) + "..."}
                </code>
                <button onClick={() => setApiKeyVisible(v => !v)} className="shrink-0 p-2 bg-secondary border border-border rounded hover:bg-secondary/80 transition-colors">
                  {apiKeyVisible ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => copy(apiKey)} className="shrink-0 p-2 bg-secondary border border-border rounded hover:bg-secondary/80 transition-colors">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ── Facebook Lead Ads ── */}
      <SettingsSection
        title="Facebook Lead Ads"
        description="Automatically receive leads from your Facebook ad campaigns."
        action={<ConnectedBadge ok={false} />}
      >
        <button onClick={() => toast.info("Feature coming soon")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors">
          Connect Facebook Page
        </button>
        <p className="text-[11px] text-muted-foreground">You'll be asked to log into Facebook and select your business page.</p>
      </SettingsSection>

      {/* ── Google Business Profile ── */}
      <SettingsSection
        title="Google Business Profile"
        description="Display your Google reviews on quotes and proposals."
        action={<ConnectedBadge ok={false} />}
      >
        <button onClick={() => toast.info("Feature coming soon")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors">
          Connect Google Business Profile
        </button>
        <p className="text-[11px] text-muted-foreground">Your 5-star reviews will automatically display on customer quotes.</p>
      </SettingsSection>

      {/* ── QuickBooks ── */}
      <SettingsSection
        title="QuickBooks Online"
        description="Sync invoices, payments, and expenses with your accounting."
        action={<ConnectedBadge ok={false} />}
      >
        <button disabled className="flex items-center gap-2 bg-secondary border border-border text-xs px-3 py-2 rounded-md opacity-50 cursor-not-allowed">
          Connect QuickBooks (Coming Soon)
        </button>
      </SettingsSection>

      {/* ── Gusto ── */}
      <SettingsSection
        title="Gusto Payroll"
        description="Export approved timesheets directly to Gusto for payroll processing."
        action={<ConnectedBadge ok={false} />}
      >
        <button disabled className="flex items-center gap-2 bg-secondary border border-border text-xs px-3 py-2 rounded-md opacity-50 cursor-not-allowed">
          Connect Gusto (Coming Soon)
        </button>
      </SettingsSection>

    </div>
  );
}

function PaymentsTab() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Payment Settings"
        description="Connect Stripe to accept online payments from your customers."
        action={
          <button
            onClick={() => setEnabled(v => !v)}
            className={cn(
              "shrink-0 w-10 h-5 rounded-full transition-colors relative",
              enabled ? "bg-primary" : "bg-secondary border border-border"
            )}
          >
            <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-5" : "translate-x-0.5")} />
          </button>
        }
      >
        <div className="border border-border rounded-lg p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Get paid faster with online invoices</p>
          <p className="text-xs text-muted-foreground">Connect a free Stripe account so customers can pay your invoices by card or ACH. Money goes straight to your bank.</p>
          <ul className="space-y-2">
            {[
              "Accept credit card and ACH payments",
              "Automatic deposit to your bank account",
              "No monthly fees — only pay when you get paid",
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-xs text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />{item}
              </li>
            ))}
          </ul>
          <button onClick={() => toast.info("Stripe integration coming soon")}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-md transition-colors">
            <CardIcon className="w-3.5 h-3.5" />Connect Stripe
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="space-y-4">
      <SettingsSection title="Current Plan">
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Operator Software</p>
          <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
            Trial — 0 days left
          </span>
        </div>
      </SettingsSection>

      <SettingsSection title="Choose a Plan">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operator Software</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { price: "$297/mo", desc: "Monthly billing", highlight: false },
                { price: "$2,970/yr", desc: "Save $594 per year", highlight: true },
              ].map(plan => (
                <button key={plan.price} onClick={() => toast.info("Feature coming soon")}
                  className={cn(
                    "text-left p-4 border rounded-lg transition-colors",
                    plan.highlight ? "border-primary/40 bg-primary/10" : "border-border hover:border-border/80 bg-secondary/20"
                  )}>
                  <p className="text-sm font-bold text-foreground">{plan.price}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">OPS Accelerator</p>
            <p className="text-xs text-muted-foreground mb-3">16-week implementation program + 12 months of support. Includes all Operator Software features.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { price: "$10,000", desc: "Pay in full — save $2,000" },
                { price: "$1,500/mo × 8", desc: "$12,000 total over 8 months" },
              ].map(plan => (
                <button key={plan.price} onClick={() => toast.info("Feature coming soon")}
                  className="text-left p-4 border border-border rounded-lg hover:border-border/80 bg-secondary/20 transition-colors">
                  <p className="text-sm font-bold text-foreground">{plan.price}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

// ─── Quote Log ──────────────────────────────────────────────────────────────
function QuoteLogTab() {
  const { data: quotes, isLoading, refetch } = trpc.ops.quotes.list.useQuery({ limit: 100 });
  const deleteQuote = trpc.ops.quotes.delete.useMutation({
    onSuccess: () => { toast.success("Submission deleted"); refetch(); },
    onError: () => toast.error("Failed to delete"),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <SettingsSection title="Website Quote Submissions" description="All quote requests submitted through the website contact form.">
        {!quotes || quotes.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-lg">
            <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No quote submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.map(q => (
              <QuoteRow key={q.id} q={q} onDelete={id => deleteQuote.mutate({ id })} />
            ))}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}

// ─── Scheduling Tab (Blackout Dates) ───────────────────────────────────────────────────
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function SchedulingTab() {
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const utils = trpc.useUtils();

  const { data: blackoutDates = [], isLoading } = trpc.ops.blackoutDates.list.useQuery();
  const { data: recurringDays = [], isLoading: recurringLoading } = trpc.ops.recurringBlackout.list.useQuery();

  const addMutation = trpc.ops.blackoutDates.add.useMutation({
    onSuccess: () => {
      utils.ops.blackoutDates.list.invalidate();
      setNewDate("");
      setNewReason("");
      toast.success("Blackout date added.");
    },
    onError: () => toast.error("Failed to add blackout date."),
  });

  const removeMutation = trpc.ops.blackoutDates.remove.useMutation({
    onSuccess: () => {
      utils.ops.blackoutDates.list.invalidate();
      toast.success("Blackout date removed.");
    },
    onError: () => toast.error("Failed to remove blackout date."),
  });

  const addRecurring = trpc.ops.recurringBlackout.add.useMutation({
    onSuccess: () => {
      utils.ops.recurringBlackout.list.invalidate();
      toast.success("Recurring blackout day added.");
    },
    onError: (err) => toast.error(err.message ?? "Failed to add recurring day."),
  });

  const removeRecurring = trpc.ops.recurringBlackout.remove.useMutation({
    onSuccess: () => {
      utils.ops.recurringBlackout.list.invalidate();
      toast.success("Recurring day removed.");
    },
    onError: () => toast.error("Failed to remove recurring day."),
  });

  const activeDays = new Set(recurringDays.map((r: { dayOfWeek: number }) => r.dayOfWeek));

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Blackout Dates"
        description="Dates marked as unavailable will be blocked in the site visit request calendar on the public Pricing page. Visitors cannot select these dates."
      >
        {/* Add new blackout date */}
        <div className="flex gap-2 flex-wrap">
          <input
            type="date"
            min={today}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="h-8 flex-1 min-w-[160px] rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            disabled={!newDate || addMutation.isPending}
            onClick={() => addMutation.mutate({ date: newDate, reason: newReason || undefined })}
            className="h-8 px-3 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Add Date
          </button>
        </div>

        {/* Existing blackout dates */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 size={14} className="animate-spin" /> Loading...
          </div>
        ) : blackoutDates.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <CalendarOff className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No blackout dates set.</p>
            <p className="text-xs text-muted-foreground mt-1">Add dates above to block them from the site visit calendar.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {blackoutDates.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {new Date(row.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  {row.reason && <span className="text-xs text-muted-foreground">— {row.reason}</span>}
                </div>
                <button
                  onClick={() => removeMutation.mutate({ id: row.id })}
                  disabled={removeMutation.isPending}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove blackout date"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      {/* Recurring Blackout Days */}
      <SettingsSection
        title="Recurring Unavailable Days"
        description="Days of the week that are always unavailable for site visits. Visitors cannot select these days in the calendar, regardless of the specific date."
      >
        {recurringLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 size={14} className="animate-spin" /> Loading...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((day, idx) => {
              const isActive = activeDays.has(idx);
              const existingRow = recurringDays.find((r: { dayOfWeek: number; id: number }) => r.dayOfWeek === idx);
              return (
                <button
                  key={day}
                  disabled={addRecurring.isPending || removeRecurring.isPending}
                  onClick={() => {
                    if (isActive && existingRow) {
                      removeRecurring.mutate({ id: existingRow.id });
                    } else {
                      addRecurring.mutate({ dayOfWeek: idx, label: day });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 ${
                    isActive
                      ? "bg-amber-600/20 text-amber-400 border-amber-600/40 hover:bg-amber-600/30"
                      : "bg-muted/30 text-muted-foreground border-border hover:border-amber-600/40 hover:text-amber-400"
                  }`}
                >
                  {day}
                  {isActive && " ✕"}
                </button>
              );
            })}
          </div>
        )}
        {activeDays.size > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {Array.from(activeDays).sort().map(d => DAY_NAMES[d]).join(", ")} blocked every week.
          </p>
        )}
      </SettingsSection>
    </div>
  );
}

// ─── Main Settings page ───────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");

  const renderTab = () => {
    switch (activeTab) {
      case "general":              return <GeneralTab />;
      case "automations":          return <AutomationsTab />;
      case "phone":                return <PhoneTab />;
      case "trust-center":         return <TrustCenterTab />;
      case "team":                 return <TeamTab />;
      case "service-catalog":      return <ServiceCatalogTab />;
      case "template-editor":      return <TemplateEditorTab />;
      case "template-assignments": return <TemplateAssignmentsTab />;
      case "reminders":            return <RemindersTab />;
      case "integrations":         return <IntegrationsTab />;
      case "payments":             return <PaymentsTab />;
      case "billing":              return <BillingTab />;
      case "scheduling":           return <SchedulingTab />;
      default:                     return <GeneralTab />;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
        {/* ── Top settings nav bar ── */}
        <div className="sticky top-0 z-20 border-b border-border bg-[#0f0f0f]">
          <div className="overflow-x-auto">
            <div className="flex items-center min-w-max px-4 h-11">
              {/* SETTINGS label */}
              <span
                className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground pr-4 mr-1 border-r border-border shrink-0"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                SETTINGS
              </span>

              {/* Tabs */}
              {tabs.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <div key={tab.id} className="flex items-center">
                    {idx > 0 && <span className="text-border/60 px-1 text-xs select-none">|</span>}
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 h-11 text-xs font-medium transition-colors relative whitespace-nowrap",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {tab.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-4 sm:p-6 max-w-4xl">
          {renderTab()}
        </div>
      </div>
    </DashboardLayout>
  );
}
