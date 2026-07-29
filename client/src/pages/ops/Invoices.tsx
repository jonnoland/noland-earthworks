/**
 * Invoices Page — Noland Earthworks
 * Wrapper around NativeInvoicesSection — the canonical invoice management UI.
 * Data source: native_invoices table (no Jobber dependency).
 */
import DashboardLayout from "@/components/DashboardLayout";
import NativeInvoicesSection from "./NativeInvoicesSection";

export default function Invoices() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <NativeInvoicesSection />
      </div>
    </DashboardLayout>
  );
}
