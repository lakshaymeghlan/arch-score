import type { Analyzer, Finding, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";
import { classifyStructure } from "../advisor/classify.js";
import { sourceFiles } from "./util.js";

/**
 * Architecture & Layering (universal tier).
 * Rewards a discernible architectural pattern, separated entry points, and
 * the absence of god-folders. Deep adapters add dependency-direction checks
 * under the Modularity category.
 */
export const architectureAnalyzer: Analyzer = {
  key: "architecture",
  title: "Architecture & Layering",
  analyze(ctx: ProjectContext) {
    const findings: Finding[] = [];
    const src = sourceFiles(ctx);
    const pattern = classifyStructure(ctx);

    if (src.length === 0) {
      return buildCategory("architecture", "universal", [], {
        notes: ["No source files detected; architecture not assessed."],
      });
    }

    if (pattern === "unknown" || pattern === "flat") {
      findings.push({
        id: "arch.no-pattern",
        severity: "high",
        points: 30,
        message:
          pattern === "flat"
            ? "Code is largely flat with little layering — no recognizable architectural pattern."
            : "No recognizable architectural pattern (layered/hexagonal/feature/MVC) detected.",
        fix: "Adopt a layering convention for your project type (see the Folder Structure advice) and group code by responsibility.",
      });
    }

    // Entry points should be separated from business logic.
    const entryNames = ["main", "index", "app", "server", "cmd"];
    const rootEntries = src.filter((f) => {
      const base = f.relPath.split("/").pop()!.replace(/\.[^.]+$/, "").toLowerCase();
      const depth = f.relPath.split("/").length;
      return entryNames.includes(base) && depth <= 2;
    });
    const hasEntry = rootEntries.length > 0;
    const hasNestedLogic = src.some((f) => f.relPath.split("/").length >= 3);
    if (hasEntry && !hasNestedLogic && src.length > 8) {
      findings.push({
        id: "arch.entry-mixed",
        severity: "medium",
        points: 15,
        message: "Entry points and business logic appear to live at the same shallow level.",
        fix: "Keep entry points thin (bootstrap/wiring only) and move business logic into deeper, responsibility-named modules.",
        refs: rootEntries.slice(0, 3).map((f) => f.relPath),
      });
    }

    // God-folder: one directory holding a large share of all source files.
    const byDir = new Map<string, number>();
    for (const f of src) byDir.set(f.dir, (byDir.get(f.dir) ?? 0) + 1);
    const biggest = [...byDir.entries()].sort((a, b) => b[1] - a[1])[0];
    if (biggest && src.length >= 12 && biggest[1] / src.length > 0.6) {
      findings.push({
        id: "arch.god-folder",
        severity: "medium",
        points: 15,
        message: `Directory "${biggest[0] || "(root)"}" holds ${Math.round(
          (biggest[1] / src.length) * 100,
        )}% of source files — a god-folder.`,
        fix: "Split this directory into cohesive sub-modules grouped by feature or responsibility.",
        refs: [biggest[0] || "(root)"],
      });
    }

    const notes = [`Detected structure pattern: ${pattern}.`];
    return buildCategory("architecture", "universal", findings, { notes });
  },
};
