import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";

const quoteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(7, "Phone is required").max(30),
  email: z.string().email("Valid email is required").max(320),
  service: z.string().min(1, "Service is required").max(100),
  county: z.string().min(1, "County is required").max(100),
  acreage: z.string().max(50).optional().default(""),
  message: z.string().max(2000).optional().default(""),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

export const quoteRouter = router({
  submit: publicProcedure.input(quoteSchema).mutation(async ({ input }) => {
    await notifyOwner({
      title: `New Quote Request — ${input.name} (${input.service})`,
      content: [
        `Name: ${input.name}`,
        `Phone: ${input.phone}`,
        `Email: ${input.email}`,
        `Service: ${input.service}`,
        `County: ${input.county} County`,
        input.acreage ? `Acreage: ${input.acreage}` : "",
        input.message ? `\nProject Details:\n${input.message}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return { success: true };
  }),
});
