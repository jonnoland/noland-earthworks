/**
 * Resources — Brushworks operator resource library
 * 46 documents organized by category: Templates, Contracts, Marketing, Sales, Operations
 */
import { useState } from "react";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, ExternalLink, BookOpen, FileText, Megaphone, TrendingUp, Wrench } from "lucide-react";

type Category = "all" | "templates" | "contracts" | "marketing" | "sales" | "operations";

interface Resource {
  title: string;
  description: string;
  category: Exclude<Category, "all">;
  size: string;
  url: string;
  fileType?: "pdf" | "psd" | "jpg" | "video";
}

const RESOURCES: Resource[] = [
  // Templates
  {
    title: "Google Review Link Generator",
    description: "Create direct links for easy customer reviews",
    category: "templates",
    size: "330 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/google-review-link-generator.pdf",
  },
  {
    title: "Hourly Operating Cost Calculator",
    description: "Know your real equipment costs per hour",
    category: "templates",
    size: "469 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/hourly-operating-cost-calculator.pdf",
  },
  {
    title: "Job Profitability Calculator",
    description: "Calculate true profit margins on every job",
    category: "templates",
    size: "411 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/job-profitability-calculator.pdf",
  },
  {
    title: "Property Assessment Form",
    description: "Document property conditions before starting work",
    category: "templates",
    size: "432 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/property-assessment-form.pdf",
  },
  // Contracts / Business Setup
  {
    title: "Bookkeeping Setup Guide",
    description: "Get your books organized from day one",
    category: "contracts",
    size: "349 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/bookkeeping-setup-guide.pdf",
  },
  {
    title: "Business Bank Account Setup Guide",
    description: "Set up proper business banking",
    category: "contracts",
    size: "334 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/business-bank-account-setup-guide.pdf",
  },
  {
    title: "Business Insurance Guide",
    description: "Get the right insurance coverage",
    category: "contracts",
    size: "494 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/business-insurance-guide.pdf",
  },
  {
    title: "CRM Setup Guide",
    description: "Organize leads and customers in a CRM",
    category: "contracts",
    size: "337 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/crm-setup-guide.pdf",
  },
  {
    title: "Equipment Financing Guide",
    description: "Finance equipment the smart way",
    category: "contracts",
    size: "408 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/equipment-financing-guide.pdf",
  },
  {
    title: "Government Contracting Guide",
    description: "Win government and municipal contracts",
    category: "contracts",
    size: "350 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/government-contracting-guide.pdf",
  },
  {
    title: "LLC Formation Guide",
    description: "Step-by-step LLC formation process",
    category: "contracts",
    size: "421 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/llc-formation-guide.pdf",
  },
  {
    title: "Payroll Setup Guide",
    description: "Set up payroll for your team",
    category: "contracts",
    size: "354 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/payroll-setup-guide.pdf",
  },
  {
    title: "SAM.gov Registration Guide",
    description: "Register for federal contracting opportunities",
    category: "contracts",
    size: "349 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/sam.gov-registration-guide.pdf",
  },
  // Marketing
  {
    title: "Content Creation Basics Guide",
    description: "Create engaging content that attracts customers",
    category: "marketing",
    size: "359 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/content-creation-basics-guide.pdf",
  },
  {
    title: "Direct Mail Campaign Guide",
    description: "Launch targeted direct mail campaigns",
    category: "marketing",
    size: "400 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/direct-mail-campaign-guide.pdf",
  },
  {
    title: "Facebook Ads Setup Guide",
    description: "Set up effective Facebook advertising",
    category: "marketing",
    size: "554 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/facebook-ads-setup-guide.pdf",
  },
  {
    title: "Facebook Business Page Setup Guide",
    description: "Create a professional business presence on Facebook",
    category: "marketing",
    size: "351 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/facebook-business-page-setup-guide.pdf",
  },
  {
    title: "Facebook Lookalike Audience Guide",
    description: "Target prospects similar to your best customers",
    category: "marketing",
    size: "392 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/facebook-lookalike-audience-guide.pdf",
  },
  {
    title: "Google Ads Setup Guide",
    description: "Launch your first Google Ads campaign",
    category: "marketing",
    size: "406 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/google-ads-setup-guide.pdf",
  },
  {
    title: "Google Business Profile Setup Guide",
    description: "Optimize your Google Business listing",
    category: "marketing",
    size: "461 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/google-business-profile-setup-guide.pdf",
  },
  {
    title: "Postcard Template — Front (PDF)",
    description: "Print-ready front design for direct mail postcards",
    category: "marketing",
    size: "22.8 MB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/direct-mail/postcardfront.pdf",
    fileType: "pdf",
  },
  {
    title: "Postcard Template — Front (PSD Editable)",
    description: "Fully editable Photoshop file for the front postcard design",
    category: "marketing",
    size: "26.3 MB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/direct-mail/postcardfront.psd",
    fileType: "psd",
  },
  {
    title: "Postcard Template — Back (PDF)",
    description: "Print-ready back design for direct mail postcards",
    category: "marketing",
    size: "25.1 MB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/direct-mail/postcardback.pdf",
    fileType: "pdf",
  },
  {
    title: "Postcard Template — Back (PSD Editable)",
    description: "Fully editable Photoshop file for the back postcard design",
    category: "marketing",
    size: "28.5 MB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/direct-mail/postcardback.psd",
    fileType: "psd",
  },
  {
    title: "Yard Sign Color Guide",
    description: "Color picker reference for yard sign printing",
    category: "marketing",
    size: "129 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/yard-signs/yard-sign-colors.jpg",
    fileType: "jpg",
  },
  {
    title: "Yard Sign Design Guide",
    description: "Design principles, sizing, ordering, and placement strategy",
    category: "marketing",
    size: "350 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/yard-signs/yard-sign-design-guide.pdf",
  },
  {
    title: "Yard Sign Design Template",
    description: "Ready-to-customize yard sign template",
    category: "marketing",
    size: "77 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/yard-signs/yard-sign-template.pdf",
  },
  // Sales
  {
    title: "Add-On Services & Volume Pricing Guide",
    description: "Grapple work, power raking pricing and scripts, plus volume discount tiers",
    category: "sales",
    size: "567 KB",
    url: "https://files.catbox.moe/hlegwl.pdf",
  },
  {
    title: "Discovery Call Script",
    description: "Qualify leads and set expectations on the first call",
    category: "sales",
    size: "387 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/discovery-call-script.pdf",
  },
  {
    title: "Follow-Up Automation Guide",
    description: "Automate your follow-up sequence",
    category: "sales",
    size: "479 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/follow-up-automation-guide.pdf",
  },
  {
    title: "Google Earth Satellite Quoting Guide",
    description: "Quote jobs remotely using satellite imagery",
    category: "sales",
    size: "468 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/google-earth-satellite-quoting-guide.pdf",
  },
  {
    title: "GPT Pricing Expert Guide",
    description: "Build a custom ChatGPT that generates accurate quotes using your exact pricing",
    category: "sales",
    size: "508 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/pdfs/gpt-pricing-expert-guide.pdf",
  },
  {
    title: "LandGlide Property Quoting Guide",
    description: "Quote jobs using the LandGlide app for property boundaries and parcel data",
    category: "sales",
    size: "611 KB",
    url: "https://files.catbox.moe/2vrleb.pdf",
  },
  {
    title: "Plaud Notepin Template Guide",
    description: "Custom AI template that turns on-site quote recordings into structured CRM notes",
    category: "sales",
    size: "428 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/pdfs/plaud-notepin-template-guide.pdf",
  },
  {
    title: "Price Objection Scripts",
    description: "Word-for-word responses to common price objections that close more deals",
    category: "sales",
    size: "585 KB",
    url: "https://files.catbox.moe/cm2vl1.pdf",
  },
  {
    title: "Review Generation Guide",
    description: "Build your review count systematically",
    category: "sales",
    size: "460 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/review-generation-guide.pdf",
  },
  {
    title: "Speed-to-Lead Guide",
    description: "Respond faster and close more deals",
    category: "sales",
    size: "473 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/speed-to-lead-guide.pdf",
  },
  {
    title: "Text Message Templates",
    description: "Quick response templates for lead follow-up",
    category: "sales",
    size: "495 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/text-message-templates.pdf",
  },
  {
    title: "Value Comparison Sheet",
    description: "Side-by-side cost comparison: forestry mulching vs bulldozer, hand clearing, burning, and DIY",
    category: "sales",
    size: "631 KB",
    url: "https://files.catbox.moe/hinvj7.pdf",
  },
  {
    title: "Voicemail Scripts",
    description: "Professional voicemail templates that get callbacks",
    category: "sales",
    size: "360 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/voicemail-scripts.pdf",
  },
  // Operations
  {
    title: "811 Utility Locating Guide",
    description: "How to properly mark and avoid underground utilities",
    category: "operations",
    size: "429 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/811-utility-locating-guide.pdf",
  },
  {
    title: "Emergency Procedures Guide",
    description: "Step-by-step emergency response protocols for job sites",
    category: "operations",
    size: "536 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/emergency-procedures-guide.pdf",
  },
  {
    title: "Job Completion Checklist",
    description: "Ensure every job is completed to standard",
    category: "operations",
    size: "418 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/job-completion-checklist.pdf",
  },
  {
    title: "Job Site Safety Walk Checklist",
    description: "Pre-job safety assessment for every work site",
    category: "operations",
    size: "358 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/job-site-safety-walk-checklist.pdf",
  },
  {
    title: "Machine Selection Deep Dive (Video)",
    description: "Key considerations when choosing your first forestry mulching machine",
    category: "operations",
    size: "YouTube",
    url: "https://www.youtube.com/watch?v=kH_uwfhc384",
    fileType: "video",
  },
  {
    title: "Pre-Trip Inspection Checklist",
    description: "DOT-compliant inspection checklist for trucks and trailers",
    category: "operations",
    size: "333 KB",
    url: "https://wihtakgsyucdxydcubfa.supabase.co/storage/v1/object/public/resources/pre-trip-inspection-checklist.pdf",
  },
];

