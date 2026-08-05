/**
 * GovContracts — Federal contract opportunity feed for Noland Earthworks.
 * Pulls active solicitations from SAM.gov filtered to land clearing / forestry
 * mulching NAICS codes within ~150 miles of Vanleer, TN.
 *
 * Includes a "Prepare Bid" workflow that generates a pre-filled cover letter,
 * AI capability statement, and pricing worksheet for any listed opportunity.
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Clock,
  Building2,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Landmark,
  FileText,
  Copy,
  Printer,
  Loader2,
  CheckCircle2,
  Star,
  ThumbsUp,
  Minus,
  ThumbsDown,
  ClipboardList,
  ArrowUpDown,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ── NAICS reference labels ────────────────────────────────────────────────────
const NAICS_LABELS: Record<string, string> = {
  "115310": "Support Activities for Forestry",
  "561730": "Landscaping Services",
  "238910": "Site Preparation Contractors",
  "562910": "Remediation Services",
  "237990": "Other Heavy Civil Engineering",
  "333120": "Construction Machinery Mfg",
};

// ── State portal links ────────────────────────────────────────────────────────
const STATE_PORTALS = [
  {
    name: "Tennessee eProcurement",
    url: "https://www.tn.gov/generalservices/procurement/central-procurement-office/cpo-solicitations.html",
    note: "State of TN solicitations — search 'land clearing' or 'forestry'",
  },
  {
    name: "TN Dept. of Transportation",
    url: "https://www.tn.gov/tdot/business-with-tdot/contracts-and-letting.html",
    note: "TDOT right-of-way and vegetation management contracts",
  },
  {
    name: "TN Dept. of Environment & Conservation",
    url: "https://www.tn.gov/environment/about-tdec/tdec-procurement.html",
    note: "TDEC land management and remediation solicitations",
  },
  {
    name: "Kentucky eProcurement",
    url: "https://eprocurement.ky.gov/",
    note: "KY state and county solicitations",
  },
  {
    name: "Alabama Procurement",
    url: "https://procurement.alabama.gov/",
    note: "AL state solicitations — land clearing and site prep",
  },
  {
    name: "USACE Nashville District",
    url: "https://www.lrn.usace.army.mil/Business-With-Us/Contracting/",
    note: "Army Corps of Engineers — TN/KY region contracts (Nashville District)",
  },
  {
    name: "TVA Procurement",
    url: "https://www.tva.com/about-tva/procurement",
    note: "Tennessee Valley Authority — vegetation management and ROW",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Opportunity = {
  id: string;
  title: string;
  solicitationNumber: string | null;
  agency: string;
  type: string;
  naics: { code: string; label: string }[];
  postedDate: string | null;
  responseDeadline: string | null;
  daysUntilDeadline: number | null;
  isUrgent: boolean;
  isExpired: boolean;
  state: string | null;
  city: string | null;
  setAside: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  samLink: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function DeadlineBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-muted-foreground">No deadline listed</span>;
  if (days < 0) return <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">Expired</Badge>;
  if (days <= 3) return <Badge className="text-xs bg-red-600 text-white">{days}d left — Urgent</Badge>;
  if (days <= 7) return <Badge className="text-xs bg-amber-600 text-white">{days}d left</Badge>;
  if (days <= 14) return <Badge className="text-xs bg-yellow-700 text-white">{days}d left</Badge>;
  return <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-300">{days}d left</Badge>;
}

function NaicsBadge({ code }: { code: string }) {
  const label = NAICS_LABELS[code];
  return (
    <span
      className="inline-block text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400"
      title={label ?? code}
    >
      {code}{label ? ` — ${label}` : ""}
    </span>
  );
}

// ── Fit Score algorithm ──────────────────────────────────────────────────────
// Scores each opportunity 0–100 based on how well it fits Noland Earthworks:
// single operator, tracked forestry mulcher, 2–50 acres, TN/KY/AL/AR, veteran-owned.
const PRIMARY_NAICS = new Set(["115310", "238910", "561730"]);
const SECONDARY_NAICS = new Set(["562910", "237990"]);
const SDVOSB_KEYWORDS = ["sdvosb", "service-disabled", "veteran", "vosb"];
const GOOD_TITLE_KEYWORDS = [
  "forestry", "mulch", "land clearing", "brush", "vegetation", "clearing",
  "right-of-way", "row clearing", "trail", "mowing", "site prep", "site preparation",
];
const BAD_TITLE_KEYWORDS = [
  "grading", "excavat", "hauling", "paving", "asphalt", "concrete", "demolition",
  "construction", "building", "electrical", "plumbing", "hvac", "roofing",
];

function computeFitScore(opp: Opportunity): {
  score: number;
  tier: "recommended" | "good" | "review" | "low";
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // 1. NAICS match (0–30 pts)
  const naicsCodes = opp.naics.map(n => n.code);
  const hasPrimary = naicsCodes.some(c => PRIMARY_NAICS.has(c));
  const hasSecondary = naicsCodes.some(c => SECONDARY_NAICS.has(c));
  if (hasPrimary) { score += 30; reasons.push("Primary NAICS match"); }
  else if (hasSecondary) { score += 15; reasons.push("Secondary NAICS match"); }

  // 2. Title keyword match (0–20 pts)
  const titleLower = opp.title.toLowerCase();
  const goodMatches = GOOD_TITLE_KEYWORDS.filter(kw => titleLower.includes(kw));
  const badMatches = BAD_TITLE_KEYWORDS.filter(kw => titleLower.includes(kw));
  if (goodMatches.length > 0) {
    const pts = Math.min(20, goodMatches.length * 7);
    score += pts;
    reasons.push(`Title keywords: ${goodMatches.slice(0, 2).join(", ")}`);
  }
  if (badMatches.length > 0) {
    score -= 15;
    reasons.push(`Scope mismatch: ${badMatches[0]}`);
  }

  // 3. Set-aside eligibility (0–25 pts)
  const setAsideLower = (opp.setAside ?? "").toLowerCase();
  if (SDVOSB_KEYWORDS.some(kw => setAsideLower.includes(kw))) {
    score += 25;
    reasons.push("SDVOSB set-aside — veteran preference");
  } else if (setAsideLower.includes("small business") || setAsideLower.includes("sb")) {
    score += 15;
    reasons.push("Small business set-aside");
  } else if (!opp.setAside || opp.setAside === "None") {
    score += 5;
    reasons.push("Open competition");
  }

  // 4. Geography (0–15 pts)
  const state = (opp.state ?? "").toUpperCase();
  if (state === "TN") { score += 15; reasons.push("Tennessee — home state"); }
  else if (["KY", "AL", "AR"].includes(state)) { score += 10; reasons.push(`${state} — service area`); }
  else if (state) { score += 3; }

  // 5. Deadline urgency — penalize if < 5 days (not enough time to prepare)
  if (opp.daysUntilDeadline !== null && opp.daysUntilDeadline < 5) {
    score -= 10;
    reasons.push("Deadline < 5 days — tight turnaround");
  }

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  const tier: "recommended" | "good" | "review" | "low" =
    score >= 70 ? "recommended" :
    score >= 50 ? "good" :
    score >= 30 ? "review" : "low";

  return { score, tier, reasons };
}

function FitBadge({ tier, score }: { tier: "recommended" | "good" | "review" | "low"; score: number }) {
  if (tier === "recommended") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
      <Star size={9} className="fill-amber-400" /> Recommended · {score}
    </span>
  );
  if (tier === "good") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
      <ThumbsUp size={9} /> Good Fit · {score}
    </span>
  );
  if (tier === "review") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-700/60 text-zinc-300 border border-zinc-600/40">
      <Minus size={9} /> Review · {score}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-500 border border-zinc-700/40">
      <ThumbsDown size={9} /> Low Fit · {score}
    </span>
  );
}

// ── Pre-submission Checklist Modal ────────────────────────────────────────────
const CHECKLIST_ITEMS = [
  { id: "sam", label: "SAM.gov registration is active and not expired", detail: "Log in at sam.gov and verify your registration expiration date. Active registration is required to submit any federal bid." },
  { id: "cage", label: "CAGE code is confirmed", detail: "Your CAGE code is required on all federal submissions. Verify it matches your SAM.gov profile." },
  { id: "uei", label: "Unique Entity ID (UEI) is confirmed", detail: "The UEI replaced DUNS numbers in 2022. Confirm it is in your SAM.gov profile and matches your bid documents." },
  { id: "naics", label: "NAICS code matches the solicitation", detail: "Confirm your primary NAICS code (115310, 238910, or 561730) is listed in your SAM.gov profile and matches the solicitation." },
  { id: "sdvosb", label: "SDVOSB certification is current (if set-aside applies)", detail: "If this is an SDVOSB set-aside, verify your certification in the SBA Veteran Small Business Certification (VetCert) program at veterans.certify.sba.gov." },
  { id: "scope", label: "Full solicitation reviewed — scope, CLINs, and attachments", detail: "Download and read the full solicitation package from SAM.gov. Pay attention to CLIN structure, performance requirements, and any required certifications or bonds." },
  { id: "pricing", label: "Pricing worksheet reviewed and unit prices filled in", detail: "Do not submit the auto-generated pricing worksheet without reviewing the solicitation's required CLIN structure and filling in your actual unit prices." },
  { id: "cover", label: "Cover letter reviewed and signature block added", detail: "Personalize the cover letter, add your full legal name and title, and confirm the submission address matches the solicitation." },
  { id: "deadline", label: "Submission deadline confirmed", detail: "Federal submissions must be received — not just sent — before the deadline. Allow extra time for SAM.gov upload." },
  { id: "submit", label: "Submission made through SAM.gov or as directed in solicitation", detail: "Log in to sam.gov, navigate to this opportunity, and upload your response package. Some solicitations require email submission — read the instructions carefully." },
];

function PreSubmissionChecklist({ opportunity, onClose }: { opportunity: Opportunity; onClose: () => void }) {
  const storageKey = `checklist-${opportunity.id}`;

  // Auto-load saved progress from localStorage
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });

  const toggle = (id: string) => setChecked(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    // Auto-save to localStorage
    try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))); } catch {}
    return next;
  });

  const progress = Math.round((checked.size / CHECKLIST_ITEMS.length) * 100);
  const allDone = checked.size === CHECKLIST_ITEMS.length;

  // AI Draft Proposal
  const bidPrep = trpc.govContracts.bidPrep.useMutation();
  const [showDraft, setShowDraft] = useState(false);

  const handleDraftProposal = () => {
    setShowDraft(true);
    if (!bidPrep.data && !bidPrep.isPending) {
      bidPrep.mutate({
        opportunityId: opportunity.id,
        title: opportunity.title,
        agency: opportunity.agency,
        solicitationNumber: opportunity.solicitationNumber,
        naics: opportunity.naics,
        responseDeadline: opportunity.responseDeadline,
        state: opportunity.state,
        city: opportunity.city,
        setAside: opportunity.setAside,
        contactName: opportunity.contactName,
        contactEmail: opportunity.contactEmail,
        samLink: opportunity.samLink,
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
            <ClipboardList size={16} className="text-amber-500" />
            Pre-Submission Checklist
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs leading-relaxed">
            {opportunity.title}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="mt-1 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-zinc-400">{checked.size} of {CHECKLIST_ITEMS.length} complete</span>
            <span className={`text-[11px] font-semibold ${
              allDone ? "text-green-400" : progress >= 60 ? "text-amber-400" : "text-zinc-400"
            }`}>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                allDone ? "bg-green-500" : progress >= 60 ? "bg-amber-500" : "bg-zinc-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {allDone && (
            <p className="text-[11px] text-green-400 mt-1 font-medium">All items complete — ready to submit.</p>
          )}
          {checked.size > 0 && !allDone && (
            <p className="text-[10px] text-zinc-500 mt-1">Progress saved automatically.</p>
          )}
        </div>

        {/* Checklist items */}
        {!showDraft && (
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  checked.has(item.id)
                    ? "border-green-700/50 bg-green-950/30"
                    : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70"
                }`}
              >
                <div className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  checked.has(item.id) ? "bg-green-600 border-green-600" : "border-zinc-600"
                }`}>
                  {checked.has(item.id) && <CheckCircle2 size={10} className="text-white" />}
                </div>
                <div>
                  <p className={`text-xs font-medium leading-snug ${
                    checked.has(item.id) ? "text-green-400 line-through opacity-70" : "text-zinc-200"
                  }`}>{item.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{item.detail}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* AI Draft Proposal panel */}
        {showDraft && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-200">AI-Generated Cover Letter Draft</p>
              <button onClick={() => setShowDraft(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={14} />
              </button>
            </div>
            {bidPrep.isPending && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-6 justify-center">
                <Loader2 size={14} className="animate-spin" />
                Generating cover letter draft...
              </div>
            )}
            {bidPrep.isError && (
              <p className="text-xs text-red-400">Failed to generate draft. Try again.</p>
            )}
            {bidPrep.data && (
              <>
                <textarea
                  readOnly
                  value={bidPrep.data.coverLetter}
                  className="w-full min-h-[240px] text-xs font-mono bg-zinc-900 border border-zinc-700 text-zinc-200 rounded p-3 resize-y"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(bidPrep.data!.coverLetter);
                      toast.success("Cover letter copied");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs border border-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded transition-colors"
                  >
                    <Copy size={11} /> Copy
                  </button>
                  <p className="text-[10px] text-zinc-500 self-center">Review and personalize before submitting.</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-800">
          <button
            onClick={handleDraftProposal}
            className="inline-flex items-center gap-1.5 text-xs border border-zinc-700 text-zinc-300 hover:text-white hover:border-amber-600 px-3 py-1.5 rounded transition-colors"
          >
            <FileText size={11} className="text-amber-500" />
            {showDraft ? "Back to Checklist" : "Draft Proposal"}
          </button>
          <div className="flex gap-2">
            <a
              href={opportunity.samLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded font-medium transition-colors"
            >
              Open on SAM.gov <ExternalLink size={11} />
            </a>
            <Button variant="outline" size="sm" onClick={onClose} className="border-zinc-700 text-zinc-300 text-xs">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Bid Prep Modal ─────────────────────────────────────────────────────────────
function BidPrepModal({
  opportunity,
  onClose,
}: {
  opportunity: Opportunity;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState("cover");

  const bidPrep = trpc.govContracts.bidPrep.useMutation();

  // Auto-trigger on mount
  const [triggered, setTriggered] = useState(false);
  if (!triggered) {
    setTriggered(true);
    bidPrep.mutate({
      opportunityId: opportunity.id,
      title: opportunity.title,
      agency: opportunity.agency,
      solicitationNumber: opportunity.solicitationNumber,
      naics: opportunity.naics,
      responseDeadline: opportunity.responseDeadline,
      state: opportunity.state,
      city: opportunity.city,
      setAside: opportunity.setAside,
      contactName: opportunity.contactName,
      contactEmail: opportunity.contactEmail,
      samLink: opportunity.samLink,
    });
  }

  const data = bidPrep.data;
  const isLoading = bidPrep.isPending;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  }

  function printSection(text: string, title: string) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; padding: 40px; max-width: 700px; margin: 0 auto; }
        pre { white-space: pre-wrap; font-family: inherit; }
        h2 { font-size: 16px; margin-bottom: 16px; }
      </style>
      </head><body>
      <h2>${title}</h2>
      <pre>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  const tabs = [
    { id: "cover", label: "Cover Letter", field: "coverLetter" as const },
    { id: "capability", label: "Capability Statement", field: "capabilityStatement" as const },
    { id: "pricing", label: "Pricing Worksheet", field: "pricingWorksheet" as const },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold leading-snug pr-6">
            Bid Preparation Package
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 leading-snug">
            {opportunity.title}
            {opportunity.solicitationNumber && (
              <span className="ml-1 text-zinc-500">· Sol. #{opportunity.solicitationNumber}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Opportunity summary bar */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 pb-3 border-b border-zinc-800">
          <span className="flex items-center gap-1"><Building2 size={11} />{opportunity.agency}</span>
          {(opportunity.city || opportunity.state) && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {[opportunity.city, opportunity.state].filter(Boolean).join(", ")}
            </span>
          )}
          {opportunity.responseDeadline && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              Deadline: {opportunity.responseDeadline}
            </span>
          )}
          {opportunity.setAside && (
            <span className="text-amber-500 font-medium">{opportunity.setAside}</span>
          )}
          <a
            href={opportunity.samLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-amber-500 hover:text-amber-400 ml-auto"
          >
            View on SAM.gov <ExternalLink size={10} />
          </a>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
            <Loader2 size={28} className="animate-spin text-amber-500" />
            <p className="text-sm">Generating bid package — this takes about 15 seconds...</p>
            <p className="text-xs text-zinc-500">AI is writing your capability statement and cover letter.</p>
          </div>
        )}

        {/* Error state */}
        {bidPrep.isError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
            <AlertTriangle size={15} className="shrink-0" />
            <span>Failed to generate bid package. Try again.</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto border-red-800 text-red-400"
              onClick={() => bidPrep.mutate({
                opportunityId: opportunity.id,
                title: opportunity.title,
                agency: opportunity.agency,
                solicitationNumber: opportunity.solicitationNumber,
                naics: opportunity.naics,
                responseDeadline: opportunity.responseDeadline,
                state: opportunity.state,
                city: opportunity.city,
                setAside: opportunity.setAside,
                contactName: opportunity.contactName,
                contactEmail: opportunity.contactEmail,
                samLink: opportunity.samLink,
              })}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Content tabs */}
        {data && (
          <>
            {/* Credentials bar */}
            <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-500">Company</span>
                <span className="ml-2 text-zinc-200">{data.company.companyName}</span>
              </div>
              <div>
                <span className="text-zinc-500">CAGE</span>
                <span className="ml-2 text-amber-400 font-mono">{data.company.cageCode}</span>
              </div>
              <div>
                <span className="text-zinc-500">UEI</span>
                <span className="ml-2 text-amber-400 font-mono">{data.company.uniqueEntityId}</span>
              </div>
              <div className="flex items-center gap-1 text-green-400 ml-auto">
                <CheckCircle2 size={12} />
                <span>SAM.gov Registered</span>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-zinc-900 border border-zinc-800 w-full">
                {tabs.map(t => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="flex-1 text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {tabs.map(t => (
                <TabsContent key={t.id} value={t.id} className="mt-3 space-y-2">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white"
                      onClick={() => copyToClipboard(data[t.field] as string, t.label)}
                    >
                      <Copy size={11} className="mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white"
                      onClick={() => printSection(data[t.field] as string, t.label)}
                    >
                      <Printer size={11} className="mr-1" />
                      Print
                    </Button>
                  </div>
                  <Textarea
                    value={data[t.field] as string}
                    readOnly
                    className="min-h-[280px] font-mono text-xs bg-zinc-900 border-zinc-700 text-zinc-200 resize-y"
                  />
                  {t.id === "cover" && (
                    <p className="text-[11px] text-zinc-500">
                      Review and personalize before submitting. Add your signature block if required by the solicitation.
                    </p>
                  )}
                  {t.id === "pricing" && (
                    <p className="text-[11px] text-zinc-500">
                      Fill in quantities and unit prices based on your site assessment. Do not submit pricing without reviewing the full solicitation for required CLIN structure.
                    </p>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            {/* Submission reminder */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400 space-y-1">
              <p className="font-medium text-zinc-300">Submission Reminder</p>
              <p>
                All federal bid submissions must be made through{" "}
                <a href={opportunity.samLink} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                  SAM.gov
                </a>{" "}
                or as directed in the solicitation. Log in with your SAM.gov account, navigate to the opportunity, and upload your response before the deadline.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GovContracts() {
  const [activeTab, setActiveTab] = useState<"federal" | "tn-state">("federal");
  const [naicsFilter, setNaicsFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [showAllTn, setShowAllTn] = useState(false);
  const [sortBy, setSortBy] = useState<"fit" | "deadline">("fit");
  const [checklistOpp, setChecklistOpp] = useState<Opportunity | null>(null);
  const [showBookmarked, setShowBookmarked] = useState(false);

  // Bookmarks — persisted to localStorage
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("gov-bookmarks");
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem("gov-bookmarks", JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  const { data, isLoading, isFetching, refetch } = trpc.govContracts.search.useQuery(
    { naicsFilter, stateFilter, page },
    {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    }
  );

  const rawOpportunities = data?.opportunities ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const stateCounts = (data?.stateCounts ?? {}) as Record<string, number>;
  const naicsCounts = (data?.naicsCounts ?? {}) as Record<string, number>;

  // Compute fit scores, filter bookmarks, and sort
  const opportunities = useMemo(() => {
    let scored = rawOpportunities.map(opp => ({ ...opp, fit: computeFitScore(opp) }));
    if (showBookmarked) {
      scored = scored.filter(opp => bookmarks.has(opp.id));
    }
    if (sortBy === "fit") {
      return scored.sort((a, b) => b.fit.score - a.fit.score);
    }
    return scored.sort((a, b) => {
      const dA = a.daysUntilDeadline ?? 9999;
      const dB = b.daysUntilDeadline ?? 9999;
      return dA - dB;
    });
  }, [rawOpportunities, sortBy, showBookmarked, bookmarks]);

  const handleFilterChange = () => {
    setPage(0);
  };

  const tnQuery = trpc.govContracts.tnStateContracts.useQuery(undefined, {
    enabled: activeTab === "tn-state",
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const tnBids = useMemo(() => {
    if (!tnQuery.data) return [];
    const { relevantBids, allBids } = tnQuery.data;
    if (showAllTn) return allBids;
    return relevantBids.length > 0 ? relevantBids : allBids;
  }, [tnQuery.data, showAllTn]);

  return (
    <DashboardLayout
      title="Government Contracts"
      subtitle="Active solicitations in TN, southern KY, northern AL, and AR"
    >
      <div className="space-y-6">

        {/* ── Top-level Federal / TN State tabs ── */}
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800 w-fit">
          <button
            onClick={() => setActiveTab("federal")}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              activeTab === "federal"
                ? "bg-amber-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Federal (SAM.gov)
          </button>
          <button
            onClick={() => setActiveTab("tn-state")}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              activeTab === "tn-state"
                ? "bg-amber-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            TN State
          </button>
        </div>

        {/* ── TN State tab content ── */}
        {activeTab === "tn-state" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Landmark size={18} className="text-amber-500 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Scraped from{" "}
                  <a href="https://www.tn.gov/generalservices/procurement/central-procurement-office--cpo-/supplier-information/invitations-to-bid--itb-.html" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                    TN CPO ITB
                  </a>
                  {" "}&amp;{" "}
                  <a href="https://www.tn.gov/generalservices/procurement/central-procurement-office--cpo-/supplier-information/request-for-proposals--rfp--opportunities1.html" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                    RFP
                  </a>
                  {" "}— filtered to land clearing, forestry, and vegetation keywords.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => tnQuery.refetch()}
                disabled={tnQuery.isFetching}
                className="border-zinc-700 text-zinc-300 hover:text-white shrink-0"
              >
                <RefreshCw size={13} className={tnQuery.isFetching ? "animate-spin mr-1.5" : "mr-1.5"} />
                Refresh
              </Button>
            </div>

            {/* Loading */}
            {tnQuery.isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 animate-pulse">
                    <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {tnQuery.error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
                <AlertTriangle size={15} className="shrink-0" />
                <span>TN CPO page temporarily unavailable. Try refreshing.</span>
              </div>
            )}

            {/* Results */}
            {!tnQuery.isLoading && !tnQuery.error && tnQuery.data && (
              <>
                {/* Stats bar */}
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-xs text-muted-foreground">
                    {tnQuery.data.relevantCount > 0
                      ? <><span className="text-amber-400 font-medium">{tnQuery.data.relevantCount}</span> keyword-matched bid{tnQuery.data.relevantCount !== 1 ? "s" : ""} out of {tnQuery.data.totalCount} active
                      </>
                      : <>{tnQuery.data.totalCount} active bids (no keyword matches — showing all)</>}
                  </span>
                  {tnQuery.data.relevantCount > 0 && (
                    <button
                      onClick={() => setShowAllTn(v => !v)}
                      className="text-xs text-amber-500 hover:text-amber-400 underline"
                    >
                      {showAllTn ? "Show relevant only" : `Show all ${tnQuery.data.totalCount}`}
                    </button>
                  )}
                  <span className="text-xs text-zinc-600 ml-auto">
                    Last scraped: {new Date(tnQuery.data.scrapedAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Empty */}
                {tnBids.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Landmark size={28} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No active TN state bids found.</p>
                    <p className="text-xs mt-1">Check back later or view the TN CPO portal directly.</p>
                  </div>
                )}

                {/* Bid cards */}
                {tnBids.length > 0 && (
                  <div className="space-y-3">
                    {tnBids.map((bid, idx) => {
                      const dueDate = bid.dueDate ? new Date(bid.dueDate) : null;
                      const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null;
                      return (
                        <div
                          key={`${bid.eventId}-${idx}`}
                          className={`rounded-lg border bg-zinc-900/60 p-4 transition-colors hover:bg-zinc-900 ${
                            bid.isRelevant ? "border-amber-700/50" : "border-zinc-800"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-medium text-white leading-snug">{bid.eventName}</h3>
                                {bid.isRelevant && (
                                  <Badge className="text-[10px] bg-amber-800/60 text-amber-300 border-amber-700/50 shrink-0">Relevant</Badge>
                                )}
                              </div>
                              {bid.eventId && (
                                <p className="text-[11px] text-zinc-500 mt-0.5">Event #{bid.eventId} &middot; {bid.source}</p>
                              )}
                            </div>
                            <div className="shrink-0">
                              <DeadlineBadge days={daysLeft} />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 mb-3">
                            <span className="flex items-center gap-1">
                              <Building2 size={11} className="shrink-0" />
                              {bid.agency}
                            </span>
                            {bid.startDate && (
                              <span className="flex items-center gap-1">
                                <Clock size={11} className="shrink-0" />
                                Posted {bid.startDate}
                              </span>
                            )}
                            {bid.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock size={11} className="shrink-0" />
                                Due {bid.dueDate}
                              </span>
                            )}
                          </div>

                          {bid.matchedKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {bid.matchedKeywords.slice(0, 5).map(kw => (
                                <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                            <a
                              href={`https://hub.edison.tn.gov/psc/fsprd/SUPPLIER/ERP/c/SCP_PUBLIC_MENU_FL.SCP_PUB_BID_CMP_FL.GBL?BIDID=${bid.eventId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-medium"
                            >
                              View on TN Edison
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Reference portals */}
            <div className="pt-4 border-t border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">Additional TN State Portals</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "TN CPO Invitations to Bid", url: "https://www.tn.gov/generalservices/procurement/central-procurement-office--cpo-/supplier-information/invitations-to-bid--itb-.html", note: "Full ITB listing — all active state bids" },
                  { name: "TDOT Contracts & Letting", url: "https://www.tn.gov/tdot/business-with-tdot/contracts-and-letting.html", note: "ROW clearing and vegetation management" },
                  { name: "TVA Procurement", url: "https://www.tva.com/about-tva/procurement", note: "Vegetation management and ROW contracts" },
                  { name: "GO-BID Vendor Registration", url: "https://www.gobidtn.com", note: "Free TN vendor certification — get bid notifications" },
                  { name: "TWRA Procurement", url: "https://www.tn.gov/wildlife/about-twra/procurement.html", note: "Wildlife Resources — habitat and land management" },
                  { name: "TDEC Procurement", url: "https://www.tn.gov/environment/about-tdec/tdec-procurement.html", note: "Environment & Conservation solicitations" },
                ].map(p => (
                  <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col gap-1 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      <ExternalLink size={12} className="text-zinc-500 shrink-0" />
                    </div>
                    <span className="text-xs text-zinc-500">{p.note}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Federal tab content ── */}
        {activeTab === "federal" && (
          <>
        {/* ── Header bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-amber-500 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Live feed from{" "}
              <a href="https://sam.gov" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                SAM.gov
              </a>
              {" "}— active solicitations in Tennessee, southern Kentucky, northern Alabama, and Arkansas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-zinc-700 text-zinc-300 hover:text-white shrink-0"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin mr-1.5" : "mr-1.5"} />
            Refresh
          </Button>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">State:</span>
            <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); handleFilterChange(); }}>
              <SelectTrigger className="h-8 w-[160px] text-xs border-zinc-700 bg-zinc-900">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-xs">All States{stateCounts ? ` (${Object.values(stateCounts).reduce((a, b) => a + b, 0)})` : ""}</SelectItem>
                {[
                  { code: "TN", label: "Tennessee" },
                  { code: "KY", label: "Kentucky (S.)" },
                  { code: "AL", label: "Alabama (N.)" },
                  { code: "AR", label: "Arkansas" },
                ].map(({ code, label }) => (
                  <SelectItem key={code} value={code} className="text-xs">
                    {label}{stateCounts[code] ? ` (${stateCounts[code]})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">NAICS:</span>
            <Select value={naicsFilter} onValueChange={(v) => { setNaicsFilter(v); handleFilterChange(); }}>
              <SelectTrigger className="h-8 w-[240px] text-xs border-zinc-700 bg-zinc-900">
                <SelectValue placeholder="All NAICS codes" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-xs">All NAICS codes</SelectItem>
                {Object.entries(NAICS_LABELS).map(([code, label]) => (
                  <SelectItem key={code} value={code} className="text-xs">
                    {code} — {label}{naicsCounts[code] ? ` (${naicsCounts[code]})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {bookmarks.size > 0 && (
              <button
                onClick={() => setShowBookmarked(v => !v)}
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded border transition-colors ${
                  showBookmarked
                    ? "border-amber-600 bg-amber-600/20 text-amber-400"
                    : "border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 bg-zinc-900"
                }`}
              >
                <Star size={11} className={showBookmarked ? "fill-amber-400" : ""} />
                Saved ({bookmarks.size})
              </button>
            )}
            <button
              onClick={() => setSortBy(s => s === "fit" ? "deadline" : "fit")}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors bg-zinc-900"
            >
              <ArrowUpDown size={11} />
              Sort: {sortBy === "fit" ? "Best Fit" : "Deadline"}
            </button>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                {showBookmarked ? `${opportunities.length} saved` : `${totalCount} opportunit${totalCount === 1 ? "y" : "ies"}`}
              </span>
            )}
          </div>
        </div>

        {/* ── Error state ── */}
        {(data as any)?.error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
            <AlertTriangle size={15} className="shrink-0" />
            <span>SAM.gov is temporarily unavailable: {String((data as any).error)}. Try refreshing in a moment.</span>
          </div>
        )}

        {/* ── Loading state ── */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-800 rounded w-1/2 mb-3" />
                <div className="flex gap-2">
                  <div className="h-5 bg-zinc-800 rounded w-20" />
                  <div className="h-5 bg-zinc-800 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && !(data as any)?.error && opportunities.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Landmark size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No active opportunities found for the selected filters.</p>
            <p className="text-xs mt-1">Try broadening the NAICS or state filter, or check back later.</p>
          </div>
        )}

        {/* ── Opportunity cards ── */}
        {!isLoading && opportunities.length > 0 && (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className={`rounded-lg border bg-zinc-900/60 p-4 transition-colors hover:bg-zinc-900 ${
                  opp.isUrgent
                    ? "border-amber-700/60"
                    : opp.isExpired
                    ? "border-zinc-800 opacity-60"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <FitBadge tier={opp.fit.tier} score={opp.fit.score} />
                    </div>
                    <h3 className="text-sm font-medium text-white leading-snug">{opp.title}</h3>
                    {opp.solicitationNumber && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">Sol. #{opp.solicitationNumber}</p>
                    )}
                    {opp.fit.reasons.length > 0 && (
                      <p className="text-[10px] text-zinc-500 mt-0.5">{opp.fit.reasons.join(" · ")}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => toggleBookmark(opp.id)}
                      title={bookmarks.has(opp.id) ? "Remove from saved" : "Save for later"}
                      className={`p-1 rounded transition-colors ${
                        bookmarks.has(opp.id)
                          ? "text-amber-400 hover:text-amber-300"
                          : "text-zinc-600 hover:text-zinc-300"
                      }`}
                    >
                      <Star size={14} className={bookmarks.has(opp.id) ? "fill-amber-400" : ""} />
                    </button>
                    <DeadlineBadge days={opp.daysUntilDeadline} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Building2 size={11} className="shrink-0" />
                    {opp.agency}
                  </span>
                  {(opp.state || opp.city) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="shrink-0" />
                      {[opp.city, opp.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {opp.postedDate && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="shrink-0" />
                      Posted {opp.postedDate}
                    </span>
                  )}
                  {opp.responseDeadline && (
                    <span>Deadline: {opp.responseDeadline}</span>
                  )}
                  {opp.type && (
                    <span className="text-zinc-500">{opp.type}</span>
                  )}
                  {opp.setAside && (
                    <span className="text-amber-600 font-medium">{opp.setAside}</span>
                  )}
                </div>

                {opp.naics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {opp.naics.map(n => (
                      <NaicsBadge key={n.code} code={n.code} />
                    ))}
                  </div>
                )}

                {(opp.contactName || opp.contactEmail || opp.contactPhone) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 mb-3">
                    {opp.contactName && <span>{opp.contactName}</span>}
                    {opp.contactEmail && (
                      <a href={`mailto:${opp.contactEmail}`} className="flex items-center gap-1 hover:text-amber-400">
                        <Mail size={10} />{opp.contactEmail}
                      </a>
                    )}
                    {opp.contactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} />{opp.contactPhone}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={opp.samLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium px-3 py-1.5 rounded border border-zinc-700 transition-colors"
                  >
                    <ExternalLink size={11} />
                    Open on SAM.gov
                  </a>
                  {!opp.isExpired && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white"
                      onClick={() => setSelectedOpp(opp)}
                    >
                      <FileText size={11} className="mr-1.5" />
                      Prepare Bid
                    </Button>
                  )}
                  {!opp.isExpired && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white"
                      onClick={() => setChecklistOpp(opp)}
                    >
                      <ClipboardList size={11} className="mr-1.5" />
                      Checklist
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border-zinc-700 text-zinc-300"
            >
              <ChevronLeft size={14} className="mr-1" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="border-zinc-700 text-zinc-300"
            >
              Next
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        )}

        {/* ── State & Municipal Portals ── */}
        <div className="pt-4 border-t border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">State &amp; Municipal Portals</h2>
          <p className="text-xs text-muted-foreground mb-4">
            State and county contracts are not on SAM.gov. Check these portals directly for
            TN eProcurement, TDOT right-of-way work, and TVA vegetation management contracts.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STATE_PORTALS.map(portal => (
              <a
                key={portal.name}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{portal.name}</span>
                  <ExternalLink size={12} className="text-zinc-500 shrink-0" />
                </div>
                <span className="text-xs text-zinc-500">{portal.note}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── SAM.gov registration note ── */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-400 space-y-1">
          <p className="font-medium text-zinc-300">SAM.gov Registration</p>
          <p>
            Active SAM.gov registration confirmed — CAGE Code{" "}
            <span className="text-amber-400 font-mono">17VJ2</span>, UEI{" "}
            <span className="text-amber-400 font-mono">G6E8E4SDM2K4</span>.
            These are pre-filled in every bid package generated by this tool.
          </p>
        </div>
          </>
        )}

      </div>

      {/* ── Bid Prep Modal ── */}
      {selectedOpp && (
        <BidPrepModal
          opportunity={selectedOpp}
          onClose={() => setSelectedOpp(null)}
        />
      )}

      {/* ── Pre-Submission Checklist Modal ── */}
      {checklistOpp && (
        <PreSubmissionChecklist
          opportunity={checklistOpp}
          onClose={() => setChecklistOpp(null)}
        />
      )}
    </DashboardLayout>
  );
}
