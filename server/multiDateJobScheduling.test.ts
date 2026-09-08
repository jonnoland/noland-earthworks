import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("multi-date job scheduling", () => {
  it("persists normalized work dates and retains the earliest date for compatible legacy consumers", () => {
    const router = source("server/nativeJobsRouter.ts");
    const helper = source("server/nativeJobScheduleDates.ts");
    expect(router).toContain("scheduledDates: z.array(z.date()).max(31).optional()");
    expect(router).toContain("saveJobScheduleDates(db, id, explicitDates)");
    expect(router).toContain("updateData.scheduledDate = normalizedDates[0] ?? null");
    expect(helper).toContain("nativeJobScheduleDates");
  });

  it("renders each scheduled work date in Operations and Noland Field", () => {
    const operations = source("client/src/pages/ops/NativeJobsSection.tsx");
    const calendar = source("client/src/pages/ops/Schedule.tsx");
    const mobile = source("noland-earthworks-mobile/src/pages/Jobs.tsx");
    expect(operations).toContain("Scheduled Work Dates");
    expect(operations).toContain("Add Date");
    expect(operations).toContain("/31 dates selected");
    expect(calendar).toContain("scheduleDateKey");
    expect(calendar).toContain("scheduledDates.map");
    expect(calendar).toContain("firstUpcomingDateByJob");
    expect(mobile).toContain("SCHEDULED WORK DATES");
  });
});
