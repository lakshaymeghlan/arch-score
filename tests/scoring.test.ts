import { describe, it, expect } from "vitest";
import { score, resolveWeights } from "../src/core/scoring.js";
import { buildCategory } from "../src/core/result.js";
import type { CategoryResult } from "../src/core/types.js";

function cat(key: any, scoreVal: number, applicable = true): CategoryResult {
  const c = buildCategory(key, "universal", [], { applicable });
  return { ...c, score: scoreVal };
}

describe("scoring engine", () => {
  it("normalizes applicable weights to 100", () => {
    const cats = [cat("architecture", 100), cat("testing", 100)];
    const w = resolveWeights(cats, {});
    const total = w.architecture + w.testing;
    expect(Math.round(total)).toBe(100);
  });

  it("re-weights out non-applicable categories instead of scoring them 0", () => {
    const cats = [
      cat("architecture", 100, true),
      cat("modularity", 0, false), // not applicable
    ];
    const result = score(cats, {});
    // Only architecture is applicable, so overall should reflect its score.
    expect(result.overall).toBe(100);
    expect(result.reweighted).toContain("modularity");
  });

  it("honors config weight overrides", () => {
    const cats = [cat("architecture", 100), cat("testing", 0)];
    const result = score(cats, { weights: { architecture: 90, testing: 10 } });
    // 100*0.9 + 0*0.1 = 90
    expect(result.overall).toBe(90);
  });

  it("ranks recommendations by impact (weight * points)", () => {
    const heavy = buildCategory("architecture", "universal", [
      { id: "a", severity: "high", points: 30, message: "big", fix: "fix big" },
    ]);
    const light = buildCategory("documentation", "universal", [
      { id: "d", severity: "low", points: 30, message: "small", fix: "fix small" },
    ]);
    const result = score([heavy, light], {});
    expect(result.recommendations[0].message).toContain("big");
  });
});
