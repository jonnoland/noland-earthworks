import { describe, expect, it } from "vitest";
import { isTransientApiTransportError } from "../client/src/lib/apiErrorUtils";

describe("isTransientApiTransportError", () => {
  it("recognizes an HTML gateway response returned to a JSON request", () => {
    expect(isTransientApiTransportError(new Error('Unexpected token \'<\', "<html>" is not valid JSON'))).toBe(true);
  });

  it("does not suppress a normal application error", () => {
    expect(isTransientApiTransportError(new Error("Quote not found"))).toBe(false);
  });
});
