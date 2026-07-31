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

  /** Send a copy of the detailed quote breakdown to the visitor's email */
  emailBreakdown: publicProcedure
    .input(z.object({
      email:        z.string().email(),
      service:      z.string(),
      acres:        z.number(),
      density:      z.string(),
      terrain:      z.string(),
      access:       z.string(),
      estimateLow:  z.number(),
      estimateHigh: z.number(),
      perAcreLow:   z.number(),
      perAcreHigh:  z.number(),
      mobilization: z.number(),
    }))
    .mutation(async ({ input }) => {
      const resend = getResend();
      if (!resend) return { ok: false, reason: "email_not_configured" };

      const svcLabel = SERVICE_LABELS[input.service] ?? input.service;
      const fmtUsd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
      const acreSubLow  = input.perAcreLow  * input.acres;
      const acreSubHigh = input.perAcreHigh * input.acres;
      const acreWord = input.acres === 1 ? "acre" : "acres";

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:6px;overflow:hidden;max-width:560px;width:100%;">
<tr><td style="background:#E07B2A;padding:20px 28px;">
  <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.75);">Noland Earthworks, LLC</p>
  <h1 style="margin:4px 0 0;font-size:22px;font-weight:700;color:#fff;">Your Rough Estimate</h1>
</td></tr>
<tr><td style="padding:24px 28px;">
  <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(240,237,230,0.4);">Service</p>
  <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#F0EDE6;">${svcLabel} &middot; ${input.acres} ${acreWord} &middot; ${input.density} density &middot; ${input.terrain} terrain</p>
  <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(240,237,230,0.4);">Price Breakdown</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:4px;">
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
      <td style="padding:10px 14px;font-size:13px;color:rgba(240,237,230,0.6);">Base rate &middot; ${input.acres} ${acreWord}</td>
      <td style="padding:10px 14px;font-size:13px;color:#F0EDE6;text-align:right;">${fmtUsd(acreSubLow)} &ndash; ${fmtUsd(acreSubHigh)}</td>
    </tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
      <td style="padding:10px 14px;font-size:13px;color:rgba(240,237,230,0.6);">Mobilization / travel</td>
      <td style="padding:10px 14px;font-size:13px;color:#F0EDE6;text-align:right;">${fmtUsd(input.mobilization)}</td>
    </tr>
    <tr style="background:rgba(224,123,42,0.08);">
      <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#F0EDE6;">Estimated Total</td>
      <td style="padding:12px 14px;font-size:15px;font-weight:700;color:#E07B2A;text-align:right;">${fmtUsd(input.estimateLow)} &ndash; ${fmtUsd(input.estimateHigh)}</td>
    </tr>
  </table>
  <p style="margin:20px 0 0;font-size:12px;color:rgba(240,237,230,0.35);line-height:1.6;">This is a rough ballpark based on typical Middle &amp; West TN rates. Actual pricing depends on a site visit. Debris disposal, stump count, and unusual terrain may affect the final number.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td><a href="https://nolandearthworks.com/contact" style="display:inline-block;background:#E07B2A;color:#fff;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:12px 22px;border-radius:4px;text-decoration:none;">Request a Site Visit</a></td></tr>
  </table>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.06);">
  <p style="margin:0;font-size:11px;color:rgba(240,237,230,0.3);">Noland Earthworks, LLC &middot; Veteran-Owned &middot; Middle &amp; West Tennessee &middot; <a href="https://nolandearthworks.com" style="color:#E07B2A;text-decoration:none;">nolandearthworks.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      const { error } = await resend.emails.send({
        from:    "Noland Earthworks <noreply@nolandearthworks.com>",
        to:      input.email,
        subject: `Your Rough Estimate \u2014 ${svcLabel} (${input.acres} ${acreWord})`,
        html,
      });

      if (error) {
        console.error("[Widget] emailBreakdown failed:", error);
        return { ok: false, reason: "send_failed" };
      }
      return { ok: true };
    }),
});
