import { useState } from "react";
import { ExternalLink, Info, LogOut, Fingerprint, ScanFace, Download, CheckCircle, RefreshCw, Moon, Sun, Monitor } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileTransfer } from "@capacitor/file-transfer";
import { FileViewer } from "@capacitor/file-viewer";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBiometric } from "@/hooks/useBiometric";
import { trpc } from "@/lib/trpc";
import BrandLogo from "@/components/BrandLogo";
import { useThemePreference } from "@/hooks/useThemePreference";

// Version is injected at build time from package.json via vite.config.ts define
// This ensures the installed build always reports its true version
declare const __APP_VERSION__: string;
const APP_VERSION: string = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.3.0";
const UPDATE_SITE_ORIGIN = "https://nolandearthworks.com";

type UpdateDownloadState = "idle" | "preparing" | "downloading" | "opening" | "complete" | "failed";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

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
  const [downloadState, setDownloadState] = useState<UpdateDownloadState>("idle");
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [downloadTotalBytes, setDownloadTotalBytes] = useState<number | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const { preference, resolvedTheme, setPreference } = useThemePreference();

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
  const isDownloading = downloadState === "preparing" || downloadState === "downloading" || downloadState === "opening";
  const downloadProgress = downloadTotalBytes && downloadTotalBytes > 0
    ? Math.min(100, Math.round((downloadedBytes / downloadTotalBytes) * 100))
    : null;

  async function openUpdateLink(url: string) {
    const absoluteUrl = new URL(url, UPDATE_SITE_ORIGIN).toString();
    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url: absoluteUrl });
        return;
      } catch {
        window.open(absoluteUrl, "_system");
        return;
      }
    }
    window.open(absoluteUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDownloadUpdate() {
    if (!versionData?.downloadUrl || isDownloading) return;

    const absoluteUrl = new URL(versionData.downloadUrl, UPDATE_SITE_ORIGIN).toString();
    const filename = `noland-field_v${versionData.version}.apk`;
    setDownloadState("preparing");
    setDownloadedBytes(0);
    setDownloadTotalBytes(null);
    setDownloadStatus("Preparing the signed update package…");

    try {
      if (Capacitor.isNativePlatform()) {
        const target = await Filesystem.getUri({ directory: Directory.Cache, path: filename });
        let finalBytes = 0;
        let finalTotalBytes: number | null = null;
        const listener = await FileTransfer.addListener("progress", (progress) => {
          if (progress.type !== "download") return;
          finalBytes = progress.bytes;
          finalTotalBytes = progress.lengthComputable && progress.contentLength > 0 ? progress.contentLength : null;
          setDownloadState("downloading");
          setDownloadedBytes(progress.bytes);
          setDownloadTotalBytes(finalTotalBytes);
          setDownloadStatus(progress.lengthComputable && progress.contentLength > 0
            ? `Downloading signed update: ${formatBytes(progress.bytes)} of ${formatBytes(progress.contentLength)}.`
            : `Downloading signed update: ${formatBytes(progress.bytes)} received.`);
        });
        try {
          setDownloadState("downloading");
          setDownloadStatus("Downloading signed update…");
          await FileTransfer.downloadFile({ url: absoluteUrl, path: target.uri, progress: true });
        } finally {
          await listener.remove();
        }
        setDownloadedBytes(finalTotalBytes ?? finalBytes);
        setDownloadTotalBytes(finalTotalBytes);
        setDownloadState("opening");
        setDownloadStatus("Download complete. Opening the Android installer…");
        try {
          await FileViewer.openDocumentFromLocalPath({ path: target.uri });
          setDownloadState("complete");
          setDownloadStatus("Android installer opened. Approve the update to finish installation.");
        } catch {
          setDownloadState("complete");
          setDownloadStatus("Download complete. Open the saved Noland Field APK from your device files to install it.");
        }
        return;
      }

      const response = await fetch(absoluteUrl);
      if (!response.ok) throw new Error(`Update server returned ${response.status}.`);
      const total = Number(response.headers.get("content-length")) || null;
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Your browser could not read the update file.");
      const chunks: Uint8Array[] = [];
      let received = 0;
      setDownloadState("downloading");
      setDownloadTotalBytes(total);
      setDownloadStatus(total ? `Downloading signed update: 0 MB of ${formatBytes(total)}.` : "Downloading signed update…");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          setDownloadedBytes(received);
          setDownloadStatus(total ? `Downloading signed update: ${formatBytes(received)} of ${formatBytes(total)}.` : `Downloading signed update: ${formatBytes(received)} received.`);
        }
      }
      const merged = new Uint8Array(new ArrayBuffer(received));
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const file = new Blob([merged], { type: response.headers.get("content-type") || "application/vnd.android.package-archive" });
      const browserDownloadUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = browserDownloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(browserDownloadUrl), 60_000);
      setDownloadState("complete");
      setDownloadStatus("Download complete. Open the Noland Field APK from your browser downloads to install it.");
    } catch (error) {
      setDownloadState("failed");
      setDownloadStatus(error instanceof Error ? `Update download could not finish: ${error.message}` : "Update download could not finish. Try again or open the release notes page.");
    }
  }

  async function handleOpenReleasePage() {
    if (!versionData) return;
    await openUpdateLink(versionData.releaseNotesUrl || versionData.downloadUrl);
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
              width: 86,
              height: 64,
              borderRadius: 12,
              backgroundColor: "oklch(0.93 0.02 80)",
              border: "1px solid oklch(0.65 0.18 50 / 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 5,
              flexShrink: 0,
            }}
          >
            <BrandLogo />
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

        {/* Appearance section */}
        <p style={{ color: "var(--ne-subtle)", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px 4px" }}>
          Appearance
        </p>
        <div style={{ background: "var(--ne-soil)", border: "1px solid var(--ne-border)", borderRadius: 12, padding: "8px 16px", marginBottom: 20 }}>
          <button
            onClick={() => setPreference(preference === "system" ? resolvedTheme : "system")}
            role="switch"
            aria-checked={preference === "system"}
            style={{ width: "100%", background: "none", border: "none", padding: "10px 0", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: "inherit" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
              <Monitor size={20} color="var(--ne-amber)" />
              <span>
                <span style={{ display: "block", color: "var(--ne-cream)", fontSize: 15 }}>Use device setting</span>
                <span style={{ display: "block", color: "var(--ne-muted)", fontSize: 12, marginTop: 2 }}>Automatically follows {resolvedTheme === "dark" ? "Dark" : "Light"} mode</span>
              </span>
            </span>
            <span aria-hidden="true" className={preference === "system" ? "theme-switch is-on" : "theme-switch"}><span /></span>
          </button>
          <div style={{ height: 1, background: "var(--ne-border)", margin: "2px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "10px 0 2px" }}>
            <button
              onClick={() => setPreference("light")}
              aria-pressed={preference === "light"}
              className={preference === "light" ? "appearance-choice active" : "appearance-choice"}
            >
              <Sun size={16} /> Light
            </button>
            <button
              onClick={() => setPreference("dark")}
              aria-pressed={preference === "dark"}
              className={preference === "dark" ? "appearance-choice active" : "appearance-choice"}
            >
              <Moon size={16} /> Dark
            </button>
          </div>
        </div>

        {/* App Update section */}
        <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px 4px" }}>
          App Update
        </p>
        <div style={{ marginBottom: 20 }}>
          {updateAvailable ? (
            <div>
              {/* Update available — transfer progress and a release-notes fallback */}
              <button
                onClick={handleDownloadUpdate}
                disabled={isDownloading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: isDownloading ? "oklch(0.16 0.03 50)" : "oklch(0.20 0.05 50)",
                  border: "1px solid oklch(0.65 0.18 50)", borderRadius: 12, padding: "16px",
                  textDecoration: "none", gap: 12, width: "100%", cursor: isDownloading ? "not-allowed" : "pointer",
                  opacity: isDownloading ? 0.75 : 1, transition: "opacity 0.2s, background-color 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {isDownloading ? <RefreshCw size={20} color="oklch(0.65 0.18 50)" style={{ animation: "spin 0.8s linear infinite" }} /> : <Download size={20} color="oklch(0.65 0.18 50)" />}
                  <div style={{ textAlign: "left" }}>
                    <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 15, fontWeight: 600, margin: 0 }}>{isDownloading ? "Downloading update…" : "Download Update"}</p>
                    <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 12, margin: "2px 0 0" }}>v{APP_VERSION} → v{versionData!.version} · Signed Android package</p>
                  </div>
                </div>
                {!isDownloading && <Download size={16} color="oklch(0.65 0.18 50)" />}
              </button>
              {downloadState !== "idle" && (
                <div role="status" aria-live="polite" style={{ marginTop: 10, border: `1px solid ${downloadState === "failed" ? "oklch(0.65 0.20 25 / 0.6)" : "oklch(0.65 0.18 50 / 0.35)"}`, borderRadius: 10, padding: "10px 11px", background: downloadState === "failed" ? "oklch(0.65 0.20 25 / 0.08)" : "oklch(0.65 0.18 50 / 0.08)" }}>
                  <div style={{ height: 6, overflow: "hidden", borderRadius: 99, background: "oklch(0.12 0 0)" }} aria-label={downloadProgress == null ? "Download in progress" : `Download ${downloadProgress}% complete`}>
                    <div style={{ width: downloadProgress == null ? (isDownloading ? "38%" : downloadState === "complete" ? "100%" : "0%") : `${downloadProgress}%`, height: "100%", borderRadius: 99, background: downloadState === "failed" ? "oklch(0.65 0.20 25)" : "var(--ne-amber)", transition: "width 0.2s ease", animation: downloadProgress == null && isDownloading ? "downloadPulse 1.1s ease-in-out infinite" : "none" }} />
                  </div>
                  <p style={{ color: downloadState === "failed" ? "oklch(0.78 0.16 35)" : "var(--ne-cream)", fontSize: 12, lineHeight: 1.45, margin: "8px 0 0" }}>{downloadStatus}</p>
                  {downloadProgress != null && isDownloading && <p style={{ color: "var(--ne-muted)", fontSize: 11, margin: "3px 0 0" }}>{downloadProgress}% complete</p>}
                </div>
              )}
              <div style={{ marginTop: 10, borderLeft: "3px solid var(--ne-amber)", background: "oklch(0.65 0.18 50 / 0.07)", borderRadius: "0 8px 8px 0", padding: "10px 11px" }}>
                <p style={{ color: "var(--ne-cream)", fontSize: 12, fontWeight: 700, margin: 0 }}>What’s new in v{versionData!.version}</p>
                <p style={{ color: "var(--ne-muted)", fontSize: 11, lineHeight: 1.45, margin: "4px 0 0" }}>{versionData!.notes}</p>
                {versionData!.highlights?.map((highlight) => <p key={highlight} style={{ color: "var(--ne-muted)", fontSize: 11, lineHeight: 1.4, margin: "5px 0 0" }}>• {highlight}</p>)}
              </div>
              <p style={{ color: "var(--ne-muted)", fontSize: 12, lineHeight: 1.45, margin: "10px 4px 0" }}>
                The progress bar reflects the actual signed package transfer. When it completes, approve the Android installation prompt. If the installer does not open, use the release notes page for the fallback download.
              </p>
              <button onClick={handleOpenReleasePage} style={{ margin: "6px 4px 0", padding: 0, border: "none", background: "none", color: "var(--ne-amber)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Open release page instead
              </button>
            </div>
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
        @keyframes downloadPulse {
          0%, 100% { transform: translateX(-40%); opacity: 0.65; }
          50% { transform: translateX(140%); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
