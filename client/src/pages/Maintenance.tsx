import { ExternalLink, Wrench, Cpu, ClipboardList, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FIELDFIX_URL = "https://fieldfixai-z4rezyau.manus.space/maintenance";

export default function Maintenance() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mx-auto mb-10">
          {[
            {
              icon: <ClipboardList className="w-5 h-5" style={{ color: "#D4A017" }} />,
              title: "Maintenance Logs",
              desc: "Record service history, oil changes, and repairs for every piece of equipment.",
            },
            {
              icon: <Cpu className="w-5 h-5" style={{ color: "#D4A017" }} />,
              title: "AI Diagnostics",
              desc: "Describe a symptom and get instant AI-powered troubleshooting guidance.",
            },
            {
              icon: <AlertTriangle className="w-5 h-5" style={{ color: "#D4A017" }} />,
              title: "Service Alerts",
              desc: "Get notified when equipment is due for scheduled maintenance.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl p-5 flex flex-col gap-2"
              style={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A" }}
            >
              {card.icon}
              <p className="font-semibold text-sm" style={{ color: "#F0EDE6" }}>{card.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{card.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
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
