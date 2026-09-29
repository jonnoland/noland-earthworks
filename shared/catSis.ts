export const CAT_SIS_URL = "https://sis2.cat.com/";

export function isCatEquipment(make: string | null | undefined): boolean {
  const normalized = make?.trim().toLowerCase() ?? "";
  return normalized === "cat" || normalized === "caterpillar" || normalized.startsWith("cat ") || normalized.includes("caterpillar");
}
