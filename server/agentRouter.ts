/**
 * tRPC router for agent management — list agents, toggle enable/disable,
 * view run history, and trigger manual runs.
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  listAgentConfigs,
  upsertAgentConfig,
  getAgentLogs,
  getLastAgentRun,
  insertAgentLog,
} from "./db";
import {
  AGENT_REGISTRY,
  runLeadFollowupAgent,
  runVisitReminderAgent,
  runReviewRequestAgent,
  runStaleLeadAlertAgent,
  runDailyDigestAgent,
} from "./agents";

// Owner-only guard — mirrors the pattern in opsRouter
const ownerProcedure = protectedProcedure;

const agentRunners: Record<string, () => Promise<void>> = {
  lead_followup: runLeadFollowupAgent,
  visit_reminder: runVisitReminderAgent,
  review_request: runReviewRequestAgent,
  stale_lead_alert: runStaleLeadAlertAgent,
  daily_digest: runDailyDigestAgent,
};

export const agentRouter = router({
  /** List all agents with their registry metadata, current enabled state, and last run. */
  list: ownerProcedure.query(async () => {
    const configs = await listAgentConfigs();
    const configMap = new Map(configs.map((c) => [c.agentId, c]));

    return Promise.all(
      AGENT_REGISTRY.map(async (a) => {
        const cfg = configMap.get(a.id);
        const lastRun = await getLastAgentRun(a.id);
        return {
          id: a.id,
          name: a.name,
          description: a.description,
          schedule: a.schedule,
          enabled: cfg?.enabled ?? true,
          lastRun: lastRun
            ? {
                ranAt: lastRun.ranAt,
                status: lastRun.status,
                summary: lastRun.summary ?? "",
                actionsCount: lastRun.actionsCount,
              }
            : null,
        };
      })
    );
  }),

  /** Enable or disable an agent. */
  setEnabled: ownerProcedure
    .input(z.object({ agentId: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input }: { input: { agentId: string; enabled: boolean } }) => {
      await upsertAgentConfig(input.agentId, input.enabled, undefined);
      return { success: true };
    }),

  /** Get the last N run logs for an agent (or all agents). */
  getLogs: ownerProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
    )
    .query(async ({ input }: { input: { agentId?: string; limit: number } }) => {
      return getAgentLogs(input.agentId, input.limit);
    }),

  /** Trigger a manual run of a specific agent. */
  triggerRun: ownerProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ input }: { input: { agentId: string } }) => {
      const runner = agentRunners[input.agentId];
      if (!runner) {
        throw new Error(`Unknown agent: ${input.agentId}`);
      }
      // Run async — don't block the response
      runner().catch((err: unknown) => {
        console.error(`[agentRouter] Manual trigger error for ${input.agentId}:`, err);
        insertAgentLog({ agentId: input.agentId, status: "error", error: String(err) });
      });
      return { queued: true };
    }),

  /** Get the SMS template for a specific agent (currently only stale_lead_alert). */
  getSmsTemplate: ownerProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }: { input: { agentId: string } }) => {
      const cfg = await listAgentConfigs();
      const entry = cfg.find((c) => c.agentId === input.agentId);
      return { template: (entry as any)?.smsTemplate ?? null };
    }),

  /** Save a custom SMS template for an agent. */
  setSmsTemplate: ownerProcedure
    .input(z.object({ agentId: z.string(), template: z.string().max(500) }))
    .mutation(async ({ input }: { input: { agentId: string; template: string } }) => {
      await upsertAgentConfig(input.agentId, undefined, input.template);
      return { success: true };
    }),
});
