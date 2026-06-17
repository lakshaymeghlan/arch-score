/**
 * Public API for arch-score. Use this when embedding the analyzer in other
 * tools; the CLI in bin/ is a thin wrapper over `analyzeProject`.
 */
export { analyzeProject } from "./core/analyze.js";
export type { AnalyzeOptions } from "./core/analyze.js";
export { loadConfig } from "./config/load.js";
export { renderTerminal, renderJson, renderHtml } from "./reporters/index.js";
export {
  generateSystemDesign,
  generateSkill,
  SKILL_FILENAMES,
  generateBadgeSvg,
  generateBadgeJson,
  badgeColorName,
  generatePrComment,
  PR_COMMENT_MARKER,
} from "./generators/index.js";
export type { SkillFormat } from "./generators/index.js";
export { deepReview, buildSummary } from "./ai/deepReview.js";
export { ANALYZERS } from "./analyzers/index.js";
export { ADAPTERS, selectAdapter } from "./adapters/index.js";
export { DEFAULT_WEIGHTS, CATEGORY_TITLES, VERSION } from "./core/constants.js";
export * from "./core/types.js";
