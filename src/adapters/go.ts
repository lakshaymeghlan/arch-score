import type { Detection, LangAdapter, ProjectContext } from "../core/types.js";
import { analyzeGraph } from "./graph.js";

/** Read the module path from go.mod (the `module x/y/z` line). */
function readModulePath(ctx: ProjectContext): string | null {
  const gomod = ctx.readFile("go.mod");
  if (!gomod) return null;
  const m = /^module\s+(\S+)/m.exec(gomod);
  return m ? m[1] : null;
}

/** Extract imported package paths from a Go source file. */
export function extractGoImports(content: string): string[] {
  const out: string[] = [];
  // Block: import ( "a/b" \n alias "c/d" )
  const block = /import\s*\(([\s\S]*?)\)/g;
  let bm: RegExpExecArray | null;
  while ((bm = block.exec(content)) !== null) {
    const lines = bm[1].split("\n");
    for (const line of lines) {
      const lm = /"([^"]+)"/.exec(line);
      if (lm) out.push(lm[1]);
    }
  }
  // Single: import "a/b"
  const single = /^\s*import\s+(?:[\w.]+\s+)?"([^"]+)"/gm;
  let sm: RegExpExecArray | null;
  while ((sm = single.exec(content)) !== null) out.push(sm[1]);
  return out;
}

export const goAdapter: LangAdapter = {
  language: "Go",
  extensions: ["go"],
  matches(detection: Detection) {
    return detection.languages.some((l) => l.name === "Go");
  },
  analyze(ctx: ProjectContext) {
    const files = ctx.files.filter(
      (f) => f.ext === "go" && !f.relPath.endsWith("_test.go"),
    );
    if (files.length < 2) return null;
    const modulePath = readModulePath(ctx);
    if (!modulePath) return null;

    // Node = package directory. Build import-path -> dir map.
    const dirToImport = new Map<string, string>();
    const importToDir = new Map<string, string>();
    const dirs = new Set<string>();
    for (const f of files) {
      const dir = f.dir;
      dirs.add(dir);
      const importPath = dir === "" ? modulePath : `${modulePath}/${dir}`;
      dirToImport.set(dir, importPath);
      importToDir.set(importPath, dir);
    }

    const nodes = [...dirs];
    const adjacency = new Map<string, Set<string>>();
    for (const n of nodes) adjacency.set(n, new Set());

    for (const f of files) {
      const content = ctx.readFile(f.relPath);
      if (!content) continue;
      for (const imp of extractGoImports(content)) {
        if (!imp.startsWith(modulePath)) continue; // external/stdlib
        const targetDir = importToDir.get(imp);
        if (targetDir !== undefined && targetDir !== f.dir) {
          adjacency.get(f.dir)!.add(targetDir);
        }
      }
    }
    return analyzeGraph("Go", nodes, adjacency);
  },
};
