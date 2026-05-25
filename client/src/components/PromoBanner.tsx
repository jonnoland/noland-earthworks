/**
 * PromoBanner — site-wide promotional announcement bar.
 * Fetches banner config from the server (set in /ops/settings).
 * Renders above the Navbar when enabled; hidden when disabled or text is empty.
 */
import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";
import { useState } from "react";

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; close: string }> = {
  orange: {
    bg: "rgba(224,123,42,0.12)",
    border: "rgba(224,123,42,0.35)",
    text: "#E07B2A",
    close: "rgba(224,123,42,0.6)",
  },
  green: {
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.3)",
    text: "#16a34a",
    close: "rgba(34,197,94,0.6)",
  },
  blue: {
    bg: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.3)",
    text: "#2563eb",
    close: "rgba(59,130,246,0.6)",
  },
  red: {
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.3)",
    text: "#dc2626",
    close: "rgba(239,68,68,0.6)",
  },
};

export default function PromoBanner() {
  const { data } = trpc.siteConfig.getPromoBanner.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5-minute client cache
    refetchOnWindowFocus: false,
  });

  const [dismissed, setDismissed] = useState(false);

  if (!data?.enabled || !data.text?.trim() || dismissed) return null;

  const colors = COLOR_MAP[data.color] ?? COLOR_MAP.orange;

  return (
    <div
      role="banner"
      aria-label="Promotional announcement"
      style={{
        backgroundColor: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        padding: "0.55rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        position: "relative",
        zIndex: 60,
      }}
    >
      <p
        style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: colors.text,
          margin: 0,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {data.text}
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: colors.close,
          padding: "0.15rem",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = colors.text)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = colors.close)}
      >
        <X size={14} />
      </button>
    </div>
  );
}
