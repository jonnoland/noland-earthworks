import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Web Requests native quote linking", () => {
  it("provides a protected server mutation and an Operations quote-link picker", () => {
    const router = fs.readFileSync(path.resolve(import.meta.dirname, "./opsRouter.ts"), "utf8");
    const workspace = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");

    expect(router).toContain("linkNativeQuote: ownerProcedure");
    expect(router).toContain("set({ nativeQuoteId: input.nativeQuoteId })");
    expect(workspace).toContain("Link an existing quote to");
    expect(workspace).toContain("trpc.ops.quotes.linkNativeQuote.useMutation");
  });
});
