import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { opsViewerRouter } from "./opsViewerRouter";

describe("opsViewerRouter", () => {
  it("accepts the configured server-only viewer key through the lightweight authorization endpoint", async () => {
    expect(ENV.opsViewerKey).toHaveLength(64);
    const caller = opsViewerRouter.createCaller({} as never);

    await expect(caller.verifyAccess({ key: ENV.opsViewerKey })).resolves.toEqual({ authorized: true });
  });

  it("rejects an incorrect viewer key without querying Operations data", async () => {
    const caller = opsViewerRouter.createCaller({} as never);

    await expect(caller.verifyAccess({ key: "invalid-viewer-key" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
