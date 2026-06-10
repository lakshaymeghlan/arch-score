import type { CategoryKey } from "./types.js";

export const VERSION = "0.1.0";

/** Human titles for each category. */
export const CATEGORY_TITLES: Record<CategoryKey, string> = {
  architecture: "Architecture & Layering",
  modularity: "Modularity & Coupling",
  folderStructure: "Folder Structure",
  testing: "Testing Architecture",
  config: "Config & 12-Factor",
  errorHandling: "Error Handling & Resilience",
  observability: "Observability",
  security: "Security Hygiene",
  documentation: "Documentation",
};

/**
 * Default category weights (structure-first profile). They sum to 100.
 * Overridable via archscore.config.js. When a category is not applicable
 * (e.g. Deep-only metric on an unsupported language), its weight is removed
 * and the rest are re-normalized to 100.
 */
export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = {
  architecture: 20,
  folderStructure: 16,
  modularity: 12,
  testing: 12,
  config: 10,
  errorHandling: 8,
  security: 8,
  observability: 7,
  documentation: 7,
};

/** Directories never worth scanning. */
export const DEFAULT_IGNORE = [
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "coverage",
  ".turbo",
  ".cache",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  ".mypy_cache",
  ".pytest_cache",
  "target",
  "bin/Debug",
  "bin/Release",
  "obj",
  ".gradle",
  ".idea",
  ".vscode",
  ".DS_Store",
  "Pods",
  ".terraform",
];

/** Max file size (bytes) to read for content heuristics. */
export const MAX_READ_BYTES = 512 * 1024;

export function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  if (score >= 50) return "E";
  return "F";
}
