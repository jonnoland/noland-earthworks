/**
 * SplashScreen — In-app loading screen shown while the auth token is being
 * read from Capacitor Preferences. Displays the Noland Field logo with a
 * smooth pulse animation and a progress indicator.
 */
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [opacity, setOpacity] = useState(0);
  const [dotIndex, setDotIndex] = useState(0);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setOpacity(1), 50);
    return () => clearTimeout(t);
  }, []);

  // Animated loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotIndex((i) => (i + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const dots = ".".repeat(dotIndex);

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "oklch(0.12 0 0)",
        opacity,
        transition: "opacity 0.3s ease",
        gap: 0,
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          backgroundColor: "oklch(0.65 0.18 50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          boxShadow: "0 0 40px oklch(0.65 0.18 50 / 0.35)",
          animation: "pulse-glow 2s ease-in-out infinite",
        }}
      >
        {/* House/field icon */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="oklch(0.12 0 0)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>

      {/* App name */}
      <h1
        style={{
          color: "oklch(0.94 0.01 80)",
          fontSize: 26,
          fontWeight: 700,
          margin: "0 0 6px",
          letterSpacing: "-0.5px",
        }}
      >
        Noland Field
      </h1>

      {/* Tagline */}
      <p
        style={{
          color: "oklch(0.55 0.01 80)",
          fontSize: 13,
          margin: "0 0 40px",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        Field Operations
      </p>

      {/* Loading indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 120,
            height: 3,
            borderRadius: 2,
            backgroundColor: "oklch(0.22 0 0)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: "40%",
              borderRadius: 2,
              backgroundColor: "oklch(0.65 0.18 50)",
              animation: "loading-bar 1.4s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <p
        style={{
          color: "oklch(0.40 0 0)",
          fontSize: 12,
          marginTop: 14,
          minWidth: 80,
          textAlign: "center",
        }}
      >
        Loading{dots}
      </p>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px oklch(0.65 0.18 50 / 0.30); }
          50% { box-shadow: 0 0 55px oklch(0.65 0.18 50 / 0.55); }
        }
        @keyframes loading-bar {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
