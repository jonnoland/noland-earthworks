/**
 * Clients Page — Noland Earthworks
 * Wrapper around NativeClientsSection — the canonical client directory.
 * Data source: native_clients table (no Jobber dependency).
 */
import DashboardLayout from "@/components/DashboardLayout";
import NativeClientsSection from "./NativeClientsSection";

export default function Clients() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <NativeClientsSection />
      </div>
    </DashboardLayout>
  );
}
