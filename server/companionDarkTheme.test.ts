import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Noland Field dark brand theme", () => {
  it("defines an outdoor-readable dark-earth palette with amber brand accents", () => {
    const styles = source("noland-earthworks-mobile/src/index.css");

    expect(styles).toContain("color-scheme: dark");
    expect(styles).toContain("--ne-ground");
    expect(styles).toContain("--ne-clay");
    expect(styles).toContain("--ne-amber");
    expect(styles).toContain("--ne-cream");
    expect(styles).toContain("button:focus-visible");
  });

  it("uses the dark theme tokens on the app shell and primary field workflow", () => {
    const app = source("noland-earthworks-mobile/src/App.tsx");
    const header = source("noland-earthworks-mobile/src/components/PageHeader.tsx");
    const navigation = source("noland-earthworks-mobile/src/components/BottomNav.tsx");
    const home = source("noland-earthworks-mobile/src/pages/Home.tsx");
    const quote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    const address = source("noland-earthworks-mobile/src/components/AddressAutocomplete.tsx");

    for (const module of [app, header, navigation, home, quote, address]) {
      expect(module).toContain("var(--ne-");
    }
  });

  it("keeps the current installed APK release at v0.4.1 until a new build is explicitly requested", () => {
    const packageJson = source("noland-earthworks-mobile/package.json");
    const androidBuild = source("noland-earthworks-mobile/android/app/build.gradle");

    expect(packageJson).toContain('"version": "0.4.1"');
    expect(androidBuild).toContain('versionName "0.4.1"');
    expect(androidBuild).toContain("versionCode 3");
  });
});
