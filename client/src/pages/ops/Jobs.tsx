/**
 * Jobs Page — Noland Earthworks
 * Wrapper around NativeJobsSection — the canonical job management UI.
 * Data source: native_jobs table.
 */
import DashboardLayout from "@/components/DashboardLayout";
import NativeJobsSection from "./NativeJobsSection";

export default function Jobs() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <NativeJobsSection />
      </div>
    </DashboardLayout>
  );
}
