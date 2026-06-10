import type { Analyzer, Finding, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";
import { adviseFolders } from "../advisor/recommend.js";
import { sourceFiles } from "./util.js";

/**
 * Folder Structure (universal tier).
 * Scores how close the current layout is to a recognized convention for the
 * detected project type, plus consistency and sane nesting depth.
 */
export const folderStructureAnalyzer: Analyzer = {
  key: "folderStructure",
  title: "Folder Structure",
  analyze(ctx: ProjectContext) {
    const findings: Finding[] = [];
    const src = sourceFiles(ctx);
    if (src.length === 0) {
      return buildCategory("folderStructure", "universal", [], {
        notes: ["No source files; folder structure not assessed."],
      });
    }

    const advice = adviseFolders(ctx);

    // Each gap from the advisor is a deduction.
    if (advice.current === "flat") {
      findings.push({
        id: "fs.flat",
        severity: "high",
        points: 30,
        message: "Project is essentially flat — source files are not organized into meaningful directories.",
        fix: `Adopt the recommended ${advice.recommended} layout for a ${advice.projectType} project.`,
      });
    } else if (advice.current === "unknown") {
      findings.push({
        id: "fs.unrecognized",
        severity: "medium",
        points: 18,
        message: "Folder layout doesn't match a recognized convention.",
        fix: `Reorganize toward the recommended ${advice.recommended} structure.`,
      });
    } else if (advice.current !== advice.recommended) {
      findings.push({
        id: "fs.mismatch",
        severity: "low",
        points: 8,
        message: `Layout reads as "${advice.current}" but "${advice.recommended}" suits a ${advice.projectType} project better.`,
        fix: advice.rationale,
      });
    }

    // Missing expected directories from the recommended template.
    if (advice.gaps.length > 0 && advice.current !== "flat") {
      const missing = advice.gaps.filter((g) => g.startsWith("No `"));
      if (missing.length > 0) {
        findings.push({
          id: "fs.missing-dirs",
          severity: "low",
          points: Math.min(12, missing.length * 4),
          message: `Missing ${missing.length} recommended director(ies) for this project type.`,
          fix: missing.join(" "),
        });
      }
    }

    // Excessive nesting depth.
    const maxDepth = Math.max(...src.map((f) => f.relPath.split("/").length));
    if (maxDepth > 8) {
      findings.push({
        id: "fs.deep-nesting",
        severity: "low",
        points: 8,
        message: `Some source files are nested ${maxDepth} levels deep — hard to navigate.`,
        fix: "Flatten overly deep paths; prefer 3-5 levels under src/.",
      });
    }

    return buildCategory("folderStructure", "universal", findings, {
      notes: [
        `Current: ${advice.current}. Recommended: ${advice.recommended} (${advice.projectType}).`,
      ],
    });
  },
};
