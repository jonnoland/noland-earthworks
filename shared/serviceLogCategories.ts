export const SERVICE_LOG_CATEGORIES = [
  "Engine",
  "Hydraulics",
  "Electrical",
  "Cooling",
  "Fuel & Air",
  "Undercarriage",
  "Drivetrain",
  "Attachment",
  "Inspection",
  "General Maintenance",
  "Other",
] as const;

export type ServiceLogCategory = (typeof SERVICE_LOG_CATEGORIES)[number];

export const SERVICE_LOG_CATEGORY_LABELS: Record<ServiceLogCategory, string> = {
  Engine: "Engine",
  Hydraulics: "Hydraulics",
  Electrical: "Electrical",
  Cooling: "Cooling",
  "Fuel & Air": "Fuel & Air",
  Undercarriage: "Undercarriage",
  Drivetrain: "Drivetrain",
  Attachment: "Attachment",
  Inspection: "Inspection",
  "General Maintenance": "General Maintenance",
  Other: "Other",
};
