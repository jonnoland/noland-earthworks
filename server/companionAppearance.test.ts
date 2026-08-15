import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Noland Field appearance controls", () => {
  it("stores a Light, Dark, or System preference and observes device appearance changes", () => {
    const themeHook = source("noland-earthworks-mobile/src/hooks/useThemePreference.tsx");

    expect(themeHook).toContain('type ThemePreference = "light" | "dark" | "system"');
    expect(themeHook).toContain("noland_field_theme_preference_v1");
    expect(themeHook).toContain("localStorage.setItem");
    expect(themeHook).toContain("prefers-color-scheme: dark");
    expect(themeHook).toContain('query.addEventListener("change", onChange)');
    expect(themeHook).toContain("root.dataset.theme = resolvedTheme");
  });

  it("exposes accessible appearance choices in Profile and wraps the app in the theme provider", () => {
    const profile = source("noland-earthworks-mobile/src/pages/Profile.tsx");
    const entry = source("noland-earthworks-mobile/src/main.tsx");

    expect(profile).toContain("Use device setting");
    expect(profile).toContain("> Light");
    expect(profile).toContain("> Dark");
    expect(profile).toContain('role="switch"');
    expect(entry).toContain("<ThemePreferenceProvider>");
  });

  it("uses a smooth, reduced-motion-safe fade when appearance changes", () => {
    const styles = source("noland-earthworks-mobile/src/index.css");
    const app = source("noland-earthworks-mobile/src/App.tsx");

    expect(styles).toContain(".theme-transition");
    expect(styles).toContain("@keyframes appearance-fade");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(app).toContain("appearance-fade");
  });
});
