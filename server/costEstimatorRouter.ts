/**
 * AI Job Cost Estimator Router
 * Internal tool for Jon to estimate job costs before quoting.
 * Returns machine hours, fuel, mobilization, labor, equipment overhead,
 * total internal cost, customer price range, and margin analysis.
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { jobCostEstimates } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const estimatorInputSchema = z.object({
  service: z.string().min(1),
  acreage: z.number().min(0.1).max(500).optional(),
  linearFeet: z.number().min(1).max(50000).optional(),
  terrain: z.enum(["flat", "rolling", "steep", "very_steep"]),
  vegetationDensity: z.enum(["light", "moderate", "heavy", "very_heavy"]),
  accessDifficulty: z.enum(["easy", "moderate", "difficult"]),
  mobilizationMiles: z.number().min(0).max(300).default(0),
  hasStumps: z.boolean().default(false),
  stumpCount: z.number().min(0).max(500).default(0),
  notes: z.string().max(1000).optional(),
  leadId: z.number().optional(),
});

const COST_SYSTEM_PROMPT = `You are a job cost estimator for Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle Tennessee.

EQUIPMENT:
- Primary machine: Tracked forestry mulcher
- Machine operating cost: $85/hour (fuel + wear + maintenance)
- Machine productivity rates:
  * Forestry mulching, light vegetation, flat: 2.5 acres/day (8 hrs)
  * Forestry mulching, moderate vegetation, flat: 1.5 acres/day
  * Forestry mulching, heavy vegetation, flat: 0.8 acres/day
  * Forestry mulching, very heavy vegetation, flat: 0.5 acres/day
  * Steep terrain: reduce productivity by 30-40%
  * Very steep terrain: reduce productivity by 50-60%
  * ROW clearing: 400-600 linear feet/day depending on vegetation
- Stump grinding: 15-30 minutes per stump depending on size

MOBILIZATION:
- Trailer + truck fuel: $0.65/mile (round trip, so multiply miles × 2)
- Mobilization time: included in day rate
- Minimum mobilization charge: $150 for any job requiring trailer

LABOR:
- Jon's effective labor rate (owner-operator): $65/hour
- This covers his time on-site plus admin overhead

OVERHEAD & PROFIT:
- Equipment depreciation/overhead: $25/hour on top of operating cost
- Target gross margin: 40-50% on customer price vs total internal cost
- Minimum job value: $800 (below this, mobilization doesn't justify the trip)

PRICING STRUCTURE:
- Flat rate for small residential lots (< 1 acre)
- Per-acre rate for larger jobs with adjustments for terrain and density
- ROW: per linear foot ($4-$8/LF depending on vegetation)
- Stump grinding: $150-$250 per stump

MARKET RATES (Middle Tennessee, 2025-2026):
- Forestry mulching: $800-$1,800/acre depending on conditions
- Land clearing (heavy): $1,200-$2,500/acre
- Brush hogging: $60-$120/acre
- ROW clearing: $4-$8/linear foot
- Stump grinding: $150-$250/stump

Return a detailed JSON cost breakdown. Be realistic and conservative — it is better to slightly overestimate costs than underestimate.`;

interface CostBreakdown {
  estimatedHours: number;
  estimatedDays: number;
  fuelCost: number;
  mobilizationCost: number;
  laborCost: number;
  equipmentCost: number;
  totalInternalCost: number;
  customerPriceLow: number;
  customerPriceHigh: number;
  marginPct: number;
  summary: string;
  warnings: string[];
  breakdown: {
    label: string;
    hours?: number;
    cost: number;
    note?: string;
  }[];
}

export const costEstimatorRouter = router({
  /** Generate an AI cost estimate for a job */
  estimate: protectedProcedure
    .input(estimatorInputSchema)
    .mutation(async ({ input, ctx }) => {
      const jobDescription = [
        `Service: ${input.service}`,
        input.acreage ? `Acreage: ${input.acreage} acres` : "",
        input.linearFeet ? `Linear feet: ${input.linearFeet} LF` : "",
        `Terrain: ${input.terrain.replace("_", " ")}`,
        `Vegetation density: ${input.vegetationDensity.replace("_", " ")}`,
        `Access difficulty: ${input.accessDifficulty}`,
        `Mobilization distance: ${input.mobilizationMiles} miles one-way`,
        input.hasStumps && input.stumpCount > 0 ? `Stumps to grind: ${input.stumpCount}` : "",
        input.notes ? `Additional notes: ${input.notes}` : "",
      ].filter(Boolean).join("\n");

      const result = await invokeLLM({
        messages: [
          { role: "system", content: COST_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Generate a detailed cost estimate for this job:\n\n${jobDescription}\n\nReturn JSON with the exact schema specified.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cost_estimate",
            strict: true,
            schema: {
              type: "object",
              properties: {
                estimatedHours: { type: "number", description: "Total machine + labor hours on site" },
                estimatedDays: { type: "number", description: "Estimated working days" },
                fuelCost: { type: "number", description: "Fuel cost for machine operation" },
                mobilizationCost: { type: "number", description: "Trailer/truck mobilization cost" },
                laborCost: { type: "number", description: "Jon's labor cost at $65/hr" },
                equipmentCost: { type: "number", description: "Machine operating + depreciation cost" },
                totalInternalCost: { type: "number", description: "Total internal cost (fuel + mob + labor + equipment)" },
                customerPriceLow: { type: "number", description: "Recommended customer price low end" },
                customerPriceHigh: { type: "number", description: "Recommended customer price high end" },
                marginPct: { type: "number", description: "Gross margin percentage at midpoint price" },
                summary: { type: "string", description: "2-3 sentence plain-English summary of the estimate" },
                warnings: {
                  type: "array",
                  items: { type: "string" },
                  description: "Any concerns or flags (thin margin, difficult access, etc.)",
                },
                breakdown: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      hours: { type: "number" },
                      cost: { type: "number" },
                      note: { type: "string" },
                    },
                    required: ["label", "cost"],
                    additionalProperties: false,
                  },
                  description: "Line-item cost breakdown",
                },
              },
              required: [
                "estimatedHours", "estimatedDays", "fuelCost", "mobilizationCost",
                "laborCost", "equipmentCost", "totalInternalCost",
                "customerPriceLow", "customerPriceHigh", "marginPct",
                "summary", "warnings", "breakdown",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty LLM response");

      const parsed: CostBreakdown = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

      // Persist to DB
      const db = await getDb();
      if (db) {
        try {
          await db.insert(jobCostEstimates).values({
            userId: ctx.user.id,
            leadId: input.leadId ?? null,
            service: input.service,
            acreage: input.acreage?.toString() ?? null,
            terrain: input.terrain,
            vegetationDensity: input.vegetationDensity,
            accessDifficulty: input.accessDifficulty,
            mobilizationMiles: input.mobilizationMiles,
            notes: input.notes ?? null,
            estimatedHours: parsed.estimatedHours.toString(),
            estimatedDays: parsed.estimatedDays.toString(),
            fuelCost: parsed.fuelCost.toString(),
            mobilizationCost: parsed.mobilizationCost.toString(),
            laborCost: parsed.laborCost.toString(),
            equipmentCost: parsed.equipmentCost.toString(),
            totalInternalCost: parsed.totalInternalCost.toString(),
            customerPriceLow: parsed.customerPriceLow.toString(),
            customerPriceHigh: parsed.customerPriceHigh.toString(),
            marginPct: parsed.marginPct.toString(),
            aiSummary: parsed.summary,
            aiWarnings: parsed.warnings.length > 0 ? JSON.stringify(parsed.warnings) : null,
          });
        } catch (err) {
          console.warn("[CostEstimator] Failed to persist estimate:", err);
        }
      }

      return parsed;
    }),

  /** List recent estimates */
  listRecent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(jobCostEstimates)
        .where(eq(jobCostEstimates.userId, ctx.user.id))
        .orderBy(desc(jobCostEstimates.createdAt))
        .limit(input.limit);
    }),
});
