import type { ProjectContext, StructurePattern } from "../core/types.js";

/** Directory-name signals for each architectural pattern. */
const SIGNALS: Record<Exclude<StructurePattern, "flat" | "unknown">, string[]> = {
  hexagonal: [
    "domain",
    "application",
    "infrastructure",
    "adapters",
    "ports",
    "usecases",
    "use_cases",
    "entities",
  ],
  layered: [
    "controllers",
    "services",
    "repositories",
    "models",
    "dao",
    "dto",
    "handlers",
    "middleware",
  ],
  feature: ["features", "modules", "domains"],
  mvc: ["controllers", "models", "views"],
};

/** Collect the set of directory names (any depth) present in the project. */
export function dirNameSet(ctx: ProjectContext): Set<string> {
  const set = new Set<string>();
  for (const f of ctx.files) {
    for (const part of f.relPath.split("/").slice(0, -1)) {
      set.add(part.toLowerCase());
    }
  }
  return set;
}

/**
 * Classify the project's current folder structure. Picks the pattern with the
 * most directory-name signal hits; falls back to "flat" when there is little
 * directory nesting and "unknown" when nothing matches.
 */
export function classifyStructure(ctx: ProjectContext): StructurePattern {
  const dirs = dirNameSet(ctx);

  // Source files outside any meaningful directory => flat.
  const sourceFiles = ctx.files.filter((f) =>
    ["ts", "js", "py", "go", "java", "rb", "rs", "php", "cs"].includes(f.ext),
  );
  const nestedSource = sourceFiles.filter((f) => f.relPath.split("/").length > 2);
  if (sourceFiles.length > 0 && nestedSource.length / sourceFiles.length < 0.2) {
    return "flat";
  }

  const scores: Array<{ pattern: StructurePattern; hits: number }> = [];
  for (const [pattern, names] of Object.entries(SIGNALS)) {
    const hits = names.filter((n) => dirs.has(n)).length;
    scores.push({ pattern: pattern as StructurePattern, hits });
  }
  scores.sort((a, b) => b.hits - a.hits);

  // MVC and layered overlap on "controllers"/"models"; prefer MVC only when
  // "views" is explicitly present, otherwise treat as layered.
  const mvc = scores.find((s) => s.pattern === "mvc")!;
  if (mvc.hits >= 2 && dirs.has("views")) return "mvc";

  const best = scores.filter((s) => s.pattern !== "mvc").sort((a, b) => b.hits - a.hits)[0];
  if (best && best.hits >= 2) return best.pattern;
  if (best && best.hits === 1) return best.pattern;

  return "unknown";
}
