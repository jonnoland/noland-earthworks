import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Operations consolidation", () => {
  it("keeps legacy client hub URLs pointed to their canonical client workspaces", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain('path="/ops/clients/invoices"');
    expect(app).toContain('window.location.replace("/ops/invoices")');
    expect(app).toContain('path="/ops/clients/payments"');
    expect(app).toContain('window.location.replace("/ops/payments")');
    expect(app).toContain('<OwnerRoute><OpsClients /></OwnerRoute>');
    expect(existsSync(resolve(root, "client/src/pages/ops/ClientsHub.tsx"))).toBe(false);
  });

  it("uses one shared Operations navigation shell with canonical sidebar destinations", () => {
    const layout = read("client/src/components/DashboardLayout.tsx");
    expect(layout).toContain('href: "/ops/crews"');
    expect(layout).toContain('href: "/ops/equipment"');
    expect(layout).toContain('href: "/ops/reports"');
    expect(layout).toContain('href: "/ops/pricing"');
    expect(existsSync(resolve(root, "client/src/components/OpsDashboardLayout.tsx"))).toBe(false);
  });

  it("bases dashboard and report cash metrics on native quote, job, and invoice events", () => {
    const dashboard = read("client/src/pages/ops/Dashboard.tsx");
    const reports = read("client/src/pages/ops/Reports.tsx");
    const payments = read("client/src/pages/ops/Payments.tsx");
    expect(dashboard).toContain("trpc.nativeJobs.list.useQuery({}");
    expect(dashboard).not.toContain("trpc.ops.jobs.list.useQuery");
    expect(dashboard).toContain("depositPaidCents");
    expect(reports).toContain("trpc.nativeJobs.listInvoices.useQuery({})");
    expect(reports).toContain("trpc.nativeQuotes.list.useQuery({})");
    expect(reports).toContain("Monthly Cash Collected");
    expect(reports).toContain("Paid invoices, recorded job payments, and recorded deposits only");
    expect(payments).toContain("trpc.nativeJobs.listInvoices.useQuery({})");
    expect(payments).toContain("trpc.nativeQuotes.list.useQuery({ limit: 100 })");
    expect(payments).not.toContain("trpc.ops.jobs.list.useQuery");
  });

  it("stores the calculator configuration through owner-protected settings instead of browser-only writes", () => {
    const pricing = read("client/src/pages/ops/Pricing.tsx");
    const router = read("server/opsRouter.ts");
    expect(pricing).toContain("getInternalPricingConfig.useQuery");
    expect(pricing).toContain("initializeInternalPricingConfig.useMutation");
    expect(pricing).toContain("updateInternalPricingConfig.useMutation");
    expect(pricing).not.toContain('localStorage.setItem("noland_pricing_config"');
    expect(router).toContain("getInternalPricingConfig: ownerProcedure");
    expect(router).toContain("initializeInternalPricingConfig: ownerProcedure");
    expect(router).toContain("updateInternalPricingConfig: ownerProcedure");
  });

  it("uses a conservative 15-day billing capacity and the matching $2,850 crew-day target as estimator defaults", () => {
    const pricingModel = read("shared/internalPricingModel.ts");

    expect(pricingModel).toContain("ACTIVE_15_DAY_PRICING_CONFIG");
    expect(pricingModel).toContain("workingDaysPerMonth: 15");
    expect(pricingModel).toContain("targetMarginPct: 35.5");
    expect(pricingModel).toContain("Owner-approved planning assumptions");
  });

  it("offers an internal comparison between the active 15-day plan and the prior 20-day pricing structure", () => {
    const pricing = read("client/src/pages/ops/Pricing.tsx");

    expect(pricing).toContain("PRIOR_PRICING_CONFIG");
    expect(pricing).toContain("showModelComparison");
    expect(pricing).toContain("Compare prior 20-day model");
    expect(pricing).toContain("Active 15-day model vs. prior pricing structure");
    expect(pricing).toContain("Crew-day target");
    expect(pricing).toContain("Monthly revenue target comparison");
    expect(pricing).toContain("BarChart");
  });

  it("protects sent and non-repriceable quote work when applying the active model to drafts", () => {
    const router = read("server/nativeQuotesRouter.ts");
    const pricing = read("client/src/pages/ops/Pricing.tsx");

    expect(router).toContain("getDraftRepricePreview: ownerProcedure");
    expect(router).toContain("repriceEligibleDrafts: ownerProcedure");
    expect(router).toContain('eq(nativeQuotes.status, "draft")');
    expect(router).toContain('eq(nativeQuotes.status, "draft"))');
    expect(pricing).toContain("Preview & update drafts");
    expect(pricing).toContain("Update eligible draft quotes?");
  });

  it("uses the approved quote mailbox in business settings and outbound quote delivery", () => {
    const schema = read("drizzle/schema.ts");
    const quoteRouter = read("server/nativeQuotesRouter.ts");
    expect(schema).toContain('default("quotes@nolandearthworks.com")');
    expect(quoteRouter).toContain('from: "Noland Earthworks <quotes@nolandearthworks.com>"');
  });
});
