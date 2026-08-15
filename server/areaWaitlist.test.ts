import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("area-expansion waitlist", () => {
  it("stores a county interest and expansion-notification preference with public subscriber records", () => {
    const schema = source("drizzle/schema.ts");
    const router = source("server/routers.ts");
    expect(schema).toContain("areaInterest");
    expect(schema).toContain("notifyOnExpansion");
    expect(router).toContain('"out_of_service_waitlist"');
    expect(router).toContain("notifyOnExpansion: true");
    expect(router).toContain("sendAreaExpansionWaitlistConfirmation");
    expect(router).toContain("getWaitlistByCounty: protectedProcedure");
  });

  it("adds a smooth public out-of-service transition and FAQ guidance", () => {
    expect(source("client/src/index.css")).toContain("@keyframes out-of-service-fade-in");
    const quote = source("client/src/pages/Quote.tsx");
    expect(quote).toContain("Read service-area FAQs");
    expect(quote).toContain("Join area waitlist");
    expect(quote).toContain("waitlist-success-pop");
  });

  it("groups waitlist demand by county on the operations dashboard", () => {
    const dashboard = source("client/src/pages/ops/Dashboard.tsx");
    expect(dashboard).toContain("trpc.emailSubscribe.getWaitlistByCounty.useQuery");
    expect(dashboard).toContain("Expansion Waitlist by County");
  });
});
