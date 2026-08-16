import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseOwnerSmsRecipients } from "./sms";

const projectRoot = resolve(import.meta.dirname, "..");

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("owner SMS alert configuration", () => {
  it("normalizes unique valid E.164 recipients", () => {
    expect(parseOwnerSmsRecipients(" +19134062910, +16154064819, +19134062910, invalid "))
      .toEqual(["+19134062910", "+16154064819"]);
  });

  it("sends website-request alerts only after a native quote record has a stable ID", () => {
    const quoteRouter = readProjectFile("server/quoteRouter.ts");
    const recordCreation = quoteRouter.indexOf("const newNativeQuoteId");
    const alert = quoteRouter.indexOf("await sendOwnerAlertSms(smsBody, {");

    expect(quoteRouter).toContain('import { sendOwnerAlertSms } from "./sms"');
    expect(recordCreation).toBeGreaterThan(-1);
    expect(alert).toBeGreaterThan(recordCreation);
    expect(quoteRouter.match(/await sendOwnerAlertSms\(smsBody, \{/g)).toHaveLength(1);
  });

  it("alerts on a saved companion field quote without restoring an in-app owner notification", () => {
    const fieldQuoteRouter = readProjectFile("server/fieldQuoteRouter.ts");
    const recordCreation = fieldQuoteRouter.indexOf("const newId = inserted?.id;");
    const alert = fieldQuoteRouter.indexOf("await sendOwnerAlertSms([");

    expect(fieldQuoteRouter).toContain('import { sendOwnerAlertSms } from "./sms"');
    expect(alert).toBeGreaterThan(recordCreation);
    expect(fieldQuoteRouter).not.toContain("await notifyOwner(");
  });

  it("alerts only after new prospects pass URL de-duplication and are stored", () => {
    const entry = readProjectFile("server/_core/index.ts");
    expect(entry).toContain('import { sendOwnerAlertSms } from "../sms"');
    expect(entry.match(/await sendOwnerAlertSms\(\[/g)).toHaveLength(2);
    expect(entry.indexOf("if (existing.length > 0) continue;")).toBeLessThan(entry.indexOf("await sendOwnerAlertSms(["));
  });

  it("keeps lead, requested service, and estimate context in owner alert content and history", () => {
    const quoteRouter = readProjectFile("server/quoteRouter.ts");
    const sms = readProjectFile("server/sms.ts");
    const schema = readProjectFile("drizzle/schema.ts");
    const dashboard = readProjectFile("client/src/pages/ops/Dashboard.tsx");

    expect(quoteRouter).toContain("Requested service:");
    expect(quoteRouter).toContain("Estimated value:");
    expect(sms).toContain("recordOwnerSmsAlert");
    expect(schema).toContain('mysqlTable("owner_sms_alerts"');
    expect(dashboard).toContain("trpc.ops.smsAlerts.list.useQuery");
    expect(dashboard).toContain("Accepted by Twilio");
  });
});

describe("lead drag-to-schedule", () => {
  it("keeps capacity lead cards in the same DnD context as calendar drop targets", () => {
    const schedule = readProjectFile("client/src/pages/ops/Schedule.tsx");
    const capacity = schedule.indexOf("Drop a schedule-ready lead onto an open day or a calendar cell:");
    const dndClose = schedule.indexOf("</DndContext>");

    expect(capacity).toBeGreaterThan(-1);
    expect(capacity).toBeLessThan(dndClose);
    expect(schedule).toContain('style={{ touchAction: "none" }}');
  });

  it("keeps the original lead and prevents duplicate schedule entries on repeat drops", () => {
    const router = readProjectFile("server/opsRouter.ts");
    expect(router).toContain("const scheduleMarker = `[Lead #${lead.id}]`;");
    expect(router).toContain("existingScheduleEntry");
    expect(router).toContain('stage: "estimate_sent"');
    expect(router).toContain("alreadyScheduled: true");
  });

  it("turns successfully scheduled capacity leads green with a clear Scheduled badge", () => {
    const schedule = readProjectFile("client/src/pages/ops/Schedule.tsx");
    const router = readProjectFile("server/opsRouter.ts");
    expect(schedule).toContain("const isScheduled = quote.isScheduled === true;");
    expect(router).toContain("const scheduledLeadDates = new Map<number, Date>();");
    expect(router).toContain("isScheduled: scheduledLeadDates.has(lead.id)");
    expect(schedule).toContain('"bg-green-400/10 border-green-400/40 hover:bg-green-400/15 transition-colors"');
    expect(schedule).toContain('{isScheduled ? "Scheduled" : quote.stage.replace("_", " ")}');
  });
});
