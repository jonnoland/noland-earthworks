/**
 * NetworkBanner — Slim status bar that slides in from the top when the device
 * goes offline and dismisses automatically when connectivity is restored.
 *
 * Uses @capacitor/network via the useNetwork hook.
 * Rendered once in AppShell (App.tsx) so it overlays all pages.
 */
import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";

export default function NetworkBanner() {
  const { isOnline } = useNetwork();
  const [visible, setVisible] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [prevOnline, setPrevOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip the very first render (don't flash "offline" on load)
    if (prevOnline === null) {
      setPrevOnline(isOnline);
      return;
    }

    if (!isOnline) {
      // Went offline — show the offline banner
      setShowRestored(false);
      setVisible(true);
    } else if (prevOnline === false && isOnline) {
      // Just came back online — briefly show "restored" then hide
      setShowRestored(true);
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(t);
    }

    setPrevOnline(isOnline);
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const bgColor = showRestored
    ? "oklch(0.35 0.12 145)"   // green tint for restored
    : "oklch(0.30 0.08 25)";   // red-brown tint for offline

  const textColor = showRestored
    ? "oklch(0.85 0.15 145)"
    : "oklch(0.90 0.08 25)";

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderBottom: `1px solid ${showRestored ? "oklch(0.45 0.15 145)" : "oklch(0.40 0.10 25)"}`,
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        animation: "slide-down 0.25s ease",
      }}
    >
      {showRestored ? (
        <Wifi size={14} color={textColor} />
      ) : (
        <WifiOff size={14} color={textColor} />
      )}
      <span
        style={{
          color: textColor,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {showRestored
          ? "Connection restored"
          : "No internet connection — working offline"}
      </span>

      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
