/**
 * Settings Page — Noland Earthworks Operations Dashboard
 * 12 tabs matching OwnrOps layout:
 * General | Automations | Phone | Trust Center | Team | Service Catalog |
 * Template Editor | Template Assignments | Reminders | Integrations | Payments | Billing
 */

import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect, useMemo } from "react";
import {
  Save, User, Building2, Bell, Shield, Users, Link2,
  ClipboardList, CheckCircle2, XCircle, Clock, ExternalLink,
  RefreshCw, Loader2, Phone, Mail, MapPin, Wrench, ChevronDown, ChevronUp,
  AlertCircle, Trash2, Globe, Hash,
  Key, LogOut, Eye, EyeOff,
  UserPlus, Crown, Info, Plus, BookOpen, Zap, FileText,
  AlarmClock, CreditCard as CardIcon, BarChart2, Copy, RotateCcw,
  Settings as SettingsIcon, CalendarOff, CalendarDays, Bot, PlayCircle,
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
  { id: "scheduling",           label: "Scheduling",           icon: CalendarOff },
  { id: "agents",               label: "Agents",               icon: Bot },
  { id: "ai-pricing",           label: "AI Pricing",           icon: BarChart2 },
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
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, refetch } = trpc.ops.settings.listUsers.useQuery();
  const setRole = trpc.ops.settings.setUserRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); refetch(); },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Team & Access"
        description="All users who have logged into the ops dashboard. Promote to Admin to grant full access."
      >
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading users...
          </div>
        )}
        {!isLoading && (!users || users.length === 0) && (
          <p className="text-xs text-muted-foreground">No users found.</p>
        )}
        {users && users.map((u) => {
          const initials = (u.name ?? u.email ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
          const isOwner = u.id === currentUser?.id;
          return (
            <div key={u.id} className="border border-border rounded-lg p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{u.name ?? "Unnamed"}</span>
                  {isOwner && <span className="text-[11px] bg-secondary border border-border px-2 py-0.5 rounded-full text-muted-foreground">You</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{u.email ?? "No email"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isOwner ? (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-semibold">
                    <Crown className="w-3 h-3" />Owner
                  </span>
                ) : (
                  <select
                    value={u.role}
                    disabled={setRole.isPending}
                    onChange={(e) => setRole.mutate({ userId: u.id, role: e.target.value as "user" | "admin" })}
                    className="bg-secondary/50 border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">Active</span>
              </div>
            </div>
          );
        })}
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
                placeholder="Hi {{first_name}}, just following up on your land management inquiry..."
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

// ─── Google Business Profile Card ───────────────────────────────────────────
function GoogleBusinessProfileCard() {
  const { data: googleStatus, isLoading, refetch } = trpc.ops.google.connectionStatus.useQuery();
  const googleDisconnect = trpc.ops.google.disconnect.useMutation({
    onSuccess: () => { toast.success("Google Business Profile disconnected"); refetch(); },
    onError: (e) => toast.error(`Disconnect failed: ${e.message}`),
  });

  const ConnectedBadge = ({ ok }: { ok: boolean }) => ok ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
      <CheckCircle2 className="w-3 h-3" />Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
      <XCircle className="w-3 h-3" />Not Connected
    </span>
  );

  if (isLoading) {
    return (
      <SettingsSection title="Google Business Profile" description="Display your Google reviews on quotes and proposals." action={<ConnectedBadge ok={false} />}>
        <div className="flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Checking connection...</span></div>
      </SettingsSection>
    );
  }

  const isConnected = googleStatus?.connected ?? false;

  return (
    <SettingsSection
      title="Google Business Profile"
      description="Display your Google reviews on quotes and proposals."
      action={<ConnectedBadge ok={isConnected} />}
    >
      {isConnected ? (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-green-300">Google Business Profile connected</span>
            </div>
            {googleStatus?.businessName && (
              <p className="text-[11px] text-muted-foreground">
                <span className="text-foreground/60">Business:</span> {googleStatus.businessName}
              </p>
            )}
            {googleStatus?.expiresAt && (
              <p className="text-[11px] text-muted-foreground">
                <span className="text-foreground/60">Token expires:</span> {new Date(googleStatus.expiresAt).toLocaleDateString()}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">5-star reviews are synced and displayed on the homepage and customer quotes.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/api/google/authorize"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-secondary border border-border hover:bg-secondary/80 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />Reconnect
            </a>
            <button
              onClick={() => {
                if (confirm("Disconnect Google Business Profile? Review sync will stop until you reconnect.")) {
                  googleDisconnect.mutate();
                }
              }}
              disabled={googleDisconnect.isPending}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-secondary border border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground transition-colors disabled:opacity-50"
            >
              {googleDisconnect.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 bg-secondary/40 border border-border rounded-md p-3">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">Connect your Google Business Profile to automatically sync 5-star reviews to your homepage and customer quotes.</p>
          </div>
          <a
            href="/api/google/authorize"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />Connect Google Business Profile
          </a>
          <p className="text-[11px] text-muted-foreground">You will be redirected to Google to authorize access. Requires a Google account with access to your Business Profile.</p>
        </div>
      )}
    </SettingsSection>
  );
}

function IntegrationsTab() {
  const { data: status, isLoading, refetch } = trpc.ops.settings.getIntegrationStatus.useQuery();
  const { data: jobberAuth } = trpc.jobber.getAuthUrl.useQuery();
  const jobberDisconnect = trpc.jobber.disconnect.useMutation({
    onSuccess: () => { toast.success("Jobber disconnected"); refetch(); },
    onError: () => toast.error("Failed to disconnect"),
  });

  // Facebook webhook utilities
  const { data: fbLastReceived, refetch: refetchFbLast } = trpc.ops.leads.facebookLastReceived.useQuery();
  const fbTestWebhook = trpc.ops.leads.facebookTestWebhook.useMutation({
    onSuccess: () => { toast.success("Test lead sent — check the Leads board"); refetchFbLast(); },
    onError: (e) => toast.error(`Test failed: ${e.message}`),
  });
  const fbDisconnect = trpc.ops.leads.facebookDisconnect.useMutation({
    onSuccess: () => toast.success("Facebook webhook disconnected"),
    onError: (e) => toast.error(`Disconnect failed: ${e.message}`),
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
        action={<ConnectedBadge ok={true} />}
      >
        <div className="space-y-3">
          {/* Status block */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-xs font-semibold text-green-300">Webhook active — receiving leads</span>
              </div>
              {fbLastReceived && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last received: {new Date(fbLastReceived).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">
                <span className="text-foreground/60">Page:</span> Noland Earthworks, LLC
              </p>
              <p className="text-[11px] text-muted-foreground">
                <span className="text-foreground/60">App:</span> Noland Earthworks Leads (Published)
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                <span className="text-foreground/60">Endpoint:</span> /api/webhooks/facebook
              </p>
              <p className="text-[11px] text-muted-foreground">
                <span className="text-foreground/60">Subscribed fields:</span> leadgen
              </p>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fbTestWebhook.mutate()}
              disabled={fbTestWebhook.isPending}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              {fbTestWebhook.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
              Test Connection
            </button>
            <button
              onClick={() => {
                if (confirm("Disconnect Facebook Lead Ads? New leads will stop being received until you reconnect.")) {
                  fbDisconnect.mutate();
                }
              }}
              disabled={fbDisconnect.isPending}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-secondary border border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground transition-colors disabled:opacity-50"
            >
              {fbDisconnect.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
              Disconnect
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            New leads from Facebook Lead Ads are automatically captured and appear in the Leads board tagged with source "Facebook".
          </p>
        </div>
      </SettingsSection>

      {/* ── Google Business Profile ── */}
      <GoogleBusinessProfileCard />

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

// ─── Agents Tab ─────────────────────────────────────────────────────────────
const DEFAULT_STALE_SMS = `Heads up: {name} ({stage}) has been quiet for {days} days. Phone: {phone}. Check in at nolandearthworks.com/ops/leads`;

function AgentsTab() {
  const { data: agents, isLoading, refetch } = trpc.agents.list.useQuery();
  const setEnabled = trpc.agents.setEnabled.useMutation({ onSuccess: () => refetch() });
  const triggerRun = trpc.agents.triggerRun.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Agent queued: ${vars.agentId.replace(/_/g, " ")}`);
      setTimeout(() => refetch(), 3000);
    },
  });
  const { data: logs } = trpc.agents.getLogs.useQuery({ limit: 30 });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const { data: smsData } = trpc.agents.getSmsTemplate.useQuery({ agentId: "stale_lead_alert" });
  const [smsTemplate, setSmsTemplateLocal] = useState("");
  const [smsSaved, setSmsSaved] = useState(false);
  const saveSmsTemplate = trpc.agents.setSmsTemplate.useMutation({
    onSuccess: () => { setSmsSaved(true); setTimeout(() => setSmsSaved(false), 2500); },
  });
  // Sync server value into local state once loaded
  useEffect(() => { if (smsData?.template) setSmsTemplateLocal(smsData.template); }, [smsData]);

  const statusColor = (s: string) =>
    s === "ok" ? "text-green-400" : s === "error" ? "text-red-400" : "text-amber-400";

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Scheduled Agents"
        description="Background agents that run automatically. Toggle any agent off to disable it. Use Run Now to trigger a manual run."
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading agents...
          </div>
        ) : (
          <div className="space-y-3">
            {(agents ?? []).map((agent) => (
              <div key={agent.id} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                      <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{agent.schedule}</span>
                      {agent.enabled ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">Enabled</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">Disabled</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
                    {agent.lastRun && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Last run: <span className={statusColor(agent.lastRun.status)}>{agent.lastRun.status.toUpperCase()}</span>
                        {" — "}{new Date(agent.lastRun.ranAt).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {agent.lastRun.summary ? ` — ${agent.lastRun.summary}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => triggerRun.mutate({ agentId: agent.id })}
                      disabled={triggerRun.isPending}
                      title="Run now"
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEnabled.mutate({ agentId: agent.id, enabled: !agent.enabled })}
                      className={cn(
                        "shrink-0 w-10 h-5 rounded-full transition-colors relative",
                        agent.enabled ? "bg-primary" : "bg-secondary border border-border"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        agent.enabled ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Stale Lead Alert — SMS Template"
        description="Customize the text message sent when stale leads are found. Tokens: {name} {stage} {days} {phone}"
      >
        <div className="space-y-2">
          <textarea
            className="w-full rounded-md border border-border bg-background text-sm text-foreground px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            value={smsTemplate || DEFAULT_STALE_SMS}
            onChange={(e) => setSmsTemplateLocal(e.target.value)}
            placeholder={DEFAULT_STALE_SMS}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveSmsTemplate.mutate({ agentId: "stale_lead_alert", template: smsTemplate || DEFAULT_STALE_SMS })}
              disabled={saveSmsTemplate.isPending}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saveSmsTemplate.isPending ? "Saving..." : smsSaved ? "Saved" : "Save Template"}
            </button>
            <button
              onClick={() => setSmsTemplateLocal(DEFAULT_STALE_SMS)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset to default
            </button>
            <span className="text-[11px] text-muted-foreground ml-auto">{(smsTemplate || DEFAULT_STALE_SMS).length}/500 chars</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Agent Run History"
        description="Last 30 runs across all agents."
      >
        {!logs || logs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No runs recorded yet.</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="border border-border rounded-md">
                <button
                  onClick={() => setExpandedLog(expandedLog === String(log.id) ? null : String(log.id))}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/30 transition-colors"
                >
                  <span className={cn("text-[10px] font-bold uppercase w-10 shrink-0", statusColor(log.status))}>{log.status}</span>
                  <span className="text-xs text-muted-foreground font-mono shrink-0">{log.agentId.replace(/_/g, " ")}</span>
                  <span className="text-xs text-foreground flex-1 truncate">{log.summary ?? ""}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(log.ranAt).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </button>
                {expandedLog === String(log.id) && log.error && (
                  <div className="px-3 pb-2">
                    <pre className="text-[10px] text-red-400 bg-red-500/10 rounded p-2 overflow-x-auto whitespace-pre-wrap">{log.error}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}

/// ─── AI Pricing Settings Tab ─────────────────────────────────────────────────

// Middle & West TN market averages — updated May 2026 based on competitor research
// Mid State LC (Nashville): $1,500–$3,000/ac forestry mulching
// Angi 2026 national average: $2,000/ac, range $1,000–$2,500
// Brush hogging market: $100–$175/ac open pasture, $150–$250 heavy growth
// West TN mobilization: +$150–$200 over Middle TN due to drive distance
const MIDDLE_TN_DEFAULTS = {
  forestryMulchingBaseRate: 2000,  // raised from 1800 — market mid for tracked machine
  landClearingBaseRate: 2200,
  brushHoggingBaseRate: 175,
  rowClearingBaseRate: 1400,
  mobilizationFee: 450,
  minimumJobTotal: 1200,
  densityModerateMultiplier: "1.25",
  densityHeavyMultiplier: "1.60",
  terrainRollingMultiplier: "1.15",
  terrainSteepMultiplier: "1.40",
  accessModerateMultiplier: "1.10",
  accessDifficultMultiplier: "1.25",
  priceRangeSpread: "0.15",
  westTnMobilizationFee: "650",    // reflects additional 60–90 mi drive time
  stumpGrindingPerStump: 150,
  debrisHaulingPerLoad: 450,
  volumeDiscount3to5Pct: 3,
  volumeDiscount5to10Pct: 7,
  volumeDiscount10plusPct: 10,     // reduced from 12 — protects margin on large jobs
  apdForestryMulching: "1.5",
  apdLandClearing: "1.2",
  apdRowClearing: "3.0",
  apdBrushHogging: "8.0",
  seasonalPeakUpliftPct: 0,
  seasonalSlowReductionPct: 0,
  complexityPremiumPct: 15,
} as const;

// Inline tooltip component
function FieldTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex ml-1 align-middle">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Help"
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-50 w-56 rounded-md border border-border bg-popover px-2.5 py-2 text-[11px] text-popover-foreground shadow-md">
          {text}
        </span>
      )}
    </span>
  );
}

function AIPricingTab() {
  const { data: settings, isLoading } = trpc.ops.settings.getAIPricingSettings.useQuery();
  const { data: benchmarks, isLoading: benchmarksLoading, refetch: refetchBenchmarks } = trpc.agents.getPricingBenchmarks.useQuery();
  const utils = trpc.useUtils();
  const update = trpc.ops.settings.updateAIPricingSettings.useMutation({
    onSuccess: () => {
      toast.success("AI pricing model saved");
      utils.ops.settings.getAIPricingSettings.invalidate();
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });
  const runAgent = trpc.agents.triggerRun.useMutation({
    onSuccess: () => {
      toast.success("Pricing research started. Results will update in a moment.");
      setTimeout(() => refetchBenchmarks(), 8000);
    },
    onError: (e) => toast.error(`Agent run failed: ${e.message}`),
  });

  const [form, setForm] = useState<Record<string, string | number>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        forestryMulchingBaseRate: settings.forestryMulchingBaseRate,
        landClearingBaseRate: settings.landClearingBaseRate,
        brushHoggingBaseRate: settings.brushHoggingBaseRate,
        rowClearingBaseRate: settings.rowClearingBaseRate,
        mobilizationFee: settings.mobilizationFee,
        minimumJobTotal: settings.minimumJobTotal,
        densityModerateMultiplier: settings.densityModerateMultiplier,
        densityHeavyMultiplier: settings.densityHeavyMultiplier,
        terrainRollingMultiplier: settings.terrainRollingMultiplier,
        terrainSteepMultiplier: settings.terrainSteepMultiplier,
        accessModerateMultiplier: settings.accessModerateMultiplier,
        accessDifficultMultiplier: settings.accessDifficultMultiplier,
        priceRangeSpread: settings.priceRangeSpread,
        westTnMobilizationFee: settings.westTnMobilizationFee ?? "",
        // Add-on rates
        stumpGrindingPerStump: settings.stumpGrindingPerStump,
        debrisHaulingPerLoad: settings.debrisHaulingPerLoad,
        // Volume discounts
        volumeDiscount3to5Pct: settings.volumeDiscount3to5Pct,
        volumeDiscount5to10Pct: settings.volumeDiscount5to10Pct,
        volumeDiscount10plusPct: settings.volumeDiscount10plusPct,
        // Production rates
        apdForestryMulching: settings.apdForestryMulching,
        apdLandClearing: settings.apdLandClearing,
        apdRowClearing: settings.apdRowClearing,
        apdBrushHogging: settings.apdBrushHogging,
        // Seasonal adjustment
        seasonalPeakUpliftPct: settings.seasonalPeakUpliftPct,
        seasonalSlowReductionPct: settings.seasonalSlowReductionPct,
        // Complexity premium
        complexityPremiumPct: settings.complexityPremiumPct,
      });
      setDirty(false);
    }
  }, [settings]);

  function setField(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    const westTnRaw = form.westTnMobilizationFee;
    update.mutate({
      forestryMulchingBaseRate: Number(form.forestryMulchingBaseRate),
      landClearingBaseRate: Number(form.landClearingBaseRate),
      brushHoggingBaseRate: Number(form.brushHoggingBaseRate),
      rowClearingBaseRate: Number(form.rowClearingBaseRate),
      mobilizationFee: Number(form.mobilizationFee),
      minimumJobTotal: Number(form.minimumJobTotal),
      densityModerateMultiplier: String(form.densityModerateMultiplier),
      densityHeavyMultiplier: String(form.densityHeavyMultiplier),
      terrainRollingMultiplier: String(form.terrainRollingMultiplier),
      terrainSteepMultiplier: String(form.terrainSteepMultiplier),
      accessModerateMultiplier: String(form.accessModerateMultiplier),
      accessDifficultMultiplier: String(form.accessDifficultMultiplier),
      priceRangeSpread: String(form.priceRangeSpread),
      westTnMobilizationFee: westTnRaw !== "" && westTnRaw !== undefined ? Number(westTnRaw) : undefined,
      // Add-on rates
      stumpGrindingPerStump: Number(form.stumpGrindingPerStump),
      debrisHaulingPerLoad: Number(form.debrisHaulingPerLoad),
      // Volume discounts
      volumeDiscount3to5Pct: Number(form.volumeDiscount3to5Pct),
      volumeDiscount5to10Pct: Number(form.volumeDiscount5to10Pct),
      volumeDiscount10plusPct: Number(form.volumeDiscount10plusPct),
      // Production rates
      apdForestryMulching: String(form.apdForestryMulching),
      apdLandClearing: String(form.apdLandClearing),
      apdRowClearing: String(form.apdRowClearing),
      apdBrushHogging: String(form.apdBrushHogging),
      // Seasonal adjustment
      seasonalPeakUpliftPct: Number(form.seasonalPeakUpliftPct),
      seasonalSlowReductionPct: Number(form.seasonalSlowReductionPct),
      // Complexity premium
      complexityPremiumPct: Number(form.complexityPremiumPct),
    });
  }

  // ── Live preview calculator ──────────────────────────────────────────────
  // Mirrors the core math in analyzeSubmission so the preview stays in sync
  // NOTE: must be declared BEFORE any early returns to satisfy React rules of hooks
  const [calc, setCalc] = useState({ service: "forestry-mulching", acres: 5, density: "moderate", terrain: "flat", access: "easy", addStumps: 0, addLoads: 0 });

  const previewResult = useMemo(() => {
    const baseRateMap: Record<string, number> = {
      "forestry-mulching": Number(form.forestryMulchingBaseRate) || 1800,
      "land-clearing":     Number(form.landClearingBaseRate)     || 2200,
      "brush-hogging":     Number(form.brushHoggingBaseRate)     || 175,
      "row-clearing":      Number(form.rowClearingBaseRate)      || 1400,
    };
    const densityMult: Record<string, number> = {
      light:    1.0,
      moderate: Number(form.densityModerateMultiplier) || 1.25,
      heavy:    Number(form.densityHeavyMultiplier)    || 1.60,
    };
    const terrainMult: Record<string, number> = {
      flat:    1.0,
      rolling: Number(form.terrainRollingMultiplier) || 1.15,
      steep:   Number(form.terrainSteepMultiplier)   || 1.40,
    };
    const accessMult: Record<string, number> = {
      easy:     1.0,
      moderate: Number(form.accessModerateMultiplier)  || 1.10,
      difficult: Number(form.accessDifficultMultiplier) || 1.25,
    };
    const vd3 = (Number(form.volumeDiscount3to5Pct)  || 0) / 100;
    const vd5 = (Number(form.volumeDiscount5to10Pct) || 0) / 100;
    const vd10 = (Number(form.volumeDiscount10plusPct) || 0) / 100;
    const vd = calc.acres >= 10 ? (1 - vd10) : calc.acres >= 5 ? (1 - vd5) : calc.acres >= 3 ? (1 - vd3) : 1.0;
    const mob = Number(form.mobilizationFee) || 450;
    const minJob = Number(form.minimumJobTotal) || 1200;
    const spread = Number(form.priceRangeSpread) || 0.15;
    const base = (baseRateMap[calc.service] ?? 1800) * calc.acres;
    const dm = densityMult[calc.density] ?? 1;
    const tm = terrainMult[calc.terrain] ?? 1;
    const am = accessMult[calc.access] ?? 1;
    const raw = (base + mob) * dm * tm * am * vd;
    const mid = Math.max(minJob, Math.round(raw));
    const low = Math.max(minJob, Math.round(mid * (1 - spread)));
    const high = Math.round(mid * (1 + spread));
    const stumpTotal = calc.addStumps * (Number(form.stumpGrindingPerStump) || 150);
    const debrisTotal = calc.addLoads * (Number(form.debrisHaulingPerLoad) || 450);
    const apdMap: Record<string, number> = {
      "forestry-mulching": Number(form.apdForestryMulching) || 1.5,
      "land-clearing":     Number(form.apdLandClearing)     || 1.2,
      "row-clearing":      Number(form.apdRowClearing)      || 3.0,
      "brush-hogging":     Number(form.apdBrushHogging)     || 8.0,
    };
    const apd = apdMap[calc.service] ?? 1.5;
    const estDays = calc.acres > 0 ? Math.max(1, Math.ceil(calc.acres / apd)) : 1;
    return { low: low + stumpTotal + debrisTotal, mid: mid + stumpTotal + debrisTotal, high: high + stumpTotal + debrisTotal, estDays, stumpTotal, debrisTotal };
  }, [form, calc]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />Loading...
      </div>
    );
  }

  // ── Section tab state ──────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<"rates" | "modifiers" | "addons" | "production" | "benchmarks">("rates");

  const sectionTabs = [
    { id: "rates"      as const, label: "Rates & Minimums" },
    { id: "modifiers"  as const, label: "Multipliers" },
    { id: "addons"     as const, label: "Add-ons & Discounts" },
    { id: "production" as const, label: "Production & Seasonal" },
    { id: "benchmarks" as const, label: "Market Benchmarks" },
  ];

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left: settings form ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Section tab bar */}
        <div className="flex gap-1 border-b border-border pb-0">
          {sectionTabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveSection(t.id)}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-colors",
                activeSection === t.id
                  ? "border-primary text-foreground bg-secondary/20"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/10"
              )}
            >{t.label}</button>
          ))}
        </div>

        {/* ── Rates & Minimums ── */}
        {activeSection === "rates" && (
          <div className="space-y-5">
            {/* Base rates */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Base Rates</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Per-acre revenue target for each service. Feed directly into AI quote estimates.</p>
                </div>
                {benchmarks && benchmarks.length > 0 && (
                  <button
                    onClick={() => {
                      const MAP: Record<string, string> = {
                        "Forestry Mulching": "forestryMulchingBaseRate",
                        "Land Management":   "landClearingBaseRate",
                        "Brush Hogging":     "brushHoggingBaseRate",
                      };
                      let applied = 0;
                      for (const b of benchmarks) {
                        const fieldKey = MAP[b.serviceType];
                        if (fieldKey) { setField(fieldKey, b.midPerAcre); applied++; }
                      }
                      if (applied > 0) toast.success(`Base rates synced to market mid-rates (${applied} fields).`);
                      else toast.error("No matching benchmarks. Run the pricing agent first.");
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Sync to Market Mid-Rates
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  { label: "Forestry Mulching", key: "forestryMulchingBaseRate", note: "Market mid: $2,000" },
                  { label: "Land Management",   key: "landClearingBaseRate",     note: "Market mid: $2,200" },
                  { label: "Brush Hogging",     key: "brushHoggingBaseRate",     note: "Market: $150–$250" },
                  { label: "ROW Clearing",      key: "rowClearingBaseRate",       note: "Market: $1,200–$1,600" },
                ] as const).map(({ label, key, note }) => (
                  <div key={key} className="ops-card p-3">
                    <label className="block text-[11px] font-semibold text-foreground mb-0.5">{label}</label>
                    <p className="text-[10px] text-muted-foreground mb-2">{note}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <input
                        type="number" min={0}
                        value={form[key] as number ?? 0}
                        onChange={(e) => setField(key, parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">$/acre</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Job minimums */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Job Minimums</p>
              <p className="text-[11px] text-muted-foreground mb-3">Fixed costs and floor pricing applied to every job.</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: "Mobilization Fee",  key: "mobilizationFee",  note: "Added to every job" },
                  { label: "Minimum Job Total", key: "minimumJobTotal",  note: "Quotes below this are floored" },
                ] as const).map(({ label, key, note }) => (
                  <div key={key} className="ops-card p-3">
                    <label className="block text-[11px] font-semibold text-foreground mb-0.5">{label}</label>
                    <p className="text-[10px] text-muted-foreground mb-2">{note}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <input
                        type="number" min={0}
                        value={form[key] as number ?? 0}
                        onChange={(e) => setField(key, parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* West TN override */}
            <div className="ops-card p-4">
              <p className="text-xs font-semibold text-foreground mb-1">West TN Mobilization Override</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Applies to Carroll, Chester, Decatur, Gibson, Hardin, Henderson, Henry, Madison, and Weakley counties.
                Leave blank to use the standard mobilization fee. Market rate: $600–$700 for the additional drive distance.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  type="number" min={0}
                  value={form.westTnMobilizationFee as string ?? ""}
                  placeholder="e.g. 650"
                  onChange={(e) => setField("westTnMobilizationFee", e.target.value)}
                  className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
                <span className="text-[11px] text-muted-foreground">per job</span>
              </div>
            </div>

            {/* Price range spread */}
            <div className="ops-card p-4">
              <p className="text-xs font-semibold text-foreground mb-1">Price Range Spread</p>
              <p className="text-[11px] text-muted-foreground mb-3">Controls the low/high band on AI estimates. 0.15 = ±15% around the midpoint.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number" step="0.01" min={0} max={0.5}
                  value={form.priceRangeSpread as string ?? "0.15"}
                  onChange={(e) => setField("priceRangeSpread", e.target.value)}
                  className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[11px] text-muted-foreground">decimal — 0.15 = ±15%</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Multipliers ── */}
        {activeSection === "modifiers" && (
          <div className="ops-card p-5 space-y-5">
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Condition Multipliers</p>
              <p className="text-[11px] text-muted-foreground">Applied on top of base rates. 1.00 = no change, 1.25 = +25%. Light density and flat terrain are always 1.00.</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {([
                { heading: "Vegetation Density", fields: [
                  { label: "Moderate", key: "densityModerateMultiplier", note: "Mixed brush/saplings" },
                  { label: "Heavy",    key: "densityHeavyMultiplier",    note: "Dense cedar/hardwood" },
                ]},
                { heading: "Terrain", fields: [
                  { label: "Rolling", key: "terrainRollingMultiplier", note: "Gentle slopes" },
                  { label: "Steep",   key: "terrainSteepMultiplier",   note: "Significant grade" },
                ]},
                { heading: "Site Access", fields: [
                  { label: "Moderate",  key: "accessModerateMultiplier",  note: "Limited entry points" },
                  { label: "Difficult", key: "accessDifficultMultiplier", note: "Tight or obstructed" },
                ]},
              ] as const).map(({ heading, fields }) => (
                <div key={heading}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">{heading}</p>
                  <div className="space-y-3">
                    {fields.map(({ label, key, note }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-foreground mb-0.5">{label}</label>
                        <p className="text-[10px] text-muted-foreground mb-1.5">{note}</p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" step="0.01" min={0.5} max={5}
                            value={form[key] as string ?? "1.00"}
                            onChange={(e) => setField(key, e.target.value)}
                            className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-xs text-muted-foreground">x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Add-ons & Discounts ── */}
        {activeSection === "addons" && (
          <div className="space-y-4">
            <div className="ops-card p-4">
              <p className="text-sm font-semibold text-foreground mb-1">Add-On Rates</p>
              <p className="text-[11px] text-muted-foreground mb-4">Per-unit rates for optional services. Added as line items when selected on a quote.</p>
              <div className="grid grid-cols-2 gap-4">
                {([
                  { label: "Stump Grinding", key: "stumpGrindingPerStump", unit: "per stump", note: "Market: $100–$200/stump" },
                  { label: "Debris Hauling", key: "debrisHaulingPerLoad",  unit: "per load",  note: "Market: $350–$550/load" },
                ] as const).map(({ label, key, unit, note }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-foreground mb-0.5">{label}</label>
                    <p className="text-[10px] text-muted-foreground mb-2">{note}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">$</span>
                      <input
                        type="number" min={0}
                        value={form[key] as number ?? 0}
                        onChange={(e) => setField(key, parseInt(e.target.value, 10) || 0)}
                        className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-[11px] text-muted-foreground">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ops-card p-4">
              <p className="text-sm font-semibold text-foreground mb-1">Volume Discounts</p>
              <p className="text-[11px] text-muted-foreground mb-4">Automatically applied based on job size. Set to 0 to disable. Larger discounts reduce margin on big jobs — adjust carefully.</p>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: "3–5 Acres",  key: "volumeDiscount3to5Pct",   note: "Small uplift" },
                  { label: "5–10 Acres", key: "volumeDiscount5to10Pct",  note: "Mid-range" },
                  { label: "10+ Acres",  key: "volumeDiscount10plusPct", note: "Large job" },
                ] as const).map(({ label, key, note }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-foreground mb-0.5">{label}</label>
                    <p className="text-[10px] text-muted-foreground mb-2">{note}</p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={0} max={50}
                        value={form[key] as number ?? 0}
                        onChange={(e) => setField(key, parseInt(e.target.value, 10) || 0)}
                        className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Production & Seasonal ── */}
        {activeSection === "production" && (
          <div className="space-y-4">
            <div className="ops-card p-4">
              <p className="text-sm font-semibold text-foreground mb-1">Production Rates</p>
              <p className="text-[11px] text-muted-foreground mb-4">Acres your machine covers per day under moderate conditions. Used to calculate estimated days on site.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {([
                  { label: "Forestry Mulching", key: "apdForestryMulching", note: "Dense cedar/brush" },
                  { label: "Land Management",   key: "apdLandClearing",     note: "Mixed clearing" },
                  { label: "ROW Clearing",       key: "apdRowClearing",     note: "Linear corridors" },
                  { label: "Brush Hogging",      key: "apdBrushHogging",    note: "Open pasture" },
                ] as const).map(({ label, key, note }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-foreground mb-0.5">{label}</label>
                    <p className="text-[10px] text-muted-foreground mb-2">{note}</p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.25" min={0.25} max={20}
                        value={form[key] as string ?? "1.5"}
                        onChange={(e) => setField(key, e.target.value)}
                        className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground">ac/day</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ops-card p-4">
              <p className="text-sm font-semibold text-foreground mb-1">Seasonal Adjustments</p>
              <p className="text-[11px] text-muted-foreground mb-4">Optional percentage adjustments applied automatically by time of year. Set to 0 to disable.</p>
              <div className="grid grid-cols-2 gap-4 mb-5">
                {([
                  { label: "Peak Season Uplift",    key: "seasonalPeakUpliftPct",    note: "Oct–Mar (dormant season)" },
                  { label: "Slow Season Reduction", key: "seasonalSlowReductionPct", note: "Jul–Sep (peak heat)" },
                ] as const).map(({ label, key, note }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-foreground mb-0.5">{label}</label>
                    <p className="text-[10px] text-muted-foreground mb-2">{note}</p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={0} max={50}
                        value={form[key] as number ?? 0}
                        onChange={(e) => setField(key, parseInt(e.target.value, 10) || 0)}
                        className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-foreground mb-1">Complexity Premium</p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Added automatically when the customer message mentions structures, fencing, utilities, water features, or neighboring properties.
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min={0} max={100}
                    value={form.complexityPremiumPct as number ?? 15}
                    onChange={(e) => setField("complexityPremiumPct", parseInt(e.target.value, 10) || 0)}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">% premium</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Market Benchmarks ── */}
        {activeSection === "benchmarks" && (
          <div className="ops-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Middle & West TN Market Benchmarks</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-lg">
                  AI-researched directional rates based on regional competitor data, industry forums, and cost guides.
                  Updated daily. Not live-scraped prices — use as a reference to verify your rates are in range.
                </p>
              </div>
              <button
                onClick={() => runAgent.mutate({ agentId: "pricing_update" })}
                disabled={runAgent.isPending || benchmarksLoading}
                className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/60 disabled:opacity-50 transition-colors shrink-0"
              >
                {runAgent.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Refresh Now
              </button>
            </div>
            {benchmarksLoading && (
              <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading benchmarks...
              </div>
            )}
            {!benchmarksLoading && (!benchmarks || benchmarks.length === 0) && (
              <div className="text-xs text-muted-foreground py-4">
                No benchmark data yet. Click Refresh Now to pull current market rates.
              </div>
            )}
            {!benchmarksLoading && benchmarks && benchmarks.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary/30 border-b border-border">
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Service</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Low /ac</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Mid /ac</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">High /ac</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarks.map((b) => (
                        <tr key={b.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2.5 font-medium text-foreground">{b.serviceType}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">${b.lowPerAcre.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right text-foreground font-semibold">${b.midPerAcre.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">${b.highPerAcre.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right text-[11px] text-muted-foreground">
                            {new Date(b.lastUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {benchmarks.filter(b => b.researchSummary).length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Research Notes</p>
                    {benchmarks.filter(b => b.researchSummary).map((b) => (
                      <div key={b.id} className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{b.serviceType}:</span> {b.researchSummary}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Action bar ── */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            onClick={() => {
              setForm({ ...MIDDLE_TN_DEFAULTS });
              setDirty(true);
              toast.success("Reset to Middle & West TN market defaults. Click Save to apply.");
            }}
            className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/20 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Market Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || update.isPending}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        </div>
      </div>{/* end left column */}

      {/* ── Right: live preview calculator ── */}
      <div className="w-72 shrink-0 sticky top-6">
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="text-sm font-semibold text-foreground">Live Quote Preview</div>
          <p className="text-[11px] text-muted-foreground -mt-2">Updates instantly as you adjust rates above.</p>

          {/* Service */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Service</label>
            <select
              value={calc.service}
              onChange={e => setCalc(c => ({ ...c, service: e.target.value }))}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            >
              <option value="forestry-mulching">Forestry Mulching</option>
              <option value="land-clearing">Land Management</option>
              <option value="brush-hogging">Brush Hogging</option>
              <option value="row-clearing">ROW Clearing</option>
            </select>
          </div>

          {/* Acres */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Acres</label>
            <input
              type="number" min={0.5} max={100} step={0.5}
              value={calc.acres}
              onChange={e => setCalc(c => ({ ...c, acres: parseFloat(e.target.value) || 0 }))}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            />
          </div>

          {/* Density / Terrain / Access */}
          {([
            { label: "Density", key: "density", opts: ["light", "moderate", "heavy"] },
            { label: "Terrain", key: "terrain", opts: ["flat", "rolling", "steep"] },
            { label: "Access",  key: "access",  opts: ["easy", "moderate", "difficult"] },
          ] as const).map(({ label, key, opts }) => (
            <div key={key} className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
              <div className="flex gap-1">
                {opts.map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setCalc(c => ({ ...c, [key]: o }))}
                    className={cn(
                      "flex-1 rounded px-1 py-1 text-[10px] font-medium border transition-colors",
                      calc[key] === o
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/20 text-muted-foreground border-border hover:bg-secondary/40"
                    )}
                  >{o}</button>
                ))}
              </div>
            </div>
          ))}

          {/* Add-ons */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Stumps</label>
              <input type="number" min={0} step={1}
                value={calc.addStumps}
                onChange={e => setCalc(c => ({ ...c, addStumps: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Haul Loads</label>
              <input type="number" min={0} step={1}
                value={calc.addLoads}
                onChange={e => setCalc(c => ({ ...c, addLoads: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              />
            </div>
          </div>

          {/* Result */}
          <div className="rounded-md bg-secondary/20 border border-border p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Low</span>
              <span className="font-medium text-foreground">${previewResult.low.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground font-medium">Mid</span>
              <span className="font-bold text-primary text-sm">${previewResult.mid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">High</span>
              <span className="font-medium text-foreground">${previewResult.high.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>Est. days on site</span>
              <span className="font-medium text-foreground">{previewResult.estDays}</span>
            </div>
            {previewResult.stumpTotal > 0 && (
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Stump grinding</span>
                <span>+${previewResult.stumpTotal.toLocaleString()}</span>
              </div>
            )}
            {previewResult.debrisTotal > 0 && (
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Debris hauling</span>
                <span>+${previewResult.debrisTotal.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Main Settings page ─────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState(() => {
    // Auto-navigate to integrations tab when returning from Google OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.has("google")) return "integrations";
    return "general";
  });

  // Clean up the ?google= query param after reading it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("google")) {
      const status = params.get("google");
      if (status === "connected") {
        toast.success("Google Business Profile connected");
      } else if (status === "error") {
        const reason = params.get("reason") ?? "Unknown error";
        toast.error(`Google connection failed: ${reason}`);
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

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
      case "scheduling":           return <SchedulingTab />;
      case "agents":               return <AgentsTab />;
      case "ai-pricing":           return <AIPricingTab />;
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
