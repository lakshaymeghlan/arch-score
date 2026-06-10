import type { CategoryKey, CategoryResult, Finding, Tier } from "./types.js";
import { CATEGORY_TITLES } from "./constants.js";

/**
 * Helper for analyzers: start every category at 100 and subtract the points
 * from each finding, clamped to [0, 100]. Keeps scoring logic uniform and
 * makes "why points were lost" line up exactly with the findings list.
 */
export function buildCategory(
  key: CategoryKey,
  tier: Tier,
  findings: Finding[],
  opts: { applicable?: boolean; notes?: string[] } = {},
): CategoryResult {
  const deducted = findings.reduce((sum, f) => sum + Math.max(0, f.points), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - deducted)));
  return {
    key,
    title: CATEGORY_TITLES[key],
    score,
    weight: 0, // filled in by the scoring engine
    tier,
    findings,
    applicable: opts.applicable ?? true,
    notes: opts.notes,
  };
}

/** Convenience factory for a Finding with sensible defaults. */
export function finding(f: Finding): Finding {
  return f;
}
