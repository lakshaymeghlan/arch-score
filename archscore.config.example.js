// archscore.config.js — optional configuration for arch-score.
// Copy to `archscore.config.js` in your project root and adjust.
//
// All fields are optional. Weights you omit fall back to the defaults, and the
// effective weights are always re-normalized across the categories that apply.

/** @type {import('arch-score').ArchScoreConfig} */
export default {
  // Override category weights (relative values; they're normalized to 100).
  // Keys: architecture | modularity | folderStructure | testing | config
  //       | errorHandling | observability | security | documentation
  weights: {
    architecture: 20,
    folderStructure: 16,
    modularity: 12,
    testing: 12,
    config: 10,
    errorHandling: 8,
    security: 8,
    observability: 7,
    documentation: 7,
  },

  // Extra path fragments to ignore during the scan (added to the defaults).
  ignore: ["generated", "third_party"],

  // CI gate: `--ci` exits non-zero below this score (CLI --threshold wins).
  threshold: 75,

  // Force a project type instead of auto-detecting:
  // 'frontend' | 'backend' | 'cli' | 'library' | 'mobile' | 'monorepo'
  // projectType: 'backend',
};
