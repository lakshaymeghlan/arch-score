import { describe, it, expect } from "vitest";
import { generatePrComment, PR_COMMENT_MARKER } from "../src/generators/prComment.js";
import type { ScoreReport } from "../src/core/types.js";

const base: ScoreReport = {
  tool: "arch-score",
  version: "0.0.0",
  generatedAt: "2026-06-17T00:00:00.000Z",
  root: "/p",
  detection: {
    languages: [],
    primaryLanguage: "TypeScript",
    frameworks: ["express"],
    projectType: "backend",
    manifests: [],
    isMonorepo: false,
    confidence: 0.85,
  },
  tierUsed: "deep",
  deep: null,
  overall: 72,
  grade: "C",
  categories: [
    {
      key: "testing",
      title: "Testing Architecture",
      score: 45,
      weight: 12,
      tier: "universal",
      applicable: true,
      findings: [],
    },
    {
      key: "containerization",
      title: "Containerization",
      score: 0,
      weight: 0,
      tier: "universal",
      applicable: false,
      findings: [],
    },
  ],
  reweighted: ["containerization"],
  recommendations: [
    { category: "testing", impact: 5, message: "Low coverage", fix: "Add tests" },
  ],
  folder: {
    current: "layered",
    recommended: "hexagonal",
    projectType: "backend",
    rationale: "",
    proposedTree: "",
    gaps: [],
  },
};

describe("PR comment generator", () => {
  it("includes the sticky marker for update detection", () => {
    expect(generatePrComment(base)).toContain(PR_COMMENT_MARKER);
  });

  it("shows the overall score, grade, and a backlink to arch-score", () => {
    const md = generatePrComment(base);
    expect(md).toContain("72/100");
    expect(md).toContain("grade C");
    expect(md).toContain("Measured by [arch-score]");
    expect(md).toContain("npx arch-score .");
  });

  it("lists applicable categories but not re-weighted-out ones", () => {
    const md = generatePrComment(base);
    expect(md).toContain("Testing Architecture");
    expect(md).not.toContain("| Containerization |");
  });

  it("renders top fixes when present", () => {
    const md = generatePrComment(base);
    expect(md).toContain("Low coverage");
    expect(md).toContain("Add tests");
  });

  it("says no issues when there are no recommendations", () => {
    const md = generatePrComment({ ...base, recommendations: [] });
    expect(md).toContain("No issues found");
  });
});
