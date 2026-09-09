import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const jobsSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/NativeJobsSection.tsx"), "utf8");
const jobsRouterSource = readFileSync(resolve(import.meta.dirname, "nativeJobsRouter.ts"), "utf8");

describe("Operations active-job dispatch map", () => {
  it("maps only scheduled and in-progress jobs while keeping all work-area polygons visible", () => {
    expect(jobsSource).toContain("trpc.nativeJobs.activeMap.useQuery()");
    expect(jobsRouterSource).toContain("activeMap: ownerProcedure.query");
    expect(jobsRouterSource).toContain('eq(nativeJobs.status, "scheduled")');
    expect(jobsRouterSource).toContain('eq(nativeJobs.status, "in_progress")');
    expect(jobsSource).toContain("function ActiveJobsDispatchMap");
    expect(jobsSource).toContain('strokeColor: "#f97316"');
    expect(jobsSource).toContain("Orange outline: field-measured work area");
  });

  it("resolves a saved Parcel ID and county before using the field work area or address fallback", () => {
    expect(jobsSource).toContain("trpc.parcel.boundary.useMutation()");
    expect(jobsSource).toContain("await parcelBoundaryMutation.mutateAsync({ parcelId: job.parcelId, county: job.parcelCounty })");
    expect(jobsSource).toContain('strokeColor: "#38bdf8"');
    expect(jobsSource).toContain("Official Parcel ID location");
    expect(jobsSource).toContain("Address geocode fallback");
    expect(jobsSource).toContain("Blue outline: official parcel boundary");
    expect(jobsRouterSource).toContain("const quoteById = new Map(linkedQuotes.map");
    expect(jobsRouterSource).toContain("parcelId: job.parcelId ?? quote?.parcelId ?? null");
    expect(jobsRouterSource).toContain("workAreaPolygon: job.workAreaPolygon ?? quote?.workAreaPolygon ?? null");
  });

  it("uses map markers to select the same job detail panel used by the dispatch list", () => {
    expect(jobsSource).toContain("onJobSelect(job)");
    expect(jobsSource).toContain("onJobSelect={setSelectedJob}");
    expect(jobsSource).toContain("Active Job Map");
    expect(jobsSource).toContain("Measured work area");
  });
});
