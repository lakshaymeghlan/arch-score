/**
 * Core type definitions shared across every layer of arch-score.
 *
 * The data flow is:
 *   scan -> ProjectContext -> detect -> Detection
 *        -> analyzers/adapters -> CategoryResult[] + DeepMetrics
 *        -> scoring engine -> ScoreReport
 *        -> reporters / generators
 */

export type Tier = "universal" | "deep";

/** A single file discovered during the scan. */
export interface FileEntry {
  /** Absolute path on disk. */
  absPath: string;
  /** Path relative to the project root, using forward slashes. */
  relPath: string;
  /** Lowercased extension without the leading dot (e.g. "ts", "py"). */
  ext: string;
  /** File size in bytes. */
  size: number;
  /** Relative directory containing the file (forward slashes, "" for root). */
  dir: string;
  /** Lazily-computed line count (filled in on first read). */
  lines?: number;
}

export type ProjectType =
  | "frontend"
  | "backend"
  | "cli"
  | "library"
  | "mobile"
  | "monorepo"
  | "unknown";

export interface LanguageInfo {
  name: string;
  files: number;
  bytes: number;
}

export interface Detection {
  /** Languages sorted by byte share, descending. */
  languages: LanguageInfo[];
  primaryLanguage: string;
  /** Detected frameworks/libraries (e.g. "react", "express", "django"). */
  frameworks: string[];
  projectType: ProjectType;
  /** Manifest files found at the root (package.json, go.mod, ...). */
  manifests: string[];
  isMonorepo: boolean;
  /** Confidence 0-1 in the projectType classification. */
  confidence: number;
}

/**
 * The analysis surface handed to every analyzer and adapter. It exposes the
 * file list plus cached read helpers so analyzers never touch the disk
 * directly (keeps them unit-testable with in-memory fixtures).
 */
export interface ProjectContext {
  root: string;
  files: FileEntry[];
  detection: Detection;
  /** Deep-tier metrics, populated by the orchestrator when an adapter ran. */
  deep?: DeepMetrics | null;
  /** Read a file by relative path; returns null if missing/binary. */
  readFile(relPath: string): string | null;
  /** True if a relative path exists in the scanned set. */
  exists(relPath: string): boolean;
  /** All files matching an extension (without dot). */
  byExt(ext: string): FileEntry[];
  /** Top-level directory names (depth 1). */
  topLevelDirs(): string[];
}

export type CategoryKey =
  | "architecture"
  | "modularity"
  | "folderStructure"
  | "testing"
  | "config"
  | "errorHandling"
  | "containerization"
  | "observability"
  | "security"
  | "documentation";

export type Severity = "info" | "low" | "medium" | "high";

/** A single reason points were deducted, with a concrete fix. */
export interface Finding {
  id: string;
  severity: Severity;
  /** Points deducted from the category (positive number). */
  points: number;
  /** Why points were lost. */
  message: string;
  /** Concrete, actionable fix. */
  fix: string;
  /** File references supporting the finding. */
  refs?: string[];
}

export interface CategoryResult {
  key: CategoryKey;
  title: string;
  /** 0-100 sub-score. */
  score: number;
  /** Effective weight after re-normalization. */
  weight: number;
  tier: Tier;
  findings: Finding[];
  /** False => could not be fairly assessed; re-weighted out of the total. */
  applicable: boolean;
  notes?: string[];
}

export type StructurePattern =
  | "layered"
  | "hexagonal"
  | "feature"
  | "mvc"
  | "flat"
  | "unknown";

export interface FolderAdvice {
  current: StructurePattern;
  recommended: StructurePattern;
  projectType: ProjectType;
  rationale: string;
  /** A concrete proposed directory tree as a string. */
  proposedTree: string;
  /** Gap diff between current and recommended layout. */
  gaps: string[];
}

export interface Recommendation {
  category: CategoryKey;
  /** Impact = weight * (points / 100); used for ranking. */
  impact: number;
  message: string;
  fix: string;
  refs?: string[];
}

/** Dependency graph produced by a Deep-tier language adapter. */
export interface DependencyGraph {
  /** Module identifiers (relative file paths). */
  nodes: string[];
  /** Adjacency: from-module -> set of imported modules. */
  edges: Record<string, string[]>;
}

export interface DeepMetrics {
  language: string;
  graph: DependencyGraph;
  /** Detected import cycles (each a list of module paths). */
  cycles: string[][];
  fanIn: Record<string, number>;
  fanOut: Record<string, number>;
  /** Longest dependency chain depth. */
  maxDepth: number;
  /** Count of modules analyzed. */
  moduleCount: number;
}

export interface ScoreReport {
  tool: "arch-score";
  version: string;
  generatedAt: string;
  root: string;
  detection: Detection;
  tierUsed: Tier;
  deep: DeepMetrics | null;
  /** Weighted overall score, 0-100. */
  overall: number;
  /** Letter-ish band derived from overall. */
  grade: string;
  categories: CategoryResult[];
  /** Categories that were re-weighted out (not applicable). */
  reweighted: CategoryKey[];
  recommendations: Recommendation[];
  folder: FolderAdvice;
}

/** A single Analyzer contributes one category sub-score. */
export interface Analyzer {
  key: CategoryKey;
  title: string;
  analyze(ctx: ProjectContext): CategoryResult;
}

/** A Deep-tier per-language plugin. */
export interface LangAdapter {
  language: string;
  /** Extensions (without dot) this adapter understands. */
  extensions: string[];
  matches(detection: Detection): boolean;
  analyze(ctx: ProjectContext): DeepMetrics | null;
}

export interface ArchScoreConfig {
  /** Override category weights; remaining weight is normalized to 100. */
  weights?: Partial<Record<CategoryKey, number>>;
  /** Additional glob-ish path fragments to ignore during scan. */
  ignore?: string[];
  /** CI threshold (0-100). */
  threshold?: number;
  /** Force a project type instead of auto-detecting. */
  projectType?: ProjectType;
}
