import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { NativeAllQuotesSection } from "./NativeAllQuotesSection";

/**
 * Native Operations quote workspace.
 * Quotes, portal delivery, deposits, and client actions are handled in-app.
 */
export default function Quotes() {
  return (
    <OpsDashboardLayout
      title="Quotes"
      subtitle="Create, send, track, and manage customer quotes."
    >
      <NativeAllQuotesSection />
    </OpsDashboardLayout>
  );
}
