import { describe, it, expect } from "vitest";
import {
  generateBadgeSvg,
  generateBadgeJson,
  badgeColorName,
} from "../src/generators/badge.js";
import type { ScoreReport } from "../src/core/types.js";

function reportWith(overall: number, grade: string): ScoreReport {
  return {
    tool: "arch-score",
    version: "0.0.0",
    generatedAt: "2026-06-17T00:00:00.000Z",
    root: "/p",
    detection: {
      languages: [],
      primaryLanguage: "TypeScript",
      frameworks: [],
      projectType: "backend",
      manifests: [],
      isMonorepo: false,
      confidence: 0.8,
    },
    tierUsed: "universal",
    deep: null,
    overall,
    grade,
    categories: [],
    reweighted: [],
    recommendations: [],
    folder: {
      current: "layered",
      recommended: "hexagonal",
      projectType: "backend",
      rationale: "",
      proposedTree: "",
      gaps: [],
    },
  };
}

describe("badge color bands", () => {
  it("maps scores to shields colors", () => {
    expect(badgeColorName(95)).toBe("brightgreen");
    expect(badgeColorName(85)).toBe("green");
    expect(badgeColorName(75)).toBe("yellowgreen");
    expect(badgeColorName(65)).toBe("yellow");
    expect(badgeColorName(55)).toBe("orange");
    expect(badgeColorName(40)).toBe("red");
  });
});

describe("shields endpoint JSON", () => {
  it("emits a valid schema with score and grade", () => {
    const json = JSON.parse(generateBadgeJson(reportWith(92, "A")));
    expect(json.schemaVersion).toBe(1);
    expect(json.label).toBe("arch-score");
    expect(json.message).toBe("92 (A)");
    expect(json.color).toBe("brightgreen");
  });
});

describe("self-contained SVG badge", () => {
  it("contains the score, grade, and band color; is well-formed", () => {
    const svg = generateBadgeSvg(reportWith(72, "C"));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain("arch-score");
    expect(svg).toContain("72 (C)");
    expect(svg).toContain("#a4a61d"); // yellowgreen band for 72 (>= 70)
  });

  it("escapes nothing dangerous and stays single-rooted", () => {
    const svg = generateBadgeSvg(reportWith(100, "A"));
    expect((svg.match(/<svg/g) ?? []).length).toBe(1);
    expect(svg).toContain("100 (A)");
  });
});
