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

  it("saves the GPX waypoint before direct launch and explains onX’s required in-app import step", () => {
    expect(quoteSource).toContain("Share GPX file");
    expect(quoteSource).toContain("Save GPX & Open onX");
    expect(quoteSource).toContain("directory: Directory.Documents");
    expect(quoteSource).toContain("Noland Field/onx-site-walk/");
    expect(quoteSource).toContain("My Content → Import");
    expect(quoteSource).toContain("does not provide an automated import interface");
    expect(manifest).toContain("android.permission.WRITE_EXTERNAL_STORAGE");
  });
});
