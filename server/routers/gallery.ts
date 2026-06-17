/**
 * Gallery router — public listing + owner CRUD for job photos.
 */
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { galleryItems, type GalleryItem } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { storagePut } from "../storage";

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwnerByOpenId = ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId;
  const isOwnerByRole = ctx.user.role === "admin";
  if (!isOwnerByOpenId && !isOwnerByRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access only." });
  }
  return next({ ctx });
});

const serviceEnum = z.enum(["forestry_mulching", "land_clearing", "vegetation_management"]);
const photoTypeEnum = z.enum(["before", "after", "in_progress", "general"]);

export const galleryRouter = router({
  /** Published items for the public site, ordered for display. */
  listPublic: publicProcedure
    .input(
      z
        .object({
          featuredOnly: z.boolean().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ input }): Promise<GalleryItem[]> => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(galleryItems.published, true)];
      if (input?.featuredOnly) {
        conditions.push(eq(galleryItems.featured, true));
      }

      const rows = await db
        .select()
        .from(galleryItems)
        .where(and(...conditions))
        .orderBy(asc(galleryItems.sortOrder), desc(galleryItems.createdAt))
        .limit(input?.limit ?? 1000);

      return input?.limit ? rows.slice(0, input.limit) : rows;
    }),

  /** All items for the ops dashboard. */
  list: ownerProcedure.query(async (): Promise<GalleryItem[]> => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(galleryItems)
      .orderBy(asc(galleryItems.sortOrder), desc(galleryItems.createdAt));
  }),

  uploadPhoto: ownerProcedure
    .input(
      z.object({
        base64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        filename: z.string().default("gallery-photo.jpg"),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Image must be under 10 MB." });
      }
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!allowed.includes(input.mimeType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported image type." });
      }
      const suffix = Date.now();
      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `gallery/${suffix}-${safeName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, key };
    }),

  create: ownerProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        imageUrl: z.string().url(),
        imageKey: z.string().max(512).optional(),
        service: serviceEnum.default("forestry_mulching"),
        county: z.string().max(100).optional(),
        acreage: z.string().max(100).optional(),
        photoType: photoTypeEnum.default("general"),
        featured: z.boolean().default(false),
        published: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [maxRow] = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${galleryItems.sortOrder}), -1)` })
        .from(galleryItems);
      const sortOrder = (maxRow?.maxOrder ?? -1) + 1;

      await db.insert(galleryItems).values({
        ...input,
        description: input.description ?? null,
        county: input.county ?? null,
        acreage: input.acreage ?? null,
        imageKey: input.imageKey ?? null,
        sortOrder,
      });

      const [created] = await db
        .select()
        .from(galleryItems)
        .orderBy(desc(galleryItems.id))
        .limit(1);
      return created!;
    }),

  update: ownerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).nullable().optional(),
        service: serviceEnum.optional(),
        county: z.string().max(100).nullable().optional(),
        acreage: z.string().max(100).nullable().optional(),
        photoType: photoTypeEnum.optional(),
        featured: z.boolean().optional(),
        published: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { id, ...updates } = input;
      const clean: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) clean[key] = value;
      }
      if (Object.keys(clean).length === 0) return { success: true };

      await db.update(galleryItems).set(clean).where(eq(galleryItems.id, id));
      return { success: true };
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(galleryItems).where(eq(galleryItems.id, input.id));
      return { success: true };
    }),

  move: ownerProcedure
    .input(z.object({ id: z.number().int().positive(), direction: z.enum(["up", "down"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [current] = await db
        .select()
        .from(galleryItems)
        .where(eq(galleryItems.id, input.id))
        .limit(1);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found." });

      const neighborQuery =
        input.direction === "up"
          ? db
              .select()
              .from(galleryItems)
              .where(lt(galleryItems.sortOrder, current.sortOrder))
              .orderBy(desc(galleryItems.sortOrder))
              .limit(1)
          : db
              .select()
              .from(galleryItems)
              .where(gt(galleryItems.sortOrder, current.sortOrder))
              .orderBy(asc(galleryItems.sortOrder))
              .limit(1);

      const [neighbor] = await neighborQuery;
      if (!neighbor) return { success: true };

      await db
        .update(galleryItems)
        .set({ sortOrder: neighbor.sortOrder })
        .where(eq(galleryItems.id, current.id));
      await db
        .update(galleryItems)
        .set({ sortOrder: current.sortOrder })
        .where(eq(galleryItems.id, neighbor.id));

      return { success: true };
    }),
});
