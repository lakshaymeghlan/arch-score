import type { FileEntry, ProjectContext } from "../core/types.js";

/** Extensions treated as "source code" for ratios and outlier checks. */
export const SOURCE_EXTS = [
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "go", "rs", "java", "kt", "rb", "php", "cs",
  "swift", "c", "cpp", "scala", "dart", "ex", "vue", "svelte",
];

export function isSourceFile(f: FileEntry): boolean {
  return SOURCE_EXTS.includes(f.ext);
}

export function sourceFiles(ctx: ProjectContext): FileEntry[] {
  return ctx.files.filter(isSourceFile);
}

/** True if any file path matches the given predicate over its lowercased relPath. */
export function hasFile(ctx: ProjectContext, pred: (rel: string) => boolean): boolean {
  return ctx.files.some((f) => pred(f.relPath.toLowerCase()));
}

/** Find files whose basename matches one of the given names (case-insensitive). */
export function findByName(ctx: ProjectContext, names: string[]): FileEntry[] {
  const lower = names.map((n) => n.toLowerCase());
  return ctx.files.filter((f) => {
    const base = f.relPath.split("/").pop()!.toLowerCase();
    return lower.includes(base);
  });
}

/** Count occurrences of a regex across a file's content. */
export function countMatches(content: string, re: RegExp): number {
  const matches = content.match(re);
  return matches ? matches.length : 0;
}

/** Estimate lines of a file, reading it if needed. */
export function lineCount(ctx: ProjectContext, f: FileEntry): number {
  if (f.lines !== undefined) return f.lines;
  const content = ctx.readFile(f.relPath);
  return content ? content.split("\n").length : 0;
}
