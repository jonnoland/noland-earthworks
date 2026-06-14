import { useState } from "react";
import { ExternalLink, Info, LogOut, Fingerprint, ScanFace, Download, CheckCircle, RefreshCw } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBiometric } from "@/hooks/useBiometric";
import { trpc } from "@/lib/trpc";

// Version is injected at build time from package.json via vite.config.ts define
// This ensures the installed build always reports its true version
declare const __APP_VERSION__: string;
const APP_VERSION: string = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.3.0";

/** Simple semver comparison: returns true if remote > local */
function isNewerVersion(remote: string, local: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const [rMaj, rMin, rPat] = parse(remote);
  const [lMaj, lMin, lPat] = parse(local);
  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPat > lPat;
}

export default function Profile() {
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);

  // Biometric hook — no auto-prompt on Profile page (pass no-op onSuccess)
  const {
    isAvailable: biometryAvailable,
    isEnrolled: biometryEnrolled,
    biometryLabel,
    setEnrolled,
  } = useBiometric(() => {});

  // Version check
  const {
    data: versionData,
    isLoading: versionLoading,
    refetch: refetchVersion,
    isFetching: versionFetching,
  } = trpc.fieldQuote.latestVersion.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    retry: 1,
  });

  const updateAvailable = versionData
    ? isNewerVersion(versionData.version, APP_VERSION)
    : false;

  function handleDownloadUpdate() {
    if (!versionData?.downloadUrl) return;
    // On native Android, window.open with _system opens the URL in the device browser
    // which triggers the OS download manager for .apk files.
    // On web/browser fallback, _blank works fine.
    if (Capacitor.isNativePlatform()) {
      window.open(versionData.downloadUrl, "_system");
    } else {
      window.open(versionData.downloadUrl, "_blank");
    }
  }

  function handleLogoutPress() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    logout();
  }

  async function handleBiometricToggle() {
    await setEnrolled(!biometryEnrolled);
  }

  const BiometricIcon =
    biometryLabel === "Face ID" || biometryLabel === "Face Authentication"
      ? ScanFace
      : Fingerprint;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Profile" />

      <div className="scroll-area" style={{ flex: 1, padding: "20px 16px", paddingBottom: 80 }}>
        {/* Identity card */}
        <div
          style={{
            backgroundColor: "oklch(0.18 0 0)",
            border: "1px solid oklch(0.25 0 0)",
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "oklch(0.65 0.18 50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#000", fontWeight: 700, fontSize: 22 }}>J</span>
          </div>
          <div>
            <p style={{ color: "oklch(0.94 0.01 80)", fontWeight: 700, fontSize: 17, margin: "0 0 2px" }}>
              Jon Noland
            </p>
            <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 13, margin: 0 }}>
              Noland Earthworks, LLC
            </p>
            <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 12, margin: "4px 0 0" }}>
              Veteran-Owned · Middle Tennessee
            </p>
          </div>
        </div>

        {/* App Update section */}
        <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px 4px" }}>
          App Update
        </p>
        <div style={{ marginBottom: 20 }}>
          {updateAvailable ? (
            /* Update available — prominent orange card */
            <button
              onClick={handleDownloadUpdate}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "oklch(0.20 0.05 50)",
                border: "1px solid oklch(0.65 0.18 50)",
                borderRadius: 12,
                padding: "16px",
                textDecoration: "none",
                gap: 12,
                width: "100%",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Download size={20} color="oklch(0.65 0.18 50)" />
                <div style={{ textAlign: "left" }}>
                  <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 15, fontWeight: 600, margin: 0 }}>
                    Update Available
                  </p>
                  <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 12, margin: "2px 0 0" }}>
                    v{APP_VERSION} → v{versionData!.version} · Tap to download
                  </p>
                </div>
              </div>
              <ExternalLink size={16} color="oklch(0.65 0.18 50)" />
            </button>
          ) : (
            /* Up to date or loading */
            <div
              style={{
                backgroundColor: "oklch(0.18 0 0)",
                border: "1px solid oklch(0.25 0 0)",
                borderRadius: 12,
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {versionLoading || versionFetching ? (
                  <RefreshCw size={20} color="oklch(0.60 0.01 80)" style={{ animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <CheckCircle size={20} color={versionData ? "oklch(0.70 0.18 145)" : "oklch(0.50 0.01 80)"} />
                )}
                <div>
                  <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 15, margin: 0 }}>
                    {versionLoading ? "Checking for updates..." : "App is up to date"}
                  </p>
                  <p style={{ color: "oklch(0.55 0.01 80)", fontSize: 12, margin: "2px 0 0" }}>
                    Installed: v{APP_VERSION}
                    {versionData && !versionLoading && ` · Latest: v${versionData.version}`}
                  </p>
                </div>
              </div>
              {!versionLoading && (
                <button
                  onClick={() => refetchVersion()}
                  disabled={versionFetching}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 4,
                    cursor: "pointer",
                    opacity: versionFetching ? 0.4 : 1,
                  }}
                >
                  <RefreshCw
                    size={16}
                    color="oklch(0.50 0.01 80)"
                    style={{ animation: versionFetching ? "spin 0.8s linear infinite" : "none" }}
                  />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Security section */}
        <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px 4px" }}>
          Security
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {/* Biometric toggle */}
          {biometryAvailable ? (
            <button
              onClick={handleBiometricToggle}
              style={{
                backgroundColor: "oklch(0.18 0 0)",
                border: `1px solid ${biometryEnrolled ? "oklch(0.65 0.18 50)" : "oklch(0.25 0 0)"}`,
                borderRadius: 12,
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                transition: "border-color 0.15s ease",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <BiometricIcon size={20} color={biometryEnrolled ? "oklch(0.65 0.18 50)" : "oklch(0.60 0.01 80)"} />
                <div style={{ textAlign: "left" }}>
                  <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 15, margin: 0 }}>
                    {biometryLabel}
                  </p>
                  <p style={{ color: "oklch(0.55 0.01 80)", fontSize: 12, margin: "2px 0 0" }}>
                    {biometryEnrolled ? "Enabled — tap to disable" : "Disabled — tap to enable"}
                  </p>
                </div>
              </div>
              {/* Toggle pill */}
              <div
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: biometryEnrolled ? "oklch(0.65 0.18 50)" : "oklch(0.30 0 0)",
                  position: "relative",
                  transition: "background-color 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: biometryEnrolled ? 21 : 3,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                  }}
                />
              </div>
            </button>
          ) : (
            <div
              style={{
                backgroundColor: "oklch(0.16 0 0)",
                border: "1px solid oklch(0.22 0 0)",
                borderRadius: 12,
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Fingerprint size={20} color="oklch(0.40 0 0)" />
              <p style={{ color: "oklch(0.45 0.01 80)", fontSize: 14, margin: 0 }}>
                Biometrics not available on this device
              </p>
            </div>
          )}
        </div>

        {/* Links */}
        <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px 4px" }}>
          Quick Links
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <a
            href="https://nolandearthworks.com/ops/quotes"
            target="_blank"
            rel="noreferrer"
            style={{
              backgroundColor: "oklch(0.18 0 0)",
              border: "1px solid oklch(0.25 0 0)",
              borderRadius: 12,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textDecoration: "none",
            }}
          >
            <span style={{ color: "oklch(0.94 0.01 80)", fontSize: 15 }}>Open Ops Dashboard</span>
            <ExternalLink size={16} color="oklch(0.60 0.01 80)" />
          </a>

          <a
            href="tel:6154064819"
            style={{
              backgroundColor: "oklch(0.18 0 0)",
              border: "1px solid oklch(0.25 0 0)",
              borderRadius: 12,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textDecoration: "none",
            }}
          >
            <span style={{ color: "oklch(0.94 0.01 80)", fontSize: 15 }}>Call: 615-406-4819</span>
            <ExternalLink size={16} color="oklch(0.60 0.01 80)" />
          </a>
        </div>

        {/* Logout */}
        <div style={{ marginTop: 8 }}>
          <button
            onClick={handleLogoutPress}
            style={{
              width: "100%",
              backgroundColor: confirming ? "oklch(0.30 0.15 25)" : "oklch(0.18 0 0)",
              border: `1px solid ${confirming ? "oklch(0.50 0.20 25)" : "oklch(0.25 0 0)"}`,
              borderRadius: 12,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              transition: "background-color 0.15s ease, border-color 0.15s ease",
            }}
          >
            <span style={{ color: confirming ? "oklch(0.75 0.20 25)" : "oklch(0.65 0.20 25)", fontSize: 15 }}>
              {confirming ? "Tap again to confirm logout" : "Log Out"}
            </span>
            <LogOut size={16} color={confirming ? "oklch(0.75 0.20 25)" : "oklch(0.65 0.20 25)"} />
          </button>
        </div>

        {/* App info footer */}
        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            backgroundColor: "oklch(0.16 0 0)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Info size={16} color="oklch(0.50 0.01 80)" />
          <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 12, margin: 0 }}>
            Noland Field v{APP_VERSION} · Field quote companion for Noland Earthworks
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
