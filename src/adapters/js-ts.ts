import * as path from "node:path";
import type { Detection, LangAdapter, ProjectContext } from "../core/types.js";
import { analyzeGraph } from "./graph.js";

const EXTS = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];
const RESOLVE_EXTS = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];

/** Extract import/require/export-from specifiers from a JS/TS source string. */
export function extractSpecifiers(content: string): string[] {
  const specs: string[] = [];
  const res = [
    /\bimport\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:\*|[^'"]*?)\s+from\s+['"]([^'"]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of res) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) specs.push(m[1]);
  }
  return specs;
}

/** Resolve a relative specifier to a module path present in `fileSet`. */
function resolveRelative(
  importerRel: string,
  spec: string,
  fileSet: Set<string>,
): string | null {
  if (!spec.startsWith(".")) return null; // bare/external import
  const baseDir = path.posix.dirname(importerRel);
  const joined = path.posix.normalize(path.posix.join(baseDir, spec));

  // Exact file (spec already had an extension).
  if (fileSet.has(joined)) return joined;
  // Try appending extensions.
  for (const ext of RESOLVE_EXTS) {
    const cand = `${joined}.${ext}`;
    if (fileSet.has(cand)) return cand;
  }
  // Try as a directory index.
  for (const ext of RESOLVE_EXTS) {
    const cand = `${joined}/index.${ext}`;
    if (fileSet.has(cand)) return cand;
  }
  return null;
}

export const jsTsAdapter: LangAdapter = {
  language: "JavaScript/TypeScript",
  extensions: EXTS,
  matches(detection: Detection) {
    return detection.languages.some(
      (l) => l.name === "TypeScript" || l.name === "JavaScript",
    );
  },
  analyze(ctx: ProjectContext) {
    const files = ctx.files.filter(
      (f) => EXTS.includes(f.ext) && !/\.d\.ts$/.test(f.relPath),
    );
    if (files.length < 2) return null;
    const fileSet = new Set(files.map((f) => f.relPath));
    const nodes = [...fileSet];
    const adjacency = new Map<string, Set<string>>();
    for (const n of nodes) adjacency.set(n, new Set());

    for (const f of files) {
      const content = ctx.readFile(f.relPath);
      if (!content) continue;
      for (const spec of extractSpecifiers(content)) {
        const resolved = resolveRelative(f.relPath, spec, fileSet);
        if (resolved) adjacency.get(f.relPath)!.add(resolved);
      }
    }
    return analyzeGraph("JavaScript/TypeScript", nodes, adjacency);
  },
};
