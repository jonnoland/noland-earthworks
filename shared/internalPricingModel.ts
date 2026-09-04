export interface InternalPricingEquipmentItem {
  id: string;
  name: string;
  monthlyCost: number;
}

export interface InternalPricingConfig {
  hoursPerDay: number;
  crewMembers: number;
  wagePerHour: number;
  burdenPct: number;
  equipment: InternalPricingEquipmentItem[];
  machineBurnRateGPH: number;
  fuelPricePerGallon: number;
  truckFuelPerDay: number;
  teethCostPerSet: number;
  daysPerSet: number;
  annualMajorWear: number;
  miscConsumablesPerDay: number;
  overheadItems: InternalPricingEquipmentItem[];
  workingDaysPerMonth: number;
  targetMarginPct: number;
  acresPerDay: number;
}

/** Owner-approved planning assumptions for the active 15-billable-day estimator. */
export const ACTIVE_15_DAY_PRICING_CONFIG: InternalPricingConfig = {
  hoursPerDay: 10,
  crewMembers: 1,
  wagePerHour: 70,
  burdenPct: 10,
  equipment: [
    { id: "default-tracked-mulcher", name: "Tracked Forestry Mulcher (lease/payment)", monthlyCost: 1500 },
    { id: "default-fecon-drum", name: "Fecon Drum Mulcher", monthlyCost: 500 },
  ],
  machineBurnRateGPH: 8,
  fuelPricePerGallon: 4.5,
  truckFuelPerDay: 45,
  teethCostPerSet: 2200,
  daysPerSet: 10,
  annualMajorWear: 26400,
  miscConsumablesPerDay: 100,
  overheadItems: [
    { id: "default-insurance", name: "Insurance", monthlyCost: 350 },
    { id: "default-phone-admin", name: "Phone/Admin", monthlyCost: 100 },
    { id: "default-marketing", name: "Website Hosting / Marketing Tools", monthlyCost: 500 },
  ],
  workingDaysPerMonth: 15,
  targetMarginPct: 35.5,
  acresPerDay: 1,
};

/** Saved estimator assumptions in use before the 15-billable-day update. */
export const PRIOR_20_DAY_PRICING_CONFIG: InternalPricingConfig = {
  hoursPerDay: 8,
  crewMembers: 1,
  wagePerHour: 28,
  burdenPct: 25,
  equipment: [{ id: "prior-cat-299d3", name: "CAT 299D3 XE", monthlyCost: 2200 }],
  machineBurnRateGPH: 7,
  fuelPricePerGallon: 5.33,
  truckFuelPerDay: 65,
  teethCostPerSet: 2200,
  daysPerSet: 12,
  annualMajorWear: 18000,
  miscConsumablesPerDay: 35,
  overheadItems: [],
  workingDaysPerMonth: 20,
  targetMarginPct: 30,
  acresPerDay: 1,
};

export function isInternalPricingConfig(value: unknown): value is InternalPricingConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  const numericFields = [
    "hoursPerDay", "crewMembers", "wagePerHour", "burdenPct", "machineBurnRateGPH",
    "fuelPricePerGallon", "truckFuelPerDay", "teethCostPerSet", "daysPerSet",
    "annualMajorWear", "miscConsumablesPerDay", "workingDaysPerMonth", "targetMarginPct", "acresPerDay",
  ];
  return numericFields.every((field) => typeof candidate[field] === "number" && Number.isFinite(candidate[field]))
    && Array.isArray(candidate.equipment)
    && Array.isArray(candidate.overheadItems);
}

export function calculateInternalPricingModel(config: InternalPricingConfig) {
  const laborCostPerDay = config.hoursPerDay * config.crewMembers * config.wagePerHour * (1 + config.burdenPct / 100);
  const equipmentCostPerDay = config.workingDaysPerMonth > 0
    ? config.equipment.reduce((sum, item) => sum + item.monthlyCost, 0) / config.workingDaysPerMonth
    : 0;
  const fuelCostPerDay = config.machineBurnRateGPH * config.hoursPerDay * config.fuelPricePerGallon + config.truckFuelPerDay;
  const wearCostPerDay = (config.daysPerSet > 0 ? config.teethCostPerSet / config.daysPerSet : 0)
    + config.annualMajorWear / (config.workingDaysPerMonth * 12 || 1)
    + config.miscConsumablesPerDay;
  const overheadCostPerDay = config.workingDaysPerMonth > 0
    ? config.overheadItems.reduce((sum, item) => sum + item.monthlyCost, 0) / config.workingDaysPerMonth
    : 0;
  const totalDailyCost = laborCostPerDay + equipmentCostPerDay + fuelCostPerDay + wearCostPerDay + overheadCostPerDay;
  const crewDayRate = totalDailyCost / (1 - config.targetMarginPct / 100);

  return { laborCostPerDay, equipmentCostPerDay, fuelCostPerDay, wearCostPerDay, overheadCostPerDay, totalDailyCost, crewDayRate };
}
