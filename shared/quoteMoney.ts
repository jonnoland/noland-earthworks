/** Quote pricing is presented and stored as whole dollars, always rounded upward. */
export function roundQuoteCentsUp(cents: number): number {
  return Math.ceil((Number.isFinite(cents) ? cents : 0) / 100) * 100;
}

export function quoteDollarsToCents(dollars: number): number {
  return roundQuoteCentsUp(dollars * 100);
}

export function formatQuoteCents(cents: number): string {
  const roundedCents = roundQuoteCentsUp(cents);
  const sign = roundedCents < 0 ? "-" : "";
  return `${sign}$${Math.abs(roundedCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
