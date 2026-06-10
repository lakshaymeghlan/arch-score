import type { Detection, LangAdapter, ProjectContext } from "../core/types.js";
import { analyzeGraph } from "./graph.js";

/** Map a python file path to its dotted module name (a/b/c.py -> a.b.c). */
function moduleName(rel: string): string {
  let p = rel.replace(/\.py$/, "");
  if (p.endsWith("/__init__")) p = p.slice(0, -"/__init__".length);
  return p.split("/").join(".");
}

/** Extract (level, target) import targets from python source. */
export function extractPyImports(content: string): Array<{ level: number; module: string }> {
  const out: Array<{ level: number; module: string }> = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // from .x.y import z   /  from ..pkg import a
    const fromM = /^from\s+(\.*)([\w.]*)\s+import\s+/.exec(trimmed);
    if (fromM) {
      out.push({ level: fromM[1].length, module: fromM[2] });
      continue;
    }
    // import a.b.c [, d.e]
    const impM = /^import\s+(.+)$/.exec(trimmed);
    if (impM) {
      for (const part of impM[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name) out.push({ level: 0, module: name });
      }
    }
  }
  return out;
}

/** Resolve an import to a known module file, returning its rel path or null. */
function resolve(
  importerRel: string,
  imp: { level: number; module: string },
  byModule: Map<string, string>,
): string | null {
  if (imp.level > 0) {
    // Relative import: walk up `level` packages from the importer's package.
    const pkgParts = importerRel.replace(/\.py$/, "").split("/");
    // Drop the file itself, then go up (level-1) more.
    pkgParts.pop();
    for (let i = 1; i < imp.level; i++) pkgParts.pop();
    const base = pkgParts.join(".");
    const full = imp.module ? (base ? `${base}.${imp.module}` : imp.module) : base;
    return matchModule(full, byModule);
  }
  return matchModule(imp.module, byModule);
}

/** Match a dotted name (or a prefix of it) to a known module file. */
function matchModule(dotted: string, byModule: Map<string, string>): string | null {
  if (!dotted) return null;
  if (byModule.has(dotted)) return byModule.get(dotted)!;
  // `from a.b import c` may name a symbol; fall back to the module a.b.
  const parts = dotted.split(".");
  for (let i = parts.length; i >= 1; i--) {
    const prefix = parts.slice(0, i).join(".");
    if (byModule.has(prefix)) return byModule.get(prefix)!;
  }
  return null;
}

export const pythonAdapter: LangAdapter = {
  language: "Python",
  extensions: ["py"],
  matches(detection: Detection) {
    return detection.languages.some((l) => l.name === "Python");
  },
  analyze(ctx: ProjectContext) {
    const files = ctx.files.filter((f) => f.ext === "py");
    if (files.length < 2) return null;

    const byModule = new Map<string, string>();
    for (const f of files) byModule.set(moduleName(f.relPath), f.relPath);

    const nodes = files.map((f) => f.relPath);
    const adjacency = new Map<string, Set<string>>();
    for (const n of nodes) adjacency.set(n, new Set());

    for (const f of files) {
      const content = ctx.readFile(f.relPath);
      if (!content) continue;
      for (const imp of extractPyImports(content)) {
        const resolved = resolve(f.relPath, imp, byModule);
        if (resolved && resolved !== f.relPath) adjacency.get(f.relPath)!.add(resolved);
      }
    }
    return analyzeGraph("Python", nodes, adjacency);
  },
};
