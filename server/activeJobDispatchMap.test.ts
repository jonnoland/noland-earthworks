import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const jobsSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/NativeJobsSection.tsx"), "utf8");
const jobsRouterSource = readFileSync(resolve(import.meta.dirname, "nativeJobsRouter.ts"), "utf8");

describe("Operations active-job dispatch map", () => {
  it("maps pending, active, and completed jobs while keeping each work-area polygon visible", () => {
    expect(jobsSource).toContain("trpc.nativeJobs.activeMap.useQuery()");
    expect(jobsRouterSource).toContain("activeMap: ownerProcedure.query");
    expect(jobsRouterSource).toContain('eq(nativeJobs.status, "scheduled")');
    expect(jobsRouterSource).toContain('eq(nativeJobs.status, "in_progress")');
    expect(jobsRouterSource).toContain('eq(nativeJobs.status, "completed")');
    expect(jobsSource).toContain("function ActiveJobsDispatchMap");
    expect(jobsSource).toContain("dispatchMapStatusStyle(job.status)");
    expect(jobsSource).toContain("Status-colored work area");
    expect(jobsSource).toContain("Completed");
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
    expect(jobsSource).toContain("Dispatch Job Map");
    expect(jobsSource).toContain('polygon.addListener("click"');
    expect(jobsSource).toContain("Owner:");
    expect(jobsSource).toContain("Quote #");
    expect(jobsRouterSource).toContain("quoteTitle: quote?.title ?? null");
    expect(jobsRouterSource).toContain("quoteStatus: quote?.status ?? null");
  });
});
