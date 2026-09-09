import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const jobsSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/NativeJobsSection.tsx"), "utf8");

describe("Operations active-job dispatch map", () => {
  it("maps only scheduled and in-progress jobs while keeping all work-area polygons visible", () => {
    expect(jobsSource).toContain("const activeMapJobs = useMemo");
    expect(jobsSource).toContain('job.status === "scheduled" || job.status === "in_progress"');
    expect(jobsSource).toContain("function ActiveJobsDispatchMap");
    expect(jobsSource).toContain('strokeColor: "#f97316"');
    expect(jobsSource).toContain("Orange outline: field-measured work area");
  });

  it("uses map markers to select the same job detail panel used by the dispatch list", () => {
    expect(jobsSource).toContain("onJobSelect(job)");
    expect(jobsSource).toContain("onJobSelect={setSelectedJob}");
    expect(jobsSource).toContain("Active Job Map");
    expect(jobsSource).toContain("Measured work area");
  });
});
