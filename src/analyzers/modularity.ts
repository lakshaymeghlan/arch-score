import type { Analyzer, Finding, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";
import { sourceFiles, lineCount } from "./util.js";

/**
 * Modularity & Coupling.
 *
 * Deep tier (when ctx.deep is present): scores real coupling signals from the
 * import graph — circular dependencies, fan-out/fan-in outliers, graph depth.
 *
 * Universal fallback (no adapter): a coarse cohesion proxy based on oversized
 * modules, since coupling can't be measured without parsing imports.
 */
export const modularityAnalyzer: Analyzer = {
  key: "modularity",
  title: "Modularity & Coupling",
  analyze(ctx: ProjectContext) {
    const deep = ctx.deep;
    if (deep && deep.moduleCount > 0) {
      return deepModularity(deep);
    }
    return universalModularity(ctx);
  },
};

function deepModularity(deep: NonNullable<ProjectContext["deep"]>) {
  const findings: Finding[] = [];
  const n = deep.moduleCount;

  if (deep.cycles.length > 0) {
    const sample = deep.cycles.slice(0, 3).map((c) => c.join(" -> "));
    findings.push({
      id: "mod.cycles",
      severity: "high",
      points: Math.min(35, 10 + deep.cycles.length * 5),
      message: `${deep.cycles.length} circular dependency cycle(s) detected in the import graph.`,
      fix: "Break cycles by extracting shared types/interfaces into a lower module or inverting a dependency (depend on an abstraction).",
      refs: sample,
    });
  }

  // Fan-out outliers: modules importing far more than the median.
  const fanOuts = Object.entries(deep.fanOut);
  const outValues = fanOuts.map(([, v]) => v).sort((a, b) => a - b);
  const median = outValues[Math.floor(outValues.length / 2)] ?? 0;
  const threshold = Math.max(12, median * 3);
  const highFanOut = fanOuts.filter(([, v]) => v > threshold).sort((a, b) => b[1] - a[1]);
  if (highFanOut.length > 0) {
    findings.push({
      id: "mod.fan-out",
      severity: "medium",
      points: Math.min(20, highFanOut.length * 5),
      message: `${highFanOut.length} module(s) with very high fan-out (>${threshold} imports) — likely doing too much.`,
      fix: "Split these modules along responsibility lines; depend on focused interfaces instead of many concretes.",
      refs: highFanOut.slice(0, 3).map(([m, v]) => `${m} (${v} imports)`),
    });
  }

  // Fan-in god-modules.
  const fanIns = Object.entries(deep.fanIn).sort((a, b) => b[1] - a[1]);
  const godFanIn = fanIns.filter(([, v]) => v > Math.max(8, n * 0.4));
  if (godFanIn.length > 0) {
    findings.push({
      id: "mod.fan-in",
      severity: "low",
      points: Math.min(15, godFanIn.length * 5),
      message: `${godFanIn.length} module(s) imported by a large share of the codebase (god-modules).`,
      fix: "Ensure these are stable abstractions; if they change often, split them so churn doesn't ripple everywhere.",
      refs: godFanIn.slice(0, 3).map(([m, v]) => `${m} (imported by ${v})`),
    });
  }

  if (deep.maxDepth > 8) {
    findings.push({
      id: "mod.depth",
      severity: "low",
      points: 10,
      message: `Dependency chains run up to ${deep.maxDepth} modules deep — tangled layering.`,
      fix: "Flatten deep chains; introduce clear layer boundaries so dependencies point one direction.",
    });
  }

  return buildCategory("modularity", "deep", findings, {
    notes: [
      `Deep analysis (${deep.language}): ${n} modules, ${deep.cycles.length} cycles, max depth ${deep.maxDepth}.`,
    ],
  });
}

function universalModularity(ctx: ProjectContext) {
  const findings: Finding[] = [];
  const src = sourceFiles(ctx);
  if (src.length === 0) {
    return buildCategory("modularity", "universal", [], {
      applicable: false,
      notes: ["No source files; coupling not assessed."],
    });
  }

  // Cohesion proxy: oversized modules tend to be doing too much.
  const big = src
    .map((f) => ({ f, lines: lineCount(ctx, f) }))
    .filter((x) => x.lines > 400)
    .sort((a, b) => b.lines - a.lines);
  if (big.length > 0) {
    const share = big.length / src.length;
    findings.push({
      id: "mod.large-modules",
      severity: share > 0.15 ? "medium" : "low",
      points: Math.min(25, Math.round(big.length * 4)),
      message: `${big.length} oversized module(s) (>400 lines) — a coarse low-cohesion signal.`,
      fix: "Split large modules into focused units with a single responsibility.",
      refs: big.slice(0, 5).map((x) => `${x.f.relPath} (${x.lines} lines)`),
    });
  }

  return buildCategory("modularity", "universal", findings, {
    notes: [
      "Universal tier: no Deep adapter for the primary language, so coupling is approximated by module size. " +
        "Install/enable a Deep adapter (JS/TS, Python, Go) for true import-graph coupling.",
    ],
  });
}
