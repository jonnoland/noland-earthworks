import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const quoteSource = readFileSync(resolve(root, "noland-earthworks-mobile/src/pages/NewQuote.tsx"), "utf8");
const manifest = readFileSync(resolve(root, "noland-earthworks-mobile/android/app/src/main/AndroidManifest.xml"), "utf8");
const mobilePackage = readFileSync(resolve(root, "noland-earthworks-mobile/package.json"), "utf8");

describe("Noland Field onX Offroad direct launch", () => {
  it("detects and opens the installed official onX Offroad Android package", () => {
    expect(quoteSource).toContain('import { AppLauncher } from "@capacitor/app-launcher"');
    expect(quoteSource).toContain('AppLauncher.canOpenUrl({ url: "onxmaps.offroad" })');
    expect(quoteSource).toContain('AppLauncher.openUrl({ url: "onxmaps.offroad" })');
    expect(manifest).toContain('<package android:name="onxmaps.offroad" />');
    expect(mobilePackage).toContain('"@capacitor/app-launcher"');
  });

  it("keeps the GPX share fallback and correctly explains onX’s in-app import step", () => {
    expect(quoteSource).toContain("Share GPX file");
    expect(quoteSource).toContain("Open onX Offroad");
    expect(quoteSource).toContain("My Content → Import");
    expect(quoteSource).toContain("Android does not list it as a share target");
  });
});
