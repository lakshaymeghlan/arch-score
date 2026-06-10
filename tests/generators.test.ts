import { describe, it, expect } from "vitest";
import { generateSystemDesign } from "../src/generators/systemDesign.js";
import { generateSkill, SKILL_FILENAMES } from "../src/generators/skill.js";
import type { ScoreReport } from "../src/core/types.js";

const report: ScoreReport = {
  tool: "arch-score",
  version: "0.1.0",
  generatedAt: "2026-06-10T00:00:00.000Z",
  root: "/p",
  detection: {
    languages: [{ name: "TypeScript", files: 10, bytes: 1000 }],
    primaryLanguage: "TypeScript",
    frameworks: ["express"],
    projectType: "backend",
    manifests: ["package.json"],
    isMonorepo: false,
    confidence: 0.85,
  },
  tierUsed: "deep",
  deep: { language: "JavaScript/TypeScript", graph: { nodes: ["a"], edges: {} }, cycles: [["a", "b"]], fanIn: {}, fanOut: {}, maxDepth: 3, moduleCount: 10 },
  overall: 72,
  grade: "C",
  categories: [
    {
      key: "testing",
      title: "Testing Architecture",
      score: 40,
      weight: 12,
      tier: "universal",
      applicable: true,
      findings: [{ id: "t", severity: "high", points: 30, message: "Low coverage", fix: "Add tests" }],
    },
  ],
  reweighted: [],
  recommendations: [
    { category: "testing", impact: 3.6, message: "[Testing] Low coverage", fix: "Add tests" },
  ],
  folder: {
    current: "layered",
    recommended: "hexagonal",
    projectType: "backend",
    rationale: "Keeps domain independent of frameworks.",
    proposedTree: "src/\n  domain/\n  application/",
    gaps: ["No `domain/` directory."],
  },
};

describe("SYSTEM_DESIGN.md generator", () => {
  it("includes scores, tree, and prioritized fixes", () => {
    const md = generateSystemDesign(report);
    expect(md).toContain("# System Design Playbook");
    expect(md).toContain("72/100");
    expect(md).toContain("domain/");
    expect(md).toContain("Add tests");
    expect(md).toContain("Dependency analysis");
  });
});

describe("skill generator", () => {
  it("emits all four formats with the recommended structure", () => {
    for (const fmt of ["agents", "claude", "cursor", "copilot"] as const) {
      const out = generateSkill(report, fmt);
      expect(out).toContain("hexagonal");
      expect(out).toContain("domain/");
      expect(SKILL_FILENAMES[fmt]).toBeTruthy();
    }
  });

  it("uses format-specific headers", () => {
    expect(generateSkill(report, "claude")).toContain("# CLAUDE.md");
    expect(generateSkill(report, "agents")).toContain("# AGENTS.md");
    expect(generateSkill(report, "copilot")).toContain("Copilot Instructions");
  });
});
