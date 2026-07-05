/**
 * Rentals — Noland Earthworks
 * Embeds the equipment rental site (nolandequip-ycxmmuoa.manus.space) in a full-height iframe.
 * Provides an open-in-new-tab fallback for browsers that block embedding.
 */

import DashboardLayout from "@/components/DashboardLayout";
import { ExternalLink } from "lucide-react";

const RENTAL_URL = "https://nolandequip-ycxmmuoa.manus.space";

export default function Rentals() {
  return (
    <DashboardLayout title="Rentals" subtitle="Equipment rental management">
      <div className="flex flex-col h-full" style={{ height: "calc(100vh - 56px)" }}>
        {/* Thin header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e1e] bg-[#090909] shrink-0">
          <p className="text-xs text-zinc-500">
            nolandequip-ycxmmuoa.manus.space
          </p>
          <a
            href={RENTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-orange-400 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </a>
        </div>

        {/* Iframe */}
        <iframe
          src={RENTAL_URL}
          title="Noland Equipment Rentals"
          className="flex-1 w-full border-0"
          allow="fullscreen"
          loading="lazy"
        />
      </div>
    </DashboardLayout>
  );
}
