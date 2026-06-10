import * as fs from "node:fs";
import * as path from "node:path";
import { DEFAULT_IGNORE, MAX_READ_BYTES } from "./constants.js";
import type { Detection, FileEntry, ProjectContext } from "./types.js";

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function isIgnored(relPath: string, ignore: string[]): boolean {
  const parts = relPath.split("/");
  return ignore.some(
    (frag) => parts.includes(frag) || relPath === frag || relPath.startsWith(frag + "/"),
  );
}

export interface ScanOptions {
  ignore?: string[];
  /** Maximum number of files to read; guards against pathological repos. */
  maxFiles?: number;
}

/** Recursively walk a directory and collect file entries. */
export function scanFiles(root: string, opts: ScanOptions = {}): FileEntry[] {
  const ignore = [...DEFAULT_IGNORE, ...(opts.ignore ?? [])];
  const maxFiles = opts.maxFiles ?? 50_000;
  const out: FileEntry[] = [];
  const stack: string[] = [root];

  while (stack.length > 0 && out.length < maxFiles) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = toPosix(path.relative(root, abs));
      if (isIgnored(rel, ignore)) continue;
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.isFile()) {
        let size = 0;
        try {
          size = fs.statSync(abs).size;
        } catch {
          continue;
        }
        const extWithDot = path.extname(entry.name);
        const ext = extWithDot ? extWithDot.slice(1).toLowerCase() : "";
        out.push({
          absPath: abs,
          relPath: rel,
          ext,
          size,
          dir: toPosix(path.dirname(rel)) === "." ? "" : toPosix(path.dirname(rel)),
        });
      }
    }
  }
  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

/** Build a ProjectContext with cached read helpers over a file set. */
export function createContext(
  root: string,
  files: FileEntry[],
  detection: Detection,
): ProjectContext {
  const byPath = new Map<string, FileEntry>();
  for (const f of files) byPath.set(f.relPath, f);
  const readCache = new Map<string, string | null>();

  function readFile(relPath: string): string | null {
    const key = toPosix(relPath);
    if (readCache.has(key)) return readCache.get(key)!;
    const entry = byPath.get(key);
    let content: string | null = null;
    if (entry && entry.size <= MAX_READ_BYTES) {
      try {
        const buf = fs.readFileSync(entry.absPath);
        // Skip binary-looking files (NUL byte in first 4KB).
        if (!buf.subarray(0, 4096).includes(0)) {
          content = buf.toString("utf8");
          entry.lines = content.length === 0 ? 0 : content.split("\n").length;
        }
      } catch {
        content = null;
      }
    }
    readCache.set(key, content);
    return content;
  }

  return {
    root,
    files,
    detection,
    readFile,
    exists: (relPath: string) => byPath.has(toPosix(relPath)),
    byExt: (ext: string) => files.filter((f) => f.ext === ext.toLowerCase()),
    topLevelDirs: () => {
      const set = new Set<string>();
      for (const f of files) {
        const top = f.relPath.split("/")[0];
        if (f.relPath.includes("/")) set.add(top);
      }
      return [...set].sort();
    },
  };
}
