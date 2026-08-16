export type SiteVisitRequestFields = {
  name: string;
  phone: string;
  email: string;
  service: string;
  county: string;
  acreage: string;
  street: string;
  city: string;
  zip: string;
  preferredContact: string;
  smsConsent: boolean;
};

export function formatUsPhoneInput(rawValue: string): string {
  let digits = rawValue.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function validateSiteVisitRequest(form: SiteVisitRequestFields): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = form.name.trim();
  const phoneDigits = form.phone.replace(/\D/g, "");

  if (name.length < 2 || !/[a-z]/i.test(name)) {
    errors.name = "Please enter the name you would like Jon to use when he contacts you.";
  }
  if (phoneDigits.length !== 10) {
    errors.phone = "Please enter a 10-digit phone number, for example (615) 406-4819.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
    errors.email = "Please enter an email address in the format name@example.com.";
  }
  if (!form.service) errors.service = "Please select the type of work you need.";
  if (!isServedCounty(form.county)) errors.county = "Please select a county in Noland Earthworks’ Middle or West Tennessee service area.";
  const acreage = Number.parseFloat(form.acreage);
  if (!form.acreage.trim() || !Number.isFinite(acreage) || acreage <= 0) {
    errors.acreage = "Please enter the estimated acreage for the area you want managed.";
  }
  if (form.street.trim().length < 5) errors.street = "Please enter the full property street address.";
  if (form.city.trim().length < 2) errors.city = "Please enter the property city.";
  if (!/^\d{5}(?:-\d{4})?$/.test(form.zip.trim())) errors.zip = "Please enter a valid property ZIP code.";
  if (form.preferredContact === "text" && !form.smsConsent) {
    errors.smsConsent = "Please acknowledge the project-text terms or choose call or email instead.";
  }
  return errors;
}
import { isServedCounty } from "./serviceAreas";
