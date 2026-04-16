import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { MessageSquare, X, Send, Phone, ChevronDown } from "lucide-react";
import { toast } from "sonner";

type Step = "idle" | "open" | "sent";

export default function SMSWidget() {
  const [step, setStep] = useState<Step>("idle");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const send = trpc.widget.sendMessage.useMutation({
    onSuccess: () => {
      setStep("sent");
      setName("");
      setPhone("");
      setMessage("");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to send. Please call us directly.");
    },
  });

  // Close on outside click
  useEffect(() => {
    if (step !== "open") return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setStep("idle");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [step]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    send.mutate({ name: name.trim(), phone: phone.trim(), message: message.trim() });
  };

  // Don't render on /ops routes
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/ops")) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" ref={panelRef}>

      {/* ── Panel ── */}
      {step !== "idle" && (
        <div
          className="w-[340px] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          style={{ background: "#111111" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: "#B8730A" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">Noland Earthworks</p>
                <p className="text-white/75 text-[11px] leading-tight">Text us a quick question</p>
              </div>
            </div>
            <button
              onClick={() => setStep("idle")}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
              aria-label="Close"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          {step === "sent" ? (
            <div className="px-5 py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                <Send className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-white font-semibold text-sm">Message sent.</p>
              <p className="text-white/50 text-xs leading-relaxed">
                Jon will get back to you shortly. For urgent jobs, call{" "}
                <a href="tel:+16154064819" className="text-[#B8730A] hover:underline font-medium">
                  (615) 406-4819
                </a>.
              </p>
              <button
                onClick={() => setStep("open")}
                className="mt-2 text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
              <p className="text-white/50 text-xs leading-relaxed">
                Send a quick text and Jon will respond as soon as possible — usually same day.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8730A]/60 focus:bg-white/8 transition-colors"
                  maxLength={80}
                />
                <input
                  type="tel"
                  placeholder="Your phone number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8730A]/60 focus:bg-white/8 transition-colors"
                  maxLength={20}
                />
                <textarea
                  placeholder="What can we help you with?"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8730A]/60 focus:bg-white/8 transition-colors resize-none"
                  maxLength={320}
                />
              </div>
              <button
                type="submit"
                disabled={send.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: "#B8730A" }}
              >
                {send.isPending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {send.isPending ? "Sending..." : "Send Message"}
              </button>
              <p className="text-white/25 text-[10px] text-center leading-relaxed">
                By sending, you agree to receive a reply via SMS. Standard rates may apply.
              </p>
            </form>
          )}
        </div>
      )}

      {/* ── Floating Button ── */}
      <button
        onClick={() => setStep(s => s === "idle" ? "open" : "idle")}
        aria-label="Text us a question"
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative"
        style={{ background: "#B8730A" }}
      >
        {step !== "idle" ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6 text-white" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "#B8730A" }} />
          </>
        )}
      </button>

    </div>
  );
}
