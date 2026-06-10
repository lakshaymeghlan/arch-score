import type { Detection, FileEntry, ProjectContext } from "../src/core/types.js";
import { detect } from "../src/detect/index.js";

/**
 * Build an in-memory ProjectContext from a { relPath: content } map — no disk
 * access, so analyzers and adapters can be unit-tested with tiny fixtures.
 */
export function fakeContext(
  files: Record<string, string>,
  detectionOverride?: Partial<Detection>,
): ProjectContext {
  const entries: FileEntry[] = Object.entries(files).map(([relPath, content]) => {
    const ext = relPath.includes(".") ? relPath.split(".").pop()!.toLowerCase() : "";
    const dir = relPath.includes("/") ? relPath.slice(0, relPath.lastIndexOf("/")) : "";
    return {
      absPath: "/virtual/" + relPath,
      relPath,
      ext,
      size: Buffer.byteLength(content, "utf8"),
      dir,
    };
  });

  // Run real detection on the synthetic file list, reading from the map.
  const baseDetection = detectFromMap(files, entries);
  const detection: Detection = { ...baseDetection, ...detectionOverride };

  const byPath = new Map(entries.map((e) => [e.relPath, e]));
  return {
    root: "/virtual",
    files: entries,
    detection,
    readFile: (relPath: string) => (relPath in files ? files[relPath] : null),
    exists: (relPath: string) => relPath in files,
    byExt: (ext: string) => entries.filter((e) => e.ext === ext.toLowerCase()),
    topLevelDirs: () => {
      const set = new Set<string>();
      for (const e of entries) if (e.relPath.includes("/")) set.add(e.relPath.split("/")[0]);
      return [...set].sort();
    },
  };
}

/** Detection over a fixture map (manifests are read from the map, not disk). */
function detectFromMap(files: Record<string, string>, entries: FileEntry[]): Detection {
  // detect() reads manifests from disk; for fixtures we patch fs via a shim.
  // Simpler: replicate the parts we need by temporarily exposing the map.
  // Here we just call detect with a root that has no files, then fix languages.
  const det = detect("/virtual", entries);
  // detect() couldn't read manifest contents (no disk), so frameworks may be
  // empty; tests that need frameworks pass a detectionOverride.
  void files;
  return det;
}
