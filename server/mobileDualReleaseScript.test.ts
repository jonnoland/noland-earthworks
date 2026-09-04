import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const scriptPath = resolve(root, "scripts/publish-noland-field-release.mjs");
const source = readFileSync(scriptPath, "utf8");

describe("Noland Field dual-distribution release script", () => {
  it("documents the release arguments without requiring any external publishing", () => {
    const result = spawnSync("node", [scriptPath, "--help"], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("pnpm release:field");
    expect(result.stdout).toContain("GitHub Releases");
    expect(result.stdout).toContain("Without --apk");
  });

  it("uploads to both the in-app storage channel and GitHub Releases before updating the release source", () => {
    expect(source).toContain('"manus-upload-file", ["--webdev", stagedApk]');
    expect(source).toContain('"gh", ["release", "create"');
    expect(source).toContain('"gh", ["release", "upload"');
    expect(source).toContain('run("pnpm", ["run", "build"], mobileRoot)');
    expect(source).toContain('run("./gradlew", [":app:assembleRelease"], join(mobileRoot, "android"))');
    expect(source).toContain("version !== mobilePackage.version");
    expect(source).toContain("updateMobileRelease(version, storagePath, notes)");
  });
});
