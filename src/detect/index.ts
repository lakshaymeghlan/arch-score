import * as fs from "node:fs";
import * as path from "node:path";
import type {
  Detection,
  FileEntry,
  ProjectType,
} from "../core/types.js";
import { detectLanguages } from "./languages.js";

/** Manifest filenames that identify an ecosystem. */
const MANIFESTS = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "setup.py",
  "Pipfile",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Cargo.toml",
  "composer.json",
  "Gemfile",
  "build.sbt",
  "pubspec.yaml",
  "mix.exs",
];

/** Substrings in dependency manifests that indicate a framework. */
const FRAMEWORK_SIGNALS: Array<{ name: string; needles: string[] }> = [
  { name: "react", needles: ['"react"', "'react'"] },
  { name: "next.js", needles: ['"next"'] },
  { name: "vue", needles: ['"vue"'] },
  { name: "nuxt", needles: ['"nuxt"'] },
  { name: "svelte", needles: ['"svelte"'] },
  { name: "angular", needles: ['"@angular/core"'] },
  { name: "express", needles: ['"express"'] },
  { name: "fastify", needles: ['"fastify"'] },
  { name: "nestjs", needles: ['"@nestjs/core"'] },
  { name: "koa", needles: ['"koa"'] },
  { name: "django", needles: ["django", "Django"] },
  { name: "flask", needles: ["Flask", "flask"] },
  { name: "fastapi", needles: ["fastapi", "FastAPI"] },
  { name: "spring", needles: ["spring-boot", "springframework"] },
  { name: "gin", needles: ["gin-gonic/gin"] },
  { name: "echo", needles: ["labstack/echo"] },
  { name: "rails", needles: ["rails"] },
  { name: "laravel", needles: ["laravel/framework"] },
  { name: "actix", needles: ["actix-web"] },
  { name: "axum", needles: ['axum'] },
  { name: "flutter", needles: ["flutter:"] },
  { name: "react-native", needles: ['"react-native"'] },
];

function readIfExists(root: string, rel: string): string | null {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8");
  } catch {
    return null;
  }
}

function detectFrameworks(root: string, manifests: string[]): string[] {
  const found = new Set<string>();
  const blobs: string[] = [];
  for (const m of manifests) {
    const content = readIfExists(root, m);
    if (content) blobs.push(content);
  }
  const haystack = blobs.join("\n");
  for (const sig of FRAMEWORK_SIGNALS) {
    if (sig.needles.some((n) => haystack.includes(n))) found.add(sig.name);
  }
  return [...found];
}

function isMonorepo(root: string, files: FileEntry[], pkgJson: string | null): boolean {
  if (pkgJson) {
    try {
      const parsed = JSON.parse(pkgJson) as { workspaces?: unknown };
      if (parsed.workspaces) return true;
    } catch {
      /* ignore */
    }
  }
  if (
    readIfExists(root, "pnpm-workspace.yaml") ||
    readIfExists(root, "lerna.json") ||
    readIfExists(root, "nx.json") ||
    readIfExists(root, "turbo.json")
  ) {
    return true;
  }
  // Heuristic: a packages/ or apps/ dir each holding multiple manifests.
  const subManifests = files.filter(
    (f) =>
      (f.relPath.startsWith("packages/") || f.relPath.startsWith("apps/")) &&
      (f.relPath.endsWith("/package.json") ||
        f.relPath.endsWith("/go.mod") ||
        f.relPath.endsWith("/pyproject.toml")),
  );
  return subManifests.length >= 2;
}

function classifyProjectType(
  files: FileEntry[],
  frameworks: string[],
  monorepo: boolean,
  pkgJson: string | null,
): { type: ProjectType; confidence: number } {
  if (monorepo) return { type: "monorepo", confidence: 0.9 };

  const frontendFw = ["react", "vue", "svelte", "angular", "next.js", "nuxt"];
  const backendFw = [
    "express",
    "fastify",
    "nestjs",
    "koa",
    "django",
    "flask",
    "fastapi",
    "spring",
    "gin",
    "echo",
    "rails",
    "laravel",
    "actix",
    "axum",
  ];
  const mobileFw = ["flutter", "react-native"];

  if (frameworks.some((f) => mobileFw.includes(f))) {
    return { type: "mobile", confidence: 0.85 };
  }

  // package.json clues for library vs app.
  if (pkgJson) {
    try {
      const p = JSON.parse(pkgJson) as {
        bin?: unknown;
        main?: unknown;
        module?: unknown;
        exports?: unknown;
        private?: unknown;
      };
      if (p.bin) return { type: "cli", confidence: 0.8 };
      if ((p.main || p.module || p.exports) && p.private !== true && !p.bin) {
        // Has a published entry point and isn't an app shell.
        if (!frameworks.some((f) => frontendFw.includes(f))) {
          return { type: "library", confidence: 0.6 };
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (frameworks.some((f) => frontendFw.includes(f))) {
    return { type: "frontend", confidence: 0.85 };
  }
  if (frameworks.some((f) => backendFw.includes(f))) {
    return { type: "backend", confidence: 0.85 };
  }

  // Extension-based fallback.
  const hasHtml = files.some((f) => f.ext === "html");
  const hasServerLang = files.some((f) => ["go", "py", "java", "rb", "rs", "cs"].includes(f.ext));
  if (hasServerLang) return { type: "backend", confidence: 0.4 };
  if (hasHtml) return { type: "frontend", confidence: 0.4 };

  return { type: "unknown", confidence: 0.2 };
}

export function detect(root: string, files: FileEntry[]): Detection {
  const manifests = MANIFESTS.filter((m) =>
    files.some((f) => f.relPath === m),
  );
  const pkgJson = readIfExists(root, "package.json");
  const languages = detectLanguages(files);
  const frameworks = detectFrameworks(root, manifests);
  const monorepo = isMonorepo(root, files, pkgJson);
  const { type, confidence } = classifyProjectType(
    files,
    frameworks,
    monorepo,
    pkgJson,
  );

  return {
    languages,
    primaryLanguage: languages[0]?.name ?? "unknown",
    frameworks,
    projectType: type,
    manifests,
    isMonorepo: monorepo,
    confidence,
  };
}
