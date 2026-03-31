import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email is required").max(320),
  phone: z.string().max(30).optional().default(""),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(3000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const contactRouter = router({
  submit: publicProcedure.input(contactSchema).mutation(async ({ input }) => {
    await notifyOwner({
      title: `General Inquiry — ${input.name}: ${input.subject}`,
      content: [
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        input.phone ? `Phone: ${input.phone}` : "",
        `Subject: ${input.subject}`,
        `\nMessage:\n${input.message}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return { success: true };
  }),
});
