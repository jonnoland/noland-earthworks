import { eq, inArray } from "drizzle-orm";
import { nativeJobScheduleDates } from "../drizzle/schema";

type DateLike = Date | string;

function dateKey(value: DateLike): string | null {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Normalizes work dates to unique UTC-noon values so calendar-day comparisons stay stable. */
export function normalizeJobScheduleDates(values: DateLike[]): Date[] {
  const unique = new Set<string>();
  for (const value of values) {
    const key = dateKey(value);
    if (key) unique.add(key);
  }
  return Array.from(unique)
    .sort()
    .map((key) => new Date(`${key}T12:00:00.000Z`));
}

export function getJobScheduleDates(
  job: { scheduledDate?: Date | null },
  explicitDates: DateLike[],
): Date[] {
  const normalized = normalizeJobScheduleDates(explicitDates);
  return normalized.length > 0
    ? normalized
    : job.scheduledDate
      ? normalizeJobScheduleDates([job.scheduledDate])
      : [];
}

/** Adds a customer-safe ordered schedule-date list to native job records. */
export async function attachJobScheduleDates<T extends { id: number; scheduledDate?: Date | null }>(db: any, jobs: T[]) {
  if (jobs.length === 0) return jobs.map((job) => ({ ...job, scheduledDates: [] as Date[] }));

  const queriedRows = await db
    .select()
    .from(nativeJobScheduleDates)
    .where(inArray(nativeJobScheduleDates.jobId, jobs.map((job) => job.id)));
  const rows = Array.isArray(queriedRows) ? queriedRows : [];

  const datesByJob = new Map<number, Date[]>();
  for (const row of rows as Array<{ jobId: number; scheduledDate: Date }>) {
    const dates = datesByJob.get(row.jobId) ?? [];
    dates.push(row.scheduledDate);
    datesByJob.set(row.jobId, dates);
  }

  return jobs.map((job) => ({
    ...job,
    scheduledDates: getJobScheduleDates(job, datesByJob.get(job.id) ?? []),
  }));
}

/** Replaces a job's explicit work dates and returns their normalized order. */
export async function saveJobScheduleDates(db: any, jobId: number, dates: DateLike[]): Promise<Date[]> {
  const normalized = normalizeJobScheduleDates(dates);
  await db.delete(nativeJobScheduleDates).where(eq(nativeJobScheduleDates.jobId, jobId));
  if (normalized.length > 0) {
    await db.insert(nativeJobScheduleDates).values(
      normalized.map((scheduledDate) => ({ jobId, scheduledDate })),
    );
  }
  return normalized;
}
