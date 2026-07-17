import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { getOwnerUser, createOpsLead, upsertOpsLeadByPhone, updateOpsLeadById, getVisitBlackoutDates, addVisitBlackoutDate, removeVisitBlackoutDate, getRecurringBlackoutDays, getDb } from "./db";
import { aiPricingSettings } from "../drizzle/schema";
import { Resend } from "resend";

const SERVICE_LABELS: Record<string, string> = {
  "forestry-mulching": "Forestry Mulching",
  "land-management": "Land Management",
  "vegetation-management": "Vegetation Management",
  "right-of-way-clearing": "Right-of-Way Clearing",
  "property-maintenance": "Property Maintenance",
  "trail-cutting": "Trail Cutting",
  "stump-grinding-only": "Stump Grinding Only",
};

function getResend() {
  return ENV.resendApiKey ? new Resend(ENV.resendApiKey) : null;
}

export const widgetRouter = router({
  /**
   * Public endpoint — no auth required.
   * Receives a rough estimate submission from the Pricing page calculator.
   * Saves the visitor as a new CRM lead with full estimate context and notifies the owner.
   */
  submitEstimate: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        phone: z.string().min(7).max(20),
        email: z.string().email().optional(),
        service: z.string().min(1).max(80),
        acres: z.number().positive(),
        density: z.string(),
        terrain: z.string(),
        access: z.string(),
        estimateLow: z.number(),
        estimateHigh: z.number(),
        message: z.string().max(500).optional(),
        addOns: z.array(z.string()).optional().default([]),
        // Trail Cutting extras
        linearFeet: z.number().positive().optional(),
        trailWidth: z.string().optional(),
        // ROW extras
        rowWidth: z.number().positive().optional(),
        // Stump grinding
        stumpCount: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const svcLabel = SERVICE_LABELS[input.service] ?? input.service;
      const notes = [
        `Rough estimate submitted from the Pricing page calculator.`,
        `Service: ${svcLabel}`,
        input.service === "trail-cutting" && input.linearFeet ? `Linear feet: ${input.linearFeet} LF` : `Acreage: ${input.acres} acres`,
        input.trailWidth ? `Trail width: ${input.trailWidth}` : "",
        input.service === "right-of-way-clearing" && input.rowWidth ? `ROW width: ${input.rowWidth} ft` : "",
        input.service === "stump-grinding-only" && input.stumpCount ? `Stump count: ${input.stumpCount} stumps` : "",
        input.service !== "stump-grinding-only" ? `Vegetation density: ${input.density}` : "",
        `Terrain: ${input.terrain}`,
        `Site access: ${input.access}`,
        `Estimate range: $${input.estimateLow.toLocaleString()} – $${input.estimateHigh.toLocaleString()}`,
        input.addOns && input.addOns.length > 0 ? `Add-on services: ${input.addOns.join(", ")}` : "",
        input.message ? `\nAdditional notes: ${input.message}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      let leadId: number | null = null;
      try {
        const owner = await getOwnerUser();
        if (owner) {
          const { leadId: upsertedId, created } = await upsertOpsLeadByPhone({
            userId: owner.id,
            name: input.name,
            phone: input.phone,
            email: input.email,
            source: "website",
            stage: "new",
            jobType: svcLabel,
            estimatedValue: String(
              ((input.estimateLow + input.estimateHigh) / 2).toFixed(2)
            ),
            notes,
          });
          leadId = upsertedId;
          console.log(`[Widget] Estimate lead ${created ? "created" : "updated"} (id=${upsertedId}) for phone ${input.phone}`);
        }
      } catch (err) {
        console.error("[Widget] submitEstimate CRM save failed:", err);
      }

      await notifyOwner({
        title: `New estimate lead: ${input.name}`,
        content: `Phone: ${input.phone}\nService: ${svcLabel}\nAcreage: ${input.acres} acres\nEstimate: $${input.estimateLow.toLocaleString()} \u2013 $${input.estimateHigh.toLocaleString()}`,
      }).catch(() => {});

      // Send email notification to owner
      const resend = getResend();
      if (resend) {
        await resend.emails.send({
          from: "Noland Earthworks <noreply@nolandearthworks.com>",
          to: ["quotes@nolandearthworks.com"],
          subject: `New Estimate Lead: ${input.name} \u2014 ${svcLabel} (${input.service === "trail-cutting" && input.linearFeet ? input.linearFeet + " LF" : input.acres + " acres"})`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
              <div style="background:#1a1a1a;padding:24px 32px;">
                <h1 style="color:#d97706;margin:0;font-size:22px;letter-spacing:1px;">NOLAND EARTHWORKS</h1>
                <p style="color:#888;margin:4px 0 0;font-size:13px;">New Pricing Calculator Lead</p>
              </div>
              <div style="padding:32px;">
                <h2 style="color:#1a1a1a;margin-top:0;">New Estimate Submission</h2>
                <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                  <tr><td style="padding:8px 0;color:#888;width:140px;">Name</td><td style="padding:8px 0;color:#1a1a1a;font-weight:600;">${input.name}</td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Phone</td><td style="padding:8px 0;color:#1a1a1a;font-weight:600;"><a href="tel:${input.phone}" style="color:#d97706;">${input.phone}</a></td></tr>
                  ${input.email ? `<tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;color:#1a1a1a;">${input.email}</td></tr>` : ""}
                  <tr><td style="padding:8px 0;color:#888;">Service</td><td style="padding:8px 0;color:#1a1a1a;">${svcLabel}</td></tr>
                  ${input.service === "trail-cutting" && input.linearFeet ? `<tr><td style="padding:8px 0;color:#888;">Linear Feet</td><td style="padding:8px 0;color:#1a1a1a;">${input.linearFeet} LF</td></tr>` : `<tr><td style="padding:8px 0;color:#888;">Acreage</td><td style="padding:8px 0;color:#1a1a1a;">${input.acres} acres</td></tr>`}
                  ${input.trailWidth ? `<tr><td style="padding:8px 0;color:#888;">Trail Width</td><td style="padding:8px 0;color:#1a1a1a;">${input.trailWidth}</td></tr>` : ""}
                  ${input.rowWidth ? `<tr><td style="padding:8px 0;color:#888;">ROW Width</td><td style="padding:8px 0;color:#1a1a1a;">${input.rowWidth} ft</td></tr>` : ""}
                  ${input.stumpCount ? `<tr><td style="padding:8px 0;color:#888;">Stump Count</td><td style="padding:8px 0;color:#1a1a1a;">${input.stumpCount} stumps</td></tr>` : ""}
                  <tr><td style="padding:8px 0;color:#888;">Density</td><td style="padding:8px 0;color:#1a1a1a;">${input.density}</td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Terrain</td><td style="padding:8px 0;color:#1a1a1a;">${input.terrain}</td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Site Access</td><td style="padding:8px 0;color:#1a1a1a;">${input.access}</td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Estimate Range</td><td style="padding:8px 0;color:#1a1a1a;font-weight:600;">$${input.estimateLow.toLocaleString()} \u2013 $${input.estimateHigh.toLocaleString()}</td></tr>
                  ${input.addOns && input.addOns.length > 0 ? `<tr><td style="padding:8px 0;color:#888;">Add-ons</td><td style="padding:8px 0;color:#1a1a1a;">${input.addOns.join(", ")}</td></tr>` : ""}
                  ${input.message ? `<tr><td style="padding:8px 0;color:#888;">Notes</td><td style="padding:8px 0;color:#1a1a1a;">${input.message}</td></tr>` : ""}
                </table>
                <a href="https://www.nolandearthworks.com/ops/leads" style="display:inline-block;background:#d97706;color:#fff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:14px 32px;border-radius:6px;text-decoration:none;">View in Ops Dashboard</a>
              </div>
            </div>
          `,
        }).catch((e: unknown) => console.error("[Widget] Owner email failed:", e));
      }

      return { ok: true, leadId };
    }),

  /**
   * Public endpoint — no auth required.
   * Returns all blackout dates so the date picker can disable them.
   */
  getBlackoutDates: publicProcedure.query(async () => {
    const rows = await getVisitBlackoutDates().catch(() => []);
    return rows.map((r) => r.date); // string[] of YYYY-MM-DD
  }),

  /**
   * Public endpoint — no auth required.
   * Returns recurring blackout days-of-week (0=Sun, 6=Sat) so the date picker can disable them.
   */
  getRecurringBlackoutDays: publicProcedure.query(async () => {
    const rows = await getRecurringBlackoutDays().catch(() => []);
    return rows.map((r) => r.dayOfWeek); // number[] e.g. [0, 6] for every Sat+Sun
  }),

  /**
   * Public endpoint — no auth required.
   * Saves a requested site visit date/time to an existing lead record.
   * Sends an automated email confirmation to the visitor.
   */
  requestVisit: publicProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        visitAt: z.date(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await updateOpsLeadById(input.leadId, { requestedVisitAt: input.visitAt });

        const visitFormatted = input.visitAt.toLocaleString("en-US", {
          timeZone: "America/Chicago",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        // Owner notification
        await notifyOwner({
          title: `Site visit requested${input.name ? ` — ${input.name}` : ""}`,
          content: `Lead #${input.leadId} requested a site visit on ${visitFormatted}.${input.phone ? `\nPhone: ${input.phone}` : ""}`,
        }).catch(() => {});

        // Visitor confirmation email
        if (input.email) {
          const resend = getResend();
          if (resend) {
            await resend.emails.send({
              from: "Noland Earthworks <noreply@nolandearthworks.com>",
              to: input.email,
              subject: "Site Visit Request Received — Noland Earthworks",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
                  <div style="background:#1a1a1a;padding:24px 32px;">
                    <h1 style="color:#d97706;margin:0;font-size:22px;letter-spacing:1px;">NOLAND EARTHWORKS</h1>
                    <p style="color:#888;margin:4px 0 0;font-size:13px;">Veteran-Owned Land Management</p>
                  </div>
                  <div style="padding:32px;">
                    <h2 style="color:#1a1a1a;margin-top:0;">Site Visit Request Received</h2>
                    <p style="color:#444;line-height:1.6;">Hi ${input.name ?? "there"},</p>
                    <p style="color:#444;line-height:1.6;">We received your request for a site visit on:</p>
                    <div style="background:#f5f5f5;border-left:4px solid #d97706;padding:16px 20px;margin:20px 0;">
                      <strong style="font-size:16px;color:#1a1a1a;">${visitFormatted} (Central Time)</strong>
                    </div>
                    <p style="color:#444;line-height:1.6;">Jon will review your request and confirm the visit time — or reach out to find a time that works if there is a scheduling conflict. You can expect to hear back within one business day.</p>
                    <p style="color:#444;line-height:1.6;">If you need to reach us sooner, call or text: <strong><a href="tel:6154064819" style="color:#d97706;">615-406-4819</a></strong></p>
                    <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">
                    <p style="color:#888;font-size:12px;margin:0;">Noland Earthworks, LLC &mdash; Vanleer, TN &mdash; <a href="https://nolandearthworks.com" style="color:#d97706;">nolandearthworks.com</a></p>
                  </div>
                </div>
              `,
            }).catch((e: unknown) => console.error("[Widget] Visit confirmation email failed:", e));
          }
        }

        return { ok: true };
      } catch (err) {
        console.error("[Widget] requestVisit failed:", err);
        return { ok: false };
      }
    }),

  /**
   * Public endpoint — no auth required.
   * Returns the active pricing ranges for the public cost calculator.
   * Only exposes the minimum data needed to compute estimate ranges.
   */
  getPublicPricingRanges: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(aiPricingSettings).limit(1);
    let row = rows[0];
    if (!row) {
      await db.insert(aiPricingSettings).values({});
      const seeded = await db.select().from(aiPricingSettings).limit(1);
      row = seeded[0];
    }
    if (!row) return null;
    return {
      forestryMulchingBaseRate:   row.forestryMulchingBaseRate,
      landClearingBaseRate:       row.landClearingBaseRate,
      brushHoggingBaseRate:       row.brushHoggingBaseRate,
      rowClearingBaseRate:        row.rowClearingBaseRate,
      mobilizationFee:            row.mobilizationFee,
      minimumJobTotal:            row.minimumJobTotal,
      densityModerateMultiplier:  row.densityModerateMultiplier,
      densityHeavyMultiplier:     row.densityHeavyMultiplier,
      terrainRollingMultiplier:   row.terrainRollingMultiplier,
      terrainSteepMultiplier:     row.terrainSteepMultiplier,
      accessModerateMultiplier:   row.accessModerateMultiplier,
      accessDifficultMultiplier:  row.accessDifficultMultiplier,
      priceRangeSpread:           row.priceRangeSpread,
      volumeDiscount3to5Pct:      row.volumeDiscount3to5Pct,
      volumeDiscount5to10Pct:     row.volumeDiscount5to10Pct,
      volumeDiscount10plusPct:    row.volumeDiscount10plusPct,
      // Add-on rates
      fenceLineClearingPerLf:     row.fenceLineClearingPerLf,
      mulchRedistributionPerAcre: row.mulchRedistributionPerAcre,
      selectiveClearingFlatRate:  row.selectiveClearingFlatRate,
      stumpGrindingPerStump:      row.stumpGrindingPerStump,
      // Trail cutting & vegetation management
      trailCuttingBaseRate:       row.trailCuttingBaseRate,
      vegetationMgmtBaseRate:     row.vegetationMgmtBaseRate,
    };
  }),
});
