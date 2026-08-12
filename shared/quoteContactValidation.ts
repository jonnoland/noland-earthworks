export type QuoteContactField = "name" | "phone" | "email" | "service";
export type QuoteContactErrors = Partial<Record<QuoteContactField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function formatQuotePhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function validateQuoteContactField(field: QuoteContactField, value: string): string | undefined {
  const trimmed = value.trim();

  if (field === "name") {
    return trimmed.length >= 2 ? undefined : "Enter your full name so we know who to contact.";
  }
  if (field === "phone") {
    return value.replace(/\D/g, "").length >= 10 ? undefined : "Enter a valid 10-digit phone number.";
  }
  if (field === "email") {
    return EMAIL_PATTERN.test(trimmed) ? undefined : "Enter a valid email address for your written estimate.";
  }
  return trimmed ? undefined : "Choose the service that best matches your project.";
}

export function validateQuoteContact(values: Record<QuoteContactField, string>): QuoteContactErrors {
  return (Object.keys(values) as QuoteContactField[]).reduce<QuoteContactErrors>((errors, field) => {
    const error = validateQuoteContactField(field, values[field]);
    if (error) errors[field] = error;
    return errors;
  }, {});
}
