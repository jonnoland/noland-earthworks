import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Noland Field Jobs section", () => {
  it("exposes PIN-protected native Operations jobs and field-note updates", () => {
    const router = source("server/fieldQuoteRouter.ts");

    expect(router).toContain("mobileJobs: requireAppToken");
    expect(router).toContain("from(nativeJobs)");
    expect(router).toContain("mobileUpdateJobNotes: requireAppToken");
    expect(router).toContain('internalNotes: z.string().trim().max(5000)');
    expect(router).toContain("internalNotes: nextNotes");
  });

  it("adds the Jobs route, navigation item, and synchronized field-note UI", () => {
    const app = source("noland-earthworks-mobile/src/App.tsx");
    const nav = source("noland-earthworks-mobile/src/components/BottomNav.tsx");
    const page = source("noland-earthworks-mobile/src/pages/Jobs.tsx");

    expect(app).toContain('path="/jobs" element={<Jobs />}');
    expect(nav).toContain('{ to: "/jobs", icon: CalendarDays, label: "Jobs" }');
    expect(page).toContain("trpc.fieldQuote.mobileJobs.useQuery");
    expect(page).toContain("trpc.fieldQuote.mobileUpdateJobNotes.useMutation");
    expect(page).toContain("syncs with Operations");
  });

  it("shows Parcel ID map context, measured work-area status, owner, and current quote details for field dispatch", () => {
    const router = source("server/fieldQuoteRouter.ts");
    const page = source("noland-earthworks-mobile/src/pages/Jobs.tsx");

    expect(router).toContain("const effectiveRows = rows.map");
    expect(router).toContain("parcelId: job.parcelId ?? quote?.parcelId ?? null");
    expect(router).toContain("quoteTotalCents: quote?.totalCents ?? job.totalCents");
    expect(page).toContain("function JobPropertyMap");
    expect(page).toContain("trpc.fieldQuote.lookupParcel.useMutation");
    expect(page).toContain("BLUE");
    expect(page).toContain("measured work area");
    expect(page).toContain("PROPERTY OWNER");
    expect(page).toContain("CURRENT QUOTE");
    expect(page).toContain("html,body,#map{margin:0;padding:0;width:100%;height:100%;}");
  });
});
