import DashboardLayout from "@/components/DashboardLayout";
import { NativeAllQuotesSection } from "./NativeAllQuotesSection";

/**
 * Native Operations quote workspace.
 * Quotes, portal delivery, deposits, and client actions are handled in-app.
 */
export default function Quotes() {
  return (
    <DashboardLayout
      title="Quotes"
      subtitle="Create, send, track, and manage customer quotes."
    >
      <NativeAllQuotesSection />
    </DashboardLayout>
  );
}
