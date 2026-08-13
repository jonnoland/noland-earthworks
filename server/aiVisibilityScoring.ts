export type AiVisibilityCategory = "local_service" | "branded" | "competitor" | "use_case" | "general";

export type AiVisibilitySignal = {
  category: AiVisibilityCategory | string;
  mentioned: boolean;
  sentiment: "positive" | "neutral" | "negative" | string;
  cited: boolean;
};

export type AiVisibilityDiagnostic = {
  overallScore: number;
  localDiscoveryScore: number;
  useCaseScore: number;
  brandRecognitionScore: number;
  positiveMentionRate: number;
  domainLinkRate: number;
};

function mentionRate(results: AiVisibilitySignal[], category: AiVisibilityCategory): number {
  const categoryResults = results.filter((result) => result.category === category);
  if (categoryResults.length === 0) return 0;
  return categoryResults.filter((result) => result.mentioned).length / categoryResults.length;
}

/**
 * A diagnostic score for controlled AI-answer prompts, not a traffic, ranking, or citation metric.
 * Local forestry-mulching discovery and use-case coverage carry most of the weight because those
 * reflect non-branded landowner discovery more closely than direct brand-name prompts.
 */
export function calculateAiVisibilityDiagnostic(results: AiVisibilitySignal[]): AiVisibilityDiagnostic {
  const localDiscoveryScore = Math.round(mentionRate(results, "local_service") * 100);
  const useCaseScore = Math.round(mentionRate(results, "use_case") * 100);
  const brandRecognitionScore = Math.round(mentionRate(results, "branded") * 100);
  const mentioned = results.filter((result) => result.mentioned);
  const positiveMentionRate = mentioned.length === 0
    ? 0
    : mentioned.filter((result) => result.sentiment === "positive").length / mentioned.length;
  const domainLinkRate = results.length === 0
    ? 0
    : results.filter((result) => result.cited).length / results.length;

  const discoveryWeightedScore =
    localDiscoveryScore * 0.45 +
    useCaseScore * 0.35 +
    brandRecognitionScore * 0.20;
  const qualityBonus = Math.round(positiveMentionRate * 5 + domainLinkRate * 5);

  return {
    overallScore: Math.min(100, Math.round(discoveryWeightedScore + qualityBonus)),
    localDiscoveryScore,
    useCaseScore,
    brandRecognitionScore,
    positiveMentionRate,
    domainLinkRate,
  };
}
