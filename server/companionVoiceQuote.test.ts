import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Noland Field voice quote microphone access", () => {
  it("declares Android microphone access for the packaged companion app", () => {
    const manifest = source("noland-earthworks-mobile/android/app/src/main/AndroidManifest.xml");
    const config = source("noland-earthworks-mobile/capacitor.config.ts");

    expect(manifest).toContain('android.permission.RECORD_AUDIO');
    expect(manifest).toContain('android.permission.MODIFY_AUDIO_SETTINGS');
    expect(config).toContain('"android.permission.RECORD_AUDIO"');
    expect(config).toContain('"android.permission.MODIFY_AUDIO_SETTINGS"');
  });

  it("requests microphone access before speech recognition and explains recovery steps", () => {
    const quote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");

    expect(quote).toContain("navigator.mediaDevices?.getUserMedia");
    expect(quote).toContain("navigator.mediaDevices.getUserMedia({ audio: true })");
    expect(quote).toContain("Android Settings > Apps > Noland Field > Permissions > Microphone");
    expect(quote).toContain("voiceErrorMessage(event.error)");
    expect(quote).toContain("voiceListening || voicePermissionLoading ? stopListening : startListening");
  });
});
