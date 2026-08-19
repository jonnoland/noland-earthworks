import React from "react";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import { QUOTE_CLASSIFICATION_GUIDE } from "@shared/quoteClassificationGuide";

type Props = {
  vegetationDensity: string;
  terrain: string;
  accessDifficulty: string;
};

const selectedValues = {
  vegetation: (props: Props) => props.vegetationDensity,
  terrain: (props: Props) => props.terrain,
  access: (props: Props) => props.accessDifficulty,
};

export default function QuoteClassificationGuide(props: Props) {
  return (
    <details style={{ marginTop: 12, border: "1px solid oklch(0.65 0.18 50 / 0.35)", backgroundColor: "oklch(0.65 0.18 50 / 0.06)", borderRadius: 10, padding: "10px 12px" }} open>
      <summary style={{ color: "var(--ne-cream)", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
        <ClipboardCheck size={15} color="var(--ne-amber)" /> Field Classification Guide
      </summary>
      <p style={{ color: "var(--ne-muted)", fontSize: 11, lineHeight: 1.45, margin: "8px 0 10px" }}>
        Judge the conditions across the work area. If they vary, use the more demanding level and confirm during the site visit.
      </p>
      {(Object.keys(QUOTE_CLASSIFICATION_GUIDE) as Array<keyof typeof QUOTE_CLASSIFICATION_GUIDE>).map((category) => {
        const guide = QUOTE_CLASSIFICATION_GUIDE[category];
        const selected = selectedValues[category](props);
        return (
          <section key={category} style={{ borderTop: "1px solid var(--ne-border)", paddingTop: 9, marginTop: 9 }}>
            <p style={{ color: "var(--ne-cream)", fontSize: 12, fontWeight: 700, margin: 0 }}>{guide.title}</p>
            <p style={{ color: "var(--ne-muted)", fontSize: 10, lineHeight: 1.4, margin: "3px 0 6px" }}>{guide.prompt}</p>
            {guide.levels.map((level) => {
              const active = selected === level.value;
              return (
                <div key={level.value} style={{ backgroundColor: active ? "oklch(0.65 0.18 50 / 0.12)" : "transparent", border: active ? "1px solid oklch(0.65 0.18 50 / 0.40)" : "1px solid transparent", borderRadius: 7, padding: "6px 7px", marginTop: 4 }}>
                  <p style={{ color: active ? "var(--ne-amber)" : "var(--ne-cream)", fontSize: 11, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                    {active && <CheckCircle2 size={12} />} {level.label}
                  </p>
                  <p style={{ color: "var(--ne-muted)", fontSize: 10, lineHeight: 1.4, margin: "2px 0 0" }}>{level.cue}</p>
                </div>
              );
            })}
          </section>
        );
      })}
    </details>
  );
}
