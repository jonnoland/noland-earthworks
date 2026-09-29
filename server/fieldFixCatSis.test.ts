import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CAT_SIS_URL, isCatEquipment } from "@shared/catSis";

const root = resolve(import.meta.dirname, "..");
const fieldFixSource = readFileSync(resolve(root, "client/src/pages/ops/FieldFix.tsx"), "utf8");

describe("Field Fix CAT SIS quick access", () => {
  it("recognizes CAT and Caterpillar equipment without matching other brands", () => {
    expect(isCatEquipment("CAT")).toBe(true);
    expect(isCatEquipment("Caterpillar")).toBe(true);
    expect(isCatEquipment("CAT Industrial")).toBe(true);
    expect(isCatEquipment("Bobcat")).toBe(false);
    expect(isCatEquipment("Fecon")).toBe(false);
  });

  it("uses the official CAT SIS 2.0 destination", () => {
    expect(CAT_SIS_URL).toBe("https://sis2.cat.com/");
    expect(fieldFixSource).toContain('href={CAT_SIS_URL}');
    expect(fieldFixSource).toContain('target="_blank"');
    expect(fieldFixSource).toContain('rel="noreferrer"');
  });

  it("shows a serial copy action only for CAT equipment cards", () => {
    expect(fieldFixSource).toContain("isCatEquipment(m.make)");
    expect(fieldFixSource).toContain("Copy serial");
    expect(fieldFixSource).toContain("navigator.clipboard?.writeText");
    expect(fieldFixSource).toContain("Paste it into CAT SIS 2.0.");
    expect(fieldFixSource).toContain("Add a serial number to copy it into SIS.");
  });
});
