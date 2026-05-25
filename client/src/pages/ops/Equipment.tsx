/**
 * Equipment Diagnostics — AI-powered equipment photo analysis
 * Upload a photo of your equipment and get an instant diagnostic report.
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/OpsDashboardLayout";
import { toast } from "sonner";
import {
  Upload,
  Camera,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  X,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Streamdown } from "streamdown";

const URGENCY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  low:      { color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/20",  icon: CheckCircle2 },
  medium:   { color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/20",  icon: AlertTriangle },
  high:     { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20", icon: AlertTriangle },
  critical: { color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/20",    icon: XCircle },
};

function detectUrgency(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("critical")) return "critical";
  if (lower.includes("high")) return "high";
  if (lower.includes("medium")) return "medium";
  return "low";
}

export default function Equipment() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<{ analysis: string; imageUrl: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyze = trpc.maintenance.analyzeDiagnostics.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("Diagnostic complete.");
    },
    onError: (err) => {
      toast.error(`Diagnostic failed: ${err.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Image must be under 16 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageDataUrl(ev.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file.");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Image must be under 16 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageDataUrl(ev.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = () => {
    if (!imageDataUrl) return;
    analyze.mutate({ imageDataUrl, description: description.trim() || undefined });
  };

  const handleClear = () => {
    setImageDataUrl(null);
    setResult(null);
    setDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const urgency = result ? detectUrgency(result.analysis) : null;
  const UrgencyConfig = urgency ? URGENCY_CONFIG[urgency] : null;
  const UrgencyIcon = UrgencyConfig?.icon ?? Info;

  return (
    <DashboardLayout title="Equipment Diagnostics" subtitle="AI-powered equipment analysis — upload a photo to get a field diagnostic report">
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Upload card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Upload Equipment Photo</h2>
          </div>

          {/* Drop zone */}
          {!imageDataUrl ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Drop a photo here or click to browse</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, HEIC — max 16 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={imageDataUrl}
                  alt="Equipment preview"
                  className="w-full max-h-80 object-contain bg-black/20"
                />
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md transition-colors"
                  title="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Optional description */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Additional context (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Hydraulic fluid leak near the mulcher head, noticed after 3 hours of operation..."
                  rows={3}
                  className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={analyze.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyze.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Run Diagnostic
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Result card */}
        {result && UrgencyConfig && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Urgency banner */}
            <div className={`flex items-center gap-2.5 px-5 py-3 ${UrgencyConfig.bg} border-b ${UrgencyConfig.border}`}>
              <UrgencyIcon className={`w-4 h-4 shrink-0 ${UrgencyConfig.color}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${UrgencyConfig.color}`}>
                {urgency === "low" ? "No Immediate Action Required" :
                 urgency === "medium" ? "Monitor — Schedule Maintenance" :
                 urgency === "high" ? "Action Recommended Soon" :
                 "Critical — Address Immediately"}
              </span>
            </div>

            {/* Analysis content */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Diagnostic Report</h3>
              </div>
              <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/90 leading-relaxed">
                <Streamdown>{result.analysis}</Streamdown>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border border-border text-foreground/80 rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                New Diagnostic
              </button>
              <button
                onClick={() => {
                  const text = `Equipment Diagnostic Report\n\n${result.analysis}`;
                  navigator.clipboard.writeText(text);
                  toast.success("Report copied to clipboard.");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border border-border text-foreground/80 rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
              >
                Copy Report
              </button>
            </div>
          </div>
        )}

        {/* How it works */}
        {!result && !imageDataUrl && (
          <div className="bg-card border border-border rounded-xl p-6">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">How this works</span>
              </div>
              {historyOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {historyOpen && (
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>
                  Upload a clear photo of any equipment component — the mulcher head, hydraulic lines, track system, engine bay, cutting teeth, or anything that looks off. The AI analyzes the image and returns a plain-language diagnostic report covering what it sees, any visible issues, recommended actions, and an urgency level.
                </p>
                <p>
                  Best results come from close-up, well-lit photos. If you have context to add (noise you heard, fluid you noticed, how long the issue has been present), include it in the description field.
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  This tool is a field reference aid — not a substitute for a qualified mechanic on critical issues.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
