/**
 * Maintenance router — AI-powered equipment diagnostics
 * Accepts a base64-encoded image and returns LLM analysis.
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

export const maintenanceRouter = router({
  /**
   * Analyze an equipment image using the LLM vision model.
   * Accepts a base64 data URL (e.g. "data:image/jpeg;base64,...")
   * and returns a structured diagnostic report.
   */
  analyzeDiagnostics: publicProcedure
    .input(
      z.object({
        imageDataUrl: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Upload the image to S3 so we have a stable URL for the LLM
      const base64Data = input.imageDataUrl.replace(/^data:[^;]+;base64,/, "");
      const mimeMatch = input.imageDataUrl.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch?.[1] ?? "image/jpeg";
      const ext = mimeType.split("/")[1] ?? "jpg";
      const fileKey = `maintenance-diagnostics/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(base64Data, "base64");
      const { url: imageUrl } = await storagePut(fileKey, buffer, mimeType);

      const systemPrompt = `You are an expert heavy equipment mechanic and diagnostics specialist with deep knowledge of forestry mulchers, skid steers, track loaders, excavators, and related land-clearing machinery. 

When given an image of equipment or a component, you provide:
1. A brief identification of what you see
2. Any visible issues, wear, damage, or concerns
3. Recommended immediate actions (if urgent)
4. Recommended maintenance or repair steps
5. An estimated urgency level: Low / Medium / High / Critical

Be concise, practical, and use plain language a field operator can act on. If the image is unclear or doesn't show equipment, say so politely.`;

      const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "high" } }> = [
        {
          type: "image_url",
          image_url: { url: imageUrl, detail: "high" },
        },
      ];

      if (input.description) {
        userContent.push({
          type: "text",
          text: `Additional context from the operator: ${input.description}`,
        });
      } else {
        userContent.push({
          type: "text",
          text: "Please analyze this equipment image and provide a diagnostic report.",
        });
      }

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });

      const content = (response as { choices: Array<{ message: { content: string } }> })
        .choices[0]?.message?.content ?? "No analysis returned.";

      return { analysis: content, imageUrl };
    }),
});
