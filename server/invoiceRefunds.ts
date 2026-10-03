export type InvoiceRefundCalculation = {
  refundedCents: number;
  remainingCents: number;
  fullyRefunded: boolean;
};

/**
 * Applies one refund to an invoice total without allowing the cumulative refund
 * to exceed the amount originally collected.
 */
export function calculateInvoiceRefund(
  totalCents: number,
  previousRefundedCents: number,
  amountCents: number,
): InvoiceRefundCalculation {
  const remainingBeforeRefund = Math.max(0, totalCents - previousRefundedCents);
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Refund amount must be a positive whole number of cents.");
  }
  if (remainingBeforeRefund <= 0) {
    throw new Error("This invoice has already been fully refunded.");
  }
  if (amountCents > remainingBeforeRefund) {
    throw new Error("Refund amount cannot exceed the remaining paid balance.");
  }

  const refundedCents = previousRefundedCents + amountCents;
  const remainingCents = Math.max(0, totalCents - refundedCents);
  return {
    refundedCents,
    remainingCents,
    fullyRefunded: remainingCents === 0,
  };
}
