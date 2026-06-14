import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { trpc } from "@/lib/trpc";

// Injected at build time from package.json via vite.config.ts
declare const __APP_VERSION__: string;
const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.3.0";

function isNewerVersion(remote: string, local: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const [rMaj, rMin, rPat] = parse(remote);
  const [lMaj, lMin, lPat] = parse(local);
  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPat > lPat;
}

/**
 * Checks for a new app version on mount and shows a persistent toast if one
 * is available. The toast fires once per app session — subsequent navigations
 * do not re-trigger it.
 */
export function useUpdateCheck() {
  const toastShown = useRef(false);

  const { data: versionData } = trpc.fieldQuote.latestVersion.useQuery(
    undefined,
    {
      staleTime: 10 * 60 * 1000, // cache 10 min — matches server cache
      retry: 1,
    }
  );

  useEffect(() => {
    if (!versionData || toastShown.current) return;
    if (!isNewerVersion(versionData.version, APP_VERSION)) return;

    toastShown.current = true;

    const downloadUrl = versionData.downloadUrl;

    toast("Update available", {
      description: `v${APP_VERSION} → v${versionData.version}  ·  Tap to download`,
      duration: Infinity, // stays until dismissed or tapped
      action: {
        label: "Download",
        onClick: () => {
          if (Capacitor.isNativePlatform()) {
            window.open(downloadUrl, "_system");
          } else {
            window.open(downloadUrl, "_blank");
          }
        },
      },
      style: {
        background: "oklch(0.20 0.05 50)",
        border: "1px solid oklch(0.65 0.18 50)",
        color: "oklch(0.94 0.01 80)",
      },
    });
  }, [versionData]);
}
