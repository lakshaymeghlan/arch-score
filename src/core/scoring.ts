import { CATEGORY_TITLES, DEFAULT_WEIGHTS, grade } from "./constants.js";
import type {
  ArchScoreConfig,
  CategoryKey,
  CategoryResult,
  Recommendation,
} from "./types.js";

/**
 * Resolve effective weights from defaults + config overrides, then normalize
 * across only the *applicable* categories so an unsupported (re-weighted-out)
 * category never silently drags the total down.
 *
 * Returns weights that sum to 100 across applicable categories.
 */
export function resolveWeights(
  categories: CategoryResult[],
  config: ArchScoreConfig,
): Record<CategoryKey, number> {
  const base: Record<string, number> = { ...DEFAULT_WEIGHTS, ...(config.weights ?? {}) };
  const applicableKeys = categories.filter((c) => c.applicable).map((c) => c.key);
  const totalApplicable = applicableKeys.reduce((s, k) => s + (base[k] ?? 0), 0);

  const out = {} as Record<CategoryKey, number>;
  for (const c of categories) {
    if (!c.applicable || totalApplicable === 0) {
      out[c.key] = 0;
    } else {
      out[c.key] = (base[c.key] ?? 0) / totalApplicable * 100;
    }
  }
  return out;
}

export interface ScoringResult {
  overall: number;
  grade: string;
  categories: CategoryResult[];
  reweighted: CategoryKey[];
  recommendations: Recommendation[];
}

/** Compute the weighted overall score and ranked recommendations. */
export function score(
  categories: CategoryResult[],
  config: ArchScoreConfig,
): ScoringResult {
  const weights = resolveWeights(categories, config);
  const weighted = categories.map((c) => ({ ...c, weight: weights[c.key] }));

  const overall = Math.round(
    weighted.reduce((sum, c) => sum + (c.applicable ? c.score * (c.weight / 100) : 0), 0),
  );

  const reweighted = weighted.filter((c) => !c.applicable).map((c) => c.key);

  // Recommendations: one per finding, ranked by impact = weight * points/100.
  const recommendations: Recommendation[] = [];
  for (const c of weighted) {
    if (!c.applicable) continue;
    for (const f of c.findings) {
      recommendations.push({
        category: c.key,
        impact: (c.weight / 100) * f.points,
        message: `[${CATEGORY_TITLES[c.key]}] ${f.message}`,
        fix: f.fix,
        refs: f.refs,
      });
    }
  }
  recommendations.sort((a, b) => b.impact - a.impact);

  return {
    overall,
    grade: grade(overall),
    categories: weighted,
    reweighted,
    recommendations,
  };
}