const CATEGORY_FILTERS: { value: Category; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "all",        label: "All",        icon: BookOpen },
  { value: "templates",  label: "Templates",  icon: FileText },
  { value: "contracts",  label: "Contracts",  icon: FileText },
  { value: "marketing",  label: "Marketing",  icon: Megaphone },
  { value: "sales",      label: "Sales",      icon: TrendingUp },
  { value: "operations", label: "Operations", icon: Wrench },
];

const CATEGORY_COLORS: Record<Exclude<Category, "all">, string> = {
  templates:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contracts:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  marketing:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  sales:      "bg-green-500/15 text-green-400 border-green-500/30",
  operations: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const FILE_TYPE_BADGE: Record<string, string> = {
  psd:   "PSD",
  jpg:   "JPG",
  video: "VIDEO",
};

function ResourceCard({ resource }: { resource: Resource }) {
  const handleOpen = () => {
    window.open(resource.url, "_blank", "noopener,noreferrer");
  };

  const isVideo = resource.fileType === "video";
  const fileLabel = resource.fileType ? FILE_TYPE_BADGE[resource.fileType] ?? "PDF" : "PDF";

  return (
    <div className="group relative flex flex-col bg-[#1a1a1a] border border-white/8 rounded-lg p-4 hover:border-orange-500/40 hover:bg-[#1e1e1e] transition-all duration-150">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${CATEGORY_COLORS[resource.category]}`}>
            {resource.category}
          </span>
          {resource.fileType && resource.fileType !== "pdf" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-white/5 text-white/50 border-white/10">
              {fileLabel}
            </span>
          )}
        </div>
        <span className="text-[11px] text-white/30 shrink-0">{resource.size}</span>
      </div>

      {/* Title & description */}
      <h3 className="text-sm font-semibold text-white/90 leading-snug mb-1">{resource.title}</h3>
      <p className="text-xs text-white/45 leading-relaxed flex-1 mb-4">{resource.description}</p>

      {/* Download / Open button */}
      <Button
        size="sm"
        onClick={handleOpen}
        className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium h-8 gap-1.5"
      >
        {isVideo ? (
          <><ExternalLink className="w-3.5 h-3.5" /> Watch Video</>
        ) : (
          <><Download className="w-3.5 h-3.5" /> Download</>
        )}
      </Button>
    </div>
  );
}

export default function Resources() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");

  const filtered = RESOURCES.filter((r) => {
    const matchCat = activeCategory === "all" || r.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const counts: Record<Category, number> = {
    all:        RESOURCES.length,
    templates:  RESOURCES.filter(r => r.category === "templates").length,
    contracts:  RESOURCES.filter(r => r.category === "contracts").length,
    marketing:  RESOURCES.filter(r => r.category === "marketing").length,
    sales:      RESOURCES.filter(r => r.category === "sales").length,
    operations: RESOURCES.filter(r => r.category === "operations").length,
  };

  return (
    <OpsDashboardLayout title="Resources" subtitle="Brushworks operator library — templates, guides, and field tools">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setActiveCategory(value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeCategory === value
                  ? "bg-orange-600 text-white"
                  : "bg-[#1a1a1a] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20"
              }`}
            >
              {label}
              <span className={`ml-1.5 text-[10px] ${activeCategory === value ? "text-orange-200" : "text-white/30"}`}>
                {counts[value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-white/30 mb-4">
        {filtered.length} {filtered.length === 1 ? "resource" : "resources"} {search ? `matching "${search}"` : ""}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((resource) => (
            <ResourceCard key={resource.url} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-10 h-10 text-white/15 mb-3" />
          <p className="text-sm text-white/40">No resources match your search.</p>
          <button
            onClick={() => { setSearch(""); setActiveCategory("all"); }}
            className="mt-3 text-xs text-orange-400 hover:text-orange-300 underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </OpsDashboardLayout>
  );
}
