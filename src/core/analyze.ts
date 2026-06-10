import * as path from "node:path";
import type {
  ArchScoreConfig,
  DeepMetrics,
  ScoreReport,
} from "./types.js";
import { VERSION } from "./constants.js";
import { scanFiles, createContext } from "./scan.js";
import { detect } from "../detect/index.js";
import { ANALYZERS } from "../analyzers/index.js";
import { selectAdapter } from "../adapters/index.js";
import { adviseFolders } from "../advisor/recommend.js";
import { score } from "./scoring.js";

export interface AnalyzeOptions {
  config?: ArchScoreConfig;
  /** Disable Deep-tier adapters even if one matches. */
  noDeep?: boolean;
  /** ISO timestamp to stamp the report with (injected for determinism/tests). */
  now?: string;
}

/**
 * The end-to-end pipeline: scan -> detect -> (deep) -> analyze -> score ->
 * folder advice -> assembled ScoreReport.
 */
export function analyzeProject(root: string, opts: AnalyzeOptions = {}): ScoreReport {
  const config = opts.config ?? {};
  const absRoot = path.resolve(root);

  const files = scanFiles(absRoot, { ignore: config.ignore });
  const detection = detect(absRoot, files);
  if (config.projectType) detection.projectType = config.projectType;

  const ctx = createContext(absRoot, files, detection);

  // Deep tier: run a language adapter if one matches.
  let deep: DeepMetrics | null = null;
  if (!opts.noDeep) {
    const adapter = selectAdapter(detection);
    if (adapter) {
      try {
        deep = adapter.analyze(ctx);
      } catch {
        deep = null;
      }
    }
  }
  ctx.deep = deep;

  const categories = ANALYZERS.map((a) => a.analyze(ctx));
  const scored = score(categories, config);
  const folder = adviseFolders(ctx);

  return {
    tool: "arch-score",
    version: VERSION,
    generatedAt: opts.now ?? new Date().toISOString(),
    root: absRoot,
    detection,
    tierUsed: deep ? "deep" : "universal",
    deep,
    overall: scored.overall,
    grade: scored.grade,
    categories: scored.categories,
    reweighted: scored.reweighted,
    recommendations: scored.recommendations,
    folder,
  };
}
