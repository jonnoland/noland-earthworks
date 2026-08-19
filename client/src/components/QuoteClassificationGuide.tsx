import { QUOTE_CLASSIFICATION_GUIDE } from "@shared/quoteClassificationGuide";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

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
    <details className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3" open>
      <summary className="cursor-pointer list-none text-sm font-semibold text-orange-200 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-orange-400" />
        Field Classification Guide
        <span className="ml-auto text-[11px] font-normal text-zinc-400">Use before estimating</span>
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        Use the conditions across the work area. When conditions vary, choose the more demanding level and confirm the scope during the site visit.
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {(Object.keys(QUOTE_CLASSIFICATION_GUIDE) as Array<keyof typeof QUOTE_CLASSIFICATION_GUIDE>).map((category) => {
          const guide = QUOTE_CLASSIFICATION_GUIDE[category];
          const selected = selectedValues[category](props);
          return (
            <section key={category} className="rounded-md border border-zinc-700/80 bg-zinc-950/40 p-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">{guide.title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{guide.prompt}</p>
              <div className="mt-2 space-y-1.5">
                {guide.levels.map((level) => {
                  const active = selected === level.value;
                  return (
                    <div key={level.value} className={active ? "rounded border border-orange-500/40 bg-orange-500/10 p-1.5" : "p-1.5"}>
                      <p className={active ? "flex items-center gap-1 text-[11px] font-semibold text-orange-200" : "text-[11px] font-semibold text-zinc-300"}>
                        {active && <CheckCircle2 className="h-3 w-3" />}{level.label}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">{level.cue}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </details>
  );
}
