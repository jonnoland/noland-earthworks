/**
 * AI Job Cost Estimator Router
 * Internal tool for Jon to estimate job costs before quoting.
 * Returns machine hours, fuel, travel surcharge, labor, equipment overhead,
 * total internal cost, customer price range, and margin analysis.
 * All rates are synced to DEFAULT_CONFIG in Pricing.tsx.
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
  // Trail Cutting specific
  trailWidth: z.number().min(4).max(40).optional(),
  trailAddOns: z.array(z.string()).optional(),
  // ROW Clearing specific
  rowWidth: z.number().min(4).max(200).optional(),
  // Universal add-ons
  addOns: z.array(z.string()).optional(),
  fenceLineLF: z.number().min(0).max(50000).optional(),
});

// ─── Pricing constants (keep in sync with DEFAULT_CONFIG in Pricing.tsx) ──────
const HOURS_PER_DAY = 8;
const WAGE_PER_HOUR = 28;           // Jon's hourly wage
const BURDEN_PCT = 0.25;            // 25% payroll burden
const LABOR_PER_DAY = HOURS_PER_DAY * WAGE_PER_HOUR * (1 + BURDEN_PCT); // $280/day

const EQUIPMENT_MONTHLY = 2200;     // CAT 299D3 XE monthly payment
const WORKING_DAYS_PER_MONTH = 20;
const EQUIPMENT_PER_DAY = EQUIPMENT_MONTHLY / WORKING_DAYS_PER_MONTH; // $110/day

const MACHINE_GPH = 7;              // gallons per hour
const FUEL_PRICE = 5.33;            // per gallon
const MACHINE_FUEL_PER_DAY = MACHINE_GPH * HOURS_PER_DAY * FUEL_PRICE; // ~$298.48/day
const TRUCK_FUEL_PER_DAY = 65;      // truck/trailer fuel per day

const TEETH_COST_PER_SET = 2200;
const DAYS_PER_SET = 12;
const TEETH_PER_DAY = TEETH_COST_PER_SET / DAYS_PER_SET; // $183.33/day

const ANNUAL_MAJOR_WEAR = 18000;
const WEAR_PER_DAY = ANNUAL_MAJOR_WEAR / (WORKING_DAYS_PER_MONTH * 12); // $75/day

const MISC_CONSUMABLES_PER_DAY = 35;

const TOTAL_INTERNAL_COST_PER_DAY =
  LABOR_PER_DAY +
  EQUIPMENT_PER_DAY +
  MACHINE_FUEL_PER_DAY +
  TRUCK_FUEL_PER_DAY +
  TEETH_PER_DAY +
  WEAR_PER_DAY +
  MISC_CONSUMABLES_PER_DAY; // ~$1,046.81/day

const TARGET_MARGIN_PCT = 30; // gross margin target

// Travel surcharge tiers (one-way miles from Vanleer, TN)
const MOB_TIERS = [
  { maxMiles: 30,  label: "Local (0–30 mi)",      surcharge: 0 },
  { maxMiles: 50,  label: "Near (31–50 mi)",       surcharge: 150 },
  { maxMiles: 75,  label: "Regional (51–75 mi)",   surcharge: 300 },
  { maxMiles: 100, label: "Extended (76–100 mi)",  surcharge: 500 },
  { maxMiles: 999, label: "Long-Haul (100+ mi)",   surcharge: 750 },
];

function getTravelSurcharge(miles: number): number {
  return (MOB_TIERS.find(t => miles <= t.maxMiles) ?? MOB_TIERS[MOB_TIERS.length - 1]).surcharge;
}

const COST_SYSTEM_PROMPT = `You are a job cost estimator for Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle Tennessee.

EXACT CURRENT RATES (use these numbers precisely — do not substitute generic values):

LABOR:
- Jon's wage: $28/hour × 8 hrs/day × 1.25 burden = $280.00/day
- He is the sole operator — no crew

EQUIPMENT:
- CAT 299D3 XE monthly payment: $2,200 ÷ 20 working days = $110.00/day

FUEL:
- Machine fuel: 7 GPH × 8 hrs × $5.33/gal = $298.48/day
- Truck/trailer fuel: $65.00/day
- Total fuel per day: $363.48

WEAR & CONSUMABLES:
- Teeth set: $2,200 per set ÷ 12 days = $183.33/day
- Major maintenance/wear: $18,000/year ÷ 240 working days = $75.00/day
- Misc consumables: $35.00/day
- Total wear per day: $293.33

TOTAL INTERNAL COST PER DAY: $1,046.81
TARGET GROSS MARGIN: 30% (customer price = total cost ÷ 0.70)
MINIMUM JOB VALUE: $800

PRODUCTIVITY RATES (acres per 8-hour day):
- Light vegetation, flat: 2.5 acres/day
- Moderate vegetation, flat: 1.5 acres/day
- Heavy vegetation, flat: 0.8 acres/day
- Very heavy vegetation, flat: 0.5 acres/day
- Rolling terrain: reduce productivity by 15–20%
- Steep terrain: reduce productivity by 30–40%
- Very steep terrain: reduce productivity by 50–60%
- ROW clearing: 400–600 linear feet/day depending on vegetation
- Stump grinding: 15–30 minutes per stump

TRAVEL SURCHARGE (one-way miles from Vanleer, TN — flat fee, not per-mile):
- 0–30 miles: $0 (local, no surcharge)
- 31–50 miles: $150
- 51–75 miles: $300
- 76–100 miles: $500
- 100+ miles: $750

MARKET RATES (Middle Tennessee, 2025–2026):
- Forestry mulching: $650–$1,200/acre (light-moderate); $1,200–$2,000+/acre (dense cedar/hardwood or steep terrain)
- Land management / land clearing: $550–$1,000/acre; heavy clearing $1,200–$2,500/acre
- Vegetation management: $500–$900/acre
- ROW clearing: $600–$1,100/acre (effective acres — length × width ÷ 43,560)
- Trail cutting: $2.00–$4.00/lf (flat), $2.40–$4.80/lf (sloped +20%), $2.80–$5.60/lf (rocky +40%); quote in effective acres (length × width ÷ 43,560) OR linear feet; $500 minimum; standard width 6–16 ft
- Brush hogging: $150–$350/acre
- Stump grinding: $150–$250/stump

REQUIRED BREAKDOWN — you MUST include one line item per cost component below. Do not combine or omit any:
1. Labor — Jon's time on site ($28/hr × hours × 1.25 burden). Note must show: hours × rate × burden = total.
2. Equipment (CAT 299D3 XE) — $110/day × days. Note must show: days × $110 = total.
3. Machine Fuel — 7 GPH × hours × $5.33/gal. Note must show: GPH × hours × price = total.
4. Truck/Trailer Fuel — $65/day × days. Note must show: days × $65 = total.
5. Teeth & Cutting Wear — $183.33/day × days. Note must show: days × $183.33 = total.
6. Maintenance & Major Wear — $75/day × days. Note must show: days × $75 = total.
7. Misc Consumables — $35/day × days. Note must show: days × $35 = total.
8. Travel Surcharge — flat fee based on distance tier. Note must show the tier name and amount. Omit this line only if distance is 0–30 miles.
9. Stump Grinding — if applicable. Note must show: count × rate = total.

Each breakdown item must include: label (string), cost (number in dollars), hours (number, if applicable), and note (string showing the calculation).

The totalInternalCost field must equal the sum of all breakdown item costs.
The customerPriceLow and customerPriceHigh must be derived from totalInternalCost ÷ (1 − margin) and reflect realistic Middle Tennessee market rates.

Be realistic and conservative — it is better to slightly overestimate costs than underestimate.`;

export interface CostBreakdown {
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
      const travelSurcharge = getTravelSurcharge(input.mobilizationMiles);
      const mobTierLabel = MOB_TIERS.find(t => input.mobilizationMiles <= t.maxMiles)?.label ?? "Long-Haul (100+ mi)";

      // Compute effective acres for ROW and Trail Cutting when LF + width are provided
      let effectiveAcresNote = "";
      if (input.service === "Right-of-Way Clearing" && input.linearFeet && input.rowWidth) {
        const ea = (input.linearFeet * input.rowWidth) / 43560;
        effectiveAcresNote = `Effective acres (${input.linearFeet} LF × ${input.rowWidth} ft wide ÷ 43,560): ${ea.toFixed(3)} acres`;
      }
      if (input.service === "Trail Cutting" && input.acreage && input.trailWidth) {
        const lf = Math.round((input.acreage * 43560) / input.trailWidth);
        effectiveAcresNote = `Trail geometry: ${input.acreage} effective acres × 43,560 ÷ ${input.trailWidth} ft wide ≈ ${lf.toLocaleString()} linear feet`;
      }

      const addOnLines: string[] = [];
      if (input.trailAddOns && input.trailAddOns.length > 0) {
        addOnLines.push(`Trail add-ons requested: ${input.trailAddOns.join(", ")}`);
      }
      if (input.addOns && input.addOns.length > 0) {
        addOnLines.push(`Add-ons requested: ${input.addOns.join(", ")}`);
      }
      if (input.fenceLineLF && input.fenceLineLF > 0) {
        addOnLines.push(`Fence line clearing: ${input.fenceLineLF} linear feet (price separately at $1.50–$12/lf depending on density)`);
      }

      const jobDescription = [
        `Service: ${input.service}`,
        input.acreage ? `Acreage: ${input.acreage} acres` : "",
        input.linearFeet ? `Linear feet: ${input.linearFeet} LF` : "",
        input.trailWidth ? `Trail width: ${input.trailWidth} ft` : "",
        input.rowWidth ? `ROW width: ${input.rowWidth} ft` : "",
        effectiveAcresNote,
        `Terrain: ${input.terrain.replace("_", " ")}`,
        `Vegetation density: ${input.vegetationDensity.replace("_", " ")}`,
        `Access difficulty: ${input.accessDifficulty}`,
        `Distance from Vanleer, TN: ${input.mobilizationMiles} miles one-way`,
        `Travel surcharge tier: ${mobTierLabel} — flat surcharge: $${travelSurcharge}`,
        input.hasStumps && input.stumpCount > 0 ? `Stumps to grind: ${input.stumpCount}` : "",
        ...addOnLines,
        input.notes ? `Additional notes: ${input.notes}` : "",
      ].filter(Boolean).join("\n");

      const result = await invokeLLM({
        messages: [
          { role: "system", content: COST_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Generate a detailed cost estimate for this job:\n\n${jobDescription}\n\nReturn JSON with the exact schema specified. Show all math in the breakdown notes.`,
          },
        ],
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cost_estimate",
            strict: true,
            schema: {
              type: "object",
              properties: {
                estimatedHours: { type: "number", description: "Total machine + labor hours on site" },
                estimatedDays: { type: "number", description: "Estimated working days (hours ÷ 8)" },
                fuelCost: { type: "number", description: "Total fuel cost (machine + truck) for all days" },
                mobilizationCost: { type: "number", description: "Travel surcharge flat fee based on distance tier" },
                laborCost: { type: "number", description: "Jon's labor cost at $28/hr × 1.25 burden" },
                equipmentCost: { type: "number", description: "CAT 299D3 XE equipment cost at $110/day" },
                totalInternalCost: { type: "number", description: "Sum of ALL breakdown line items" },
                customerPriceLow: { type: "number", description: "Recommended customer price low end (cost ÷ 0.75 or market floor, whichever is higher)" },
                customerPriceHigh: { type: "number", description: "Recommended customer price high end (cost ÷ 0.65 or market ceiling)" },
                marginPct: { type: "number", description: "Gross margin percentage at midpoint price" },
                summary: { type: "string", description: "2-3 sentence plain-English summary of the estimate including total days, key cost drivers, and recommended price range" },
                warnings: {
                  type: "array",
                  items: { type: "string" },
                  description: "Any concerns or flags (thin margin, difficult access, long distance, etc.)",
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
                    required: ["label", "cost", "note"],
                    additionalProperties: false,
                  },
                  description: "Itemized cost breakdown — one line per cost component, note must show the calculation",
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
