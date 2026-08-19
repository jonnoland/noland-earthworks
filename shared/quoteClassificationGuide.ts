export const QUOTE_CLASSIFICATION_GUIDE = {
  vegetation: {
    title: "Vegetation density",
    prompt: "Judge the thickest part of the actual work area, not the clearest edge by the road.",
    levels: [
      { value: "light", label: "Light", cue: "Grass, weeds, or scattered brush and small saplings. The machine can travel through the area without frequent backing or re-positioning." },
      { value: "moderate", label: "Moderate", cue: "Established brush with regular saplings, generally 2–6 inches, and some thicker stems. Expect slower, deliberate passes." },
      { value: "heavy", label: "Heavy", cue: "Thick cedar or brush, tangled growth, limited line of sight, or regular 6–10 inch stems. Expect repeated, slower passes." },
      { value: "very_heavy", label: "Very Heavy", cue: "Dense mature growth, larger stems, or hidden obstacles across much of the work area. Treat this as a site-visit condition before finalizing scope." },
    ],
  },
  terrain: {
    title: "Terrain",
    prompt: "Classify the sustained grade and side-slope where the machine will work, not just the driveway or one short section.",
    levels: [
      { value: "flat", label: "Flat", cue: "Mostly level ground with room to travel and turn consistently. No meaningful slope or side-hill work." },
      { value: "rolling", label: "Rolling", cue: "Gentle, repeated rises and dips. The machine can work the ground safely but needs speed and positioning adjustments." },
      { value: "steep", label: "Steep", cue: "Sustained slope or side-hill work that materially limits travel direction, speed, and turning room." },
      { value: "very_steep", label: "Very Steep", cue: "Sustained or unstable slopes where a site visit must confirm whether work is safe and practical." },
    ],
  },
  access: {
    title: "Site access",
    prompt: "Evaluate the full route: gate, driveway, turns, ground firmness, clearance, and unloading room.",
    levels: [
      { value: "easy", label: "Easy", cue: "Clear entrance, firm approach, adequate turning room, and straightforward machine unloading close to the work area." },
      { value: "moderate", label: "Moderate", cue: "A narrow gate, longer drive, limited turnaround, soft spots, or some backing and route planning is needed." },
      { value: "difficult", label: "Difficult", cue: "Tight or obstructed access, poor or wet ground, sharp turns, limited trailer room, or close structures and utilities constrain the route." },
    ],
  },
} as const;

export type QuoteClassificationCategory = keyof typeof QUOTE_CLASSIFICATION_GUIDE;
