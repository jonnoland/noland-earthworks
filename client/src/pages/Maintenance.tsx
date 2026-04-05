import { useRef, useState } from "react";
import { ExternalLink, Wrench, Cpu, ClipboardList, AlertTriangle, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

const FIELDFIX_URL = "https://fieldfixai-z4rezyau.manus.space/maintenance";

const URGENCY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

function getUrgencyColor(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("critical")) return URGENCY_COLORS.critical;
  if (lower.includes("high")) return URGENCY_COLORS.high;
  if (lower.includes("medium")) return URGENCY_COLORS.medium;
  return URGENCY_COLORS.low;
}

export default function Maintenance() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [urgencyColor, setUrgencyColor] = useState<string>("#D4A017");

  const analyzeMutation = trpc.maintenance.analyzeDiagnostics.useMutation({
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      setUrgencyColor(getUrgencyColor(data.analysis));
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // 16 MB limit
    if (file.size > 16 * 1024 * 1024) {
      alert("Image must be under 16 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  }

  function handleClearImage() {
    setImageDataUrl(null);
    setAnalysis(null);
    setDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAnalyze() {
    if (!imageDataUrl) return;
    analyzeMutation.mutate({ imageDataUrl, description: description || undefined });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />

      <main className="flex-1 flex flex-col items-center px-4 py-24">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{ backgroundColor: "#1E1E1E", border: "1px solid #2A2A2A" }}
          >
            <Wrench className="w-8 h-8" style={{ color: "#D4A017" }} />
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{ color: "#F0EDE6" }}>
            Equipment Maintenance
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: "#9CA3AF" }}>
            Track equipment health, log maintenance records, and get AI-powered diagnostics
            for Noland Earthworks machinery — all in one place.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mx-auto mb-10">
          {/* Maintenance Logs */}
          <div
            className="rounded-xl p-5 flex flex-col gap-2"
            style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A" }}
          >
            <ClipboardList className="w-5 h-5" style={{ color: "#D4A017" }} />
            <p className="font-semibold text-sm" style={{ color: "#F0EDE6" }}>Maintenance Logs</p>
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
              Record service history, oil changes, and repairs for every piece of equipment.
            </p>
          </div>

          {/* AI Diagnostics — enhanced */}
          <div
            className="rounded-xl p-5 flex flex-col gap-3 sm:col-span-1"
            style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A" }}
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 flex-shrink-0" style={{ color: "#D4A017" }} />
              <p className="font-semibold text-sm" style={{ color: "#F0EDE6" }}>AI Diagnostics</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
              Upload a photo of your equipment and get instant AI-powered troubleshooting guidance.
            </p>

            {/* Upload area */}
            {!imageDataUrl ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 py-4 px-3 transition-colors cursor-pointer"
                style={{ borderColor: "#3A3A3A", color: "#6B7280" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#D4A017")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#3A3A3A")}
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs text-center">Click to upload image<br />(JPG, PNG, WEBP — max 16 MB)</span>
              </button>
            ) : (
              <div className="relative mt-1">
                <img
                  src={imageDataUrl}
                  alt="Equipment upload preview"
                  className="w-full rounded-lg object-cover"
                  style={{ maxHeight: "140px" }}
                />
                <button
                  onClick={handleClearImage}
                  className="absolute top-1 right-1 rounded-full p-1"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#F0EDE6" }}
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {imageDataUrl && (
              <>
                <Textarea
                  placeholder="Optional: describe the issue (e.g. 'leaking fluid near left track')"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="text-xs resize-none"
                  rows={2}
                  style={{ backgroundColor: "#111", borderColor: "#2A2A2A", color: "#F0EDE6" }}
                />
                <Button
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="w-full gap-2 text-xs font-semibold"
                  style={{ backgroundColor: "#D4A017", color: "#121212" }}
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3 h-3" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </>
            )}

            {analyzeMutation.isError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>
                Analysis failed. Please try again.
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Service Alerts */}
          <div
            className="rounded-xl p-5 flex flex-col gap-2"
            style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A" }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: "#D4A017" }} />
            <p className="font-semibold text-sm" style={{ color: "#F0EDE6" }}>Service Alerts</p>
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
              Get notified when equipment is due for scheduled maintenance.
            </p>
          </div>
        </div>

        {/* Analysis result */}
        {analysis && (
          <div
            className="max-w-3xl w-full mx-auto mb-10 rounded-xl p-6"
            style={{ backgroundColor: "#1A1A1A", border: `1px solid ${urgencyColor}40` }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: urgencyColor }} />
              <h2 className="font-semibold text-sm" style={{ color: "#F0EDE6" }}>
                AI Diagnostic Report
              </h2>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed" style={{ color: "#D1D5DB" }}>
              <Streamdown>{analysis}</Streamdown>
            </div>
          </div>
        )}

        {/* FieldFix CTA */}
        <a href={FIELDFIX_URL} target="_blank" rel="noopener noreferrer">
          <Button
            size="lg"
            className="gap-2 text-base font-semibold px-8 py-6 rounded-xl"
            style={{ backgroundColor: "#D4A017", color: "#121212" }}
          >
            Open FieldFix AI
            <ExternalLink className="w-5 h-5" />
          </Button>
        </a>
        <p className="mt-3 text-xs" style={{ color: "#6B7280" }}>
          Opens in a new tab — login with your Manus account
        </p>
      </main>

      <Footer />
    </div>
  );
}
