import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("customer portal Phase 1 workflow", () => {
  it("approves and deposits only the current phase while keeping future phases optional", () => {
    const router = read("server/nativeQuotesRouter.ts");
    const portal = read("client/src/pages/NativeQuotePortal.tsx");

    expect(router).toContain("phaseOneApprovedCents");
    expect(router).toContain('approval_scope: "phase_1"');
    expect(router).toContain("Phase 1 Deposit");
    expect(router).toContain("Approve the current phase before paying its deposit.");
    expect(portal).toContain("Phase 1 — Current Approval");
    expect(portal).toContain("Optional Future Phases");
    expect(portal).toContain("not included in today’s approval, deposit, or schedule");
    expect(portal).toContain("Approve Phase 1");
    expect(portal).toContain("Pay ${fmt(depositCents)} Phase 1 Deposit");
  });
});
