export type QuoteContactField = "name" | "phone" | "email" | "service";
export type QuoteContactErrors = Partial<Record<QuoteContactField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
