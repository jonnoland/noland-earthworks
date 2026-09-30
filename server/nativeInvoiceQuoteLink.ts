import { eq } from "drizzle-orm";
import { nativeInvoices, nativeJobs, type NativeInvoice } from "../drizzle/schema";

/**
 * Resolves an invoice's source quote. Older invoices can lack quoteId even when
 * their parent job was converted from a quote, so repair that link while it is
 * still unambiguous.
 */
export async function resolveInvoiceQuoteId(
  db: any,
  invoice: Pick<NativeInvoice, "id" | "jobId" | "quoteId">,
): Promise<number | null> {
  if (invoice.quoteId !== null) return invoice.quoteId;

  const [sourceJob] = await db
    .select({ quoteId: nativeJobs.quoteId })
    .from(nativeJobs)
    .where(eq(nativeJobs.id, invoice.jobId))
    .limit(1);
  const quoteId = sourceJob?.quoteId ?? null;
  if (quoteId === null) return null;

  await db
    .update(nativeInvoices)
    .set({ quoteId })
    .where(eq(nativeInvoices.id, invoice.id));
  return quoteId;
}
