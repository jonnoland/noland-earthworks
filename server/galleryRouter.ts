/**
 * Gallery Router — manages job photo uploads, metadata, and public gallery feed.
 * All write operations are owner-only (adminProcedure).
 * listPhotos (public) is used by the public /gallery page.
 */
import { z } from "zod";
import { eq, desc, asc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { galleryPhotos, jobs } from "../drizzle/schema";
import { storagePut } from "./storage";

const SERVICE_TYPES = [
  "forestry-mulching",
  "land-management",
  "vegetation-management",
  "right-of-way-clearing",
  "trail-cutting",
  "brush-hogging",
  "stump-grinding",
  "gravel-driveway",
  "other",
] as const;

const PHOTO_TYPES = ["before", "after", "general"] as const;

export const galleryRouter = router({
  /**
   * Get a presigned-style upload URL — actually we receive the file bytes
   * as a base64 string from the client, upload to S3, and return the URL.
   * Max file size enforced on client side (10 MB).
   */
  uploadPhoto: adminProcedure
    .input(
      z.object({
        /** base64-encoded image data */
        base64: z.string().max(15_000_000), // ~10 MB base64
        /** MIME type: image/jpeg | image/png | image/webp | image/heic */
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"]),
        /** Original file name — used to build the S3 key */
        fileName: z.string().max(200),
        /** Photo metadata */
        title: z.string().max(200).default(""),
        description: z.string().max(2000).optional(),
        serviceType: z.enum(SERVICE_TYPES).default("forestry-mulching"),
        county: z.string().max(100).default("Middle Tennessee"),
        acreage: z.string().max(50).optional(),
        photoType: z.enum(PHOTO_TYPES).default("general"),
        jobId: z.number().int().optional(),
        visible: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Decode base64 → Buffer
      const buffer = Buffer.from(input.base64, "base64");

      // Build a unique S3 key
      const ext = input.mimeType.split("/")[1].replace("jpeg", "jpg");
      const safeName = input.fileName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.[^.]+$/, "");
      const s3Key = `gallery/${Date.now()}-${safeName}.${ext}`;

      // Upload to S3
      const { url } = await storagePut(s3Key, buffer, input.mimeType);

      // Get current max sortOrder
      const existing = await db
        .select({ sortOrder: galleryPhotos.sortOrder })
        .from(galleryPhotos)
        .orderBy(desc(galleryPhotos.sortOrder))
        .limit(1);
      const nextSort = existing.length > 0 ? existing[0].sortOrder + 1 : 0;

      // Insert row
      const [inserted] = await db
        .insert(galleryPhotos)
        .values({
          url,
          s3Key,
          title: input.title,
          description: input.description ?? null,
          serviceType: input.serviceType,
          county: input.county,
          acreage: input.acreage ?? null,
          photoType: input.photoType,
          jobId: input.jobId ?? null,
          visible: input.visible,
          sortOrder: nextSort,
        })
        .$returningId();

      const [photo] = await db
        .select()
        .from(galleryPhotos)
        .where(eq(galleryPhotos.id, inserted.id));

      return photo;
    }),

  /**
   * List all photos — ops view (all photos, including hidden).
   */
  listAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(galleryPhotos)
      .orderBy(asc(galleryPhotos.sortOrder), desc(galleryPhotos.createdAt));
  }),

  /**
   * List visible photos — public gallery page.
   * Optional serviceType filter.
   */
  listPublic: publicProcedure
    .input(
      z.object({
        serviceType: z.enum([...SERVICE_TYPES, "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(galleryPhotos)
        .where(eq(galleryPhotos.visible, true))
        .orderBy(asc(galleryPhotos.sortOrder), desc(galleryPhotos.createdAt));

      if (input.serviceType === "all") return rows;
      return rows.filter((r) => r.serviceType === input.serviceType);
    }),

  /**
   * Update photo metadata.
   */
  updatePhoto: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        title: z.string().max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        serviceType: z.enum(SERVICE_TYPES).optional(),
        county: z.string().max(100).optional(),
        acreage: z.string().max(50).nullable().optional(),
        photoType: z.enum(PHOTO_TYPES).optional(),
        visible: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { id, ...fields } = input;
      // Remove undefined keys so we only update what was passed
      const update: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) update[k] = v;
      }

      await db.update(galleryPhotos).set(update).where(eq(galleryPhotos.id, id));
      const [updated] = await db
        .select()
        .from(galleryPhotos)
        .where(eq(galleryPhotos.id, id));
      return updated;
    }),

  /**
   * Delete a photo (removes DB row; S3 object is orphaned — acceptable for now).
   */
  deletePhoto: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(galleryPhotos).where(eq(galleryPhotos.id, input.id));
      return { success: true };
    }),

  /**
   * Get photos linked to a specific job by local integer ID.
   */
  getByJobId: adminProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(galleryPhotos)
        .where(eq(galleryPhotos.jobId, input.jobId))
        .orderBy(asc(galleryPhotos.sortOrder), desc(galleryPhotos.createdAt));
    }),

  /**
   * Get photos linked to a Jobber job string ID.
   * Looks up the local job row by jobberJobId, then returns gallery photos for that local job.
   */
  getByJobberJobId: adminProcedure
    .input(z.object({ jobberJobId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Find the local job row that corresponds to this Jobber job
      const [localJob] = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(eq(jobs.jobberJobId, input.jobberJobId))
        .limit(1);
      if (!localJob) return [];
      return db
        .select()
        .from(galleryPhotos)
        .where(eq(galleryPhotos.jobId, localJob.id))
        .orderBy(asc(galleryPhotos.sortOrder), desc(galleryPhotos.createdAt));
    }),

  /**
   * Bulk reorder — accepts an ordered array of photo IDs.
   */
  reorder: adminProcedure
    .input(z.object({ orderedIds: z.array(z.number().int()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      for (let i = 0; i < input.orderedIds.length; i++) {
        await db
          .update(galleryPhotos)
          .set({ sortOrder: i })
          .where(eq(galleryPhotos.id, input.orderedIds[i]));
      }
      return { success: true };
    }),
});
