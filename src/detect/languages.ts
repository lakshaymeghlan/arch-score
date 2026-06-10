import type { FileEntry, LanguageInfo } from "../core/types.js";

/** Map file extension -> language name. */
const EXT_LANG: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  rb: "Ruby",
  php: "PHP",
  cs: "C#",
  swift: "Swift",
  c: "C",
  h: "C",
  cpp: "C++",
  cc: "C++",
  hpp: "C++",
  scala: "Scala",
  dart: "Dart",
  ex: "Elixir",
  exs: "Elixir",
  clj: "Clojure",
  vue: "Vue",
  svelte: "Svelte",
};

/** Aggregate languages by byte share across the scanned files. */
export function detectLanguages(files: FileEntry[]): LanguageInfo[] {
  const acc = new Map<string, LanguageInfo>();
  for (const f of files) {
    const lang = EXT_LANG[f.ext];
    if (!lang) continue;
    const cur = acc.get(lang) ?? { name: lang, files: 0, bytes: 0 };
    cur.files += 1;
    cur.bytes += f.size;
    acc.set(lang, cur);
  }
  return [...acc.values()].sort((a, b) => b.bytes - a.bytes);
}
