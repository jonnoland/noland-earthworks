import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");

describe("SEO and AI Visibility audit response resilience", () => {
  it("raises a meaningful upstream error when an LLM response is not JSON", () => {
    const llm = source("server/_core/llm.ts");

    expect(llm).toContain("const responseText = await response.text()");
    expect(llm).toContain("LLM invoke unavailable: upstream returned a non-JSON response");
    expect(llm).not.toContain("return (await response.json()) as InvokeResult");
  });

  it("runs AI Visibility prompts in bounded parallel batches with one structured LLM call per prompt", () => {
    const visibility = source("server/routers/aiVisibility.ts");

    expect(visibility).toContain("mapWithConcurrency(AUDIT_PROMPTS, 3, auditPrompt)");
    expect(visibility).toContain("visibility_prompt_result");
    expect(visibility).toContain("[Service temporarily unavailable]");
    expect(visibility).toContain("unavailableCount");
  });

  it("presents transient audit outages as a retry message rather than raw JSON parsing errors", () => {
    const apiErrors = source("client/src/lib/apiErrorUtils.ts");
    const seo = source("client/src/pages/ops/Seo.tsx");
    const visibility = source("client/src/pages/ops/AiVisibility.tsx");

    expect(apiErrors).toContain("Audit service is temporarily unavailable");
    expect(seo).toContain("auditServiceErrorMessage(err)");
    expect(visibility).toContain("auditServiceErrorMessage(err)");
  });
});
