import type { Analyzer, Finding, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";
import { findByName } from "./util.js";

/**
 * Documentation (universal tier).
 * README presence + substance, architecture/contributing docs, and a docs
 * directory signal.
 */
export const documentationAnalyzer: Analyzer = {
  key: "documentation",
  title: "Documentation",
  analyze(ctx: ProjectContext) {
    const findings: Finding[] = [];

    const readme = findByName(ctx, ["README.md", "README.rst", "README.txt", "README"])[0];
    if (!readme) {
      findings.push({
        id: "doc.no-readme",
        severity: "high",
        points: 40,
        message: "No README found.",
        fix: "Add a README covering what the project does, how to run it, and how it's structured.",
      });
    } else {
      const content = ctx.readFile(readme.relPath) ?? "";
      const headings = (content.match(/^#{1,6}\s+/gm) ?? []).length;
      const words = content.trim().split(/\s+/).filter(Boolean).length;
      if (words < 80 || headings < 2) {
        findings.push({
          id: "doc.thin-readme",
          severity: "medium",
          points: 18,
          message: `README is thin (${words} words, ${headings} heading(s)).`,
          fix: "Expand the README: overview, setup/run, architecture summary, and contribution notes.",
          refs: [readme.relPath],
        });
      }
    }

    // Architecture / design docs.
    const archDoc = findByName(ctx, [
      "ARCHITECTURE.md",
      "DESIGN.md",
      "SYSTEM_DESIGN.md",
    ]);
    const hasDocsDir = ctx.topLevelDirs().some((d) => /^docs?$/i.test(d));
    if (archDoc.length === 0 && !hasDocsDir) {
      findings.push({
        id: "doc.no-architecture",
        severity: "low",
        points: 10,
        message: "No architecture/design documentation (ARCHITECTURE.md or docs/).",
        fix: "Document the high-level architecture and key decisions (consider arch-score --emit-md).",
      });
    }

    // Contributing guide for larger projects.
    const contributing = findByName(ctx, ["CONTRIBUTING.md"]);
    if (contributing.length === 0 && ctx.files.length > 60) {
      findings.push({
        id: "doc.no-contributing",
        severity: "info",
        points: 5,
        message: "No CONTRIBUTING guide for a non-trivial project.",
        fix: "Add CONTRIBUTING.md describing setup, conventions, and the PR process.",
      });
    }

    return buildCategory("documentation", "universal", findings);
  },
};
