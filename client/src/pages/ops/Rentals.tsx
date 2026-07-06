/**
 * Rentals — Noland Earthworks
 * Launch panel for the equipment rental site.
 * Opens in a new tab to avoid cross-origin cookie issues with iframe embedding.
 */

import DashboardLayout from "@/components/DashboardLayout";
import { Truck, ExternalLink, Package, Calendar, DollarSign, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

const RENTAL_URL = "https://nolandequip-ycxmmuoa.manus.space";

const QUICK_LINKS = [
  { label: "Browse Equipment",  icon: Package,       path: "/" },
  { label: "Reservations",      icon: Calendar,      path: "/reservations" },
  { label: "Pricing",           icon: DollarSign,    path: "/pricing" },
  { label: "Manage Inventory",  icon: ClipboardList, path: "/admin" },
];

export default function Rentals() {
  const open = (path = "/") => {
    window.open(`${RENTAL_URL}${path}`, "_blank", "noopener,noreferrer");
  };

  return (
    <DashboardLayout title="Rentals" subtitle="Equipment rental management">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-8">
        {/* Card */}
        <div className="w-full max-w-lg bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          {/* Header strip */}
          <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/5 border-b border-[#1e1e1e] px-8 py-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0">
              <Truck className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Noland Equipment Rentals</h2>
              <p className="text-zinc-400 text-sm mt-0.5">nolandequip-ycxmmuoa.manus.space</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-6">
            <p className="text-zinc-400 text-sm leading-relaxed">
              Manage your equipment rental inventory, reservations, and pricing from the dedicated rental platform. Opens in a new tab with your existing session.
            </p>

            {/* Primary CTA */}
            <Button
              onClick={() => open("/")}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold h-11 text-sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Rentals Site
            </Button>

            {/* Quick links */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-3">Quick Links</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_LINKS.map(({ label, icon: Icon, path }) => (
                  <button
                    key={path}
                    onClick={() => open(path)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1e1e1e] hover:border-[#2a2a2a] hover:bg-[#141414] transition-colors text-left group"
                  >
                    <Icon className="h-3.5 w-3.5 text-zinc-500 group-hover:text-orange-400 transition-colors shrink-0" />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
