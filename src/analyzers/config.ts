import type { Analyzer, Finding, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";
import { sourceFiles, countMatches } from "./util.js";

/** Hardcoded host/port/URL patterns that should usually come from env/config. */
const HARDCODE_RES = [
  /\bhttps?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|example\.|schemas?\.|www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}/gi,
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
];

/**
 * Config & 12-Factor (universal tier).
 * Rewards env-based config and an .env.example; penalizes hardcoded
 * endpoints scattered through source and committed .env files.
 */
export const configAnalyzer: Analyzer = {
  key: "config",
  title: "Config & 12-Factor",
  analyze(ctx: ProjectContext) {
    const findings: Finding[] = [];
    const src = sourceFiles(ctx);

    // Committed .env file (not example).
    const committedEnv = ctx.files.filter((f) => {
      const base = f.relPath.split("/").pop()!.toLowerCase();
      return base === ".env" || /^\.env\.(production|prod|local|development)$/.test(base);
    });
    if (committedEnv.length > 0) {
      findings.push({
        id: "config.committed-env",
        severity: "high",
        points: 25,
        message: "A concrete .env file appears to be committed to the repo.",
        fix: "Remove committed .env files, add them to .gitignore, and ship a redacted .env.example instead.",
        refs: committedEnv.map((f) => f.relPath),
      });
    }

    // .env.example presence (only meaningful if the project reads env).
    const usesEnv = src.some((f) => {
      const c = ctx.readFile(f.relPath);
      return c ? /process\.env|os\.environ|os\.getenv|System\.getenv|ENV\[|std::env|Deno\.env/.test(c) : false;
    });
    const hasExample = ctx.files.some((f) =>
      /(^|\/)\.env\.example$|(^|\/)\.env\.sample$|(^|\/)\.env\.template$/i.test(f.relPath),
    );
    if (usesEnv && !hasExample) {
      findings.push({
        id: "config.no-example",
        severity: "low",
        points: 8,
        message: "Code reads environment variables but there's no .env.example documenting them.",
        fix: "Add a committed .env.example listing every required variable (with safe placeholder values).",
      });
    }

    // Hardcoded endpoints across source.
    let hardcodeHits = 0;
    const hardcodeRefs: string[] = [];
    for (const f of src) {
      const c = ctx.readFile(f.relPath);
      if (!c) continue;
      const hits = HARDCODE_RES.reduce((s, re) => s + countMatches(c, re), 0);
      if (hits > 0) {
        hardcodeHits += hits;
        if (hardcodeRefs.length < 5) hardcodeRefs.push(f.relPath);
      }
    }
    if (hardcodeHits > 3) {
      findings.push({
        id: "config.hardcoded-endpoints",
        severity: "medium",
        points: Math.min(20, Math.round(hardcodeHits / 2)),
        message: `${hardcodeHits} hardcoded host/IP/URL occurrence(s) in source.`,
        fix: "Move environment-specific endpoints into configuration/env vars; keep source environment-agnostic.",
        refs: hardcodeRefs,
      });
    }

    if (!usesEnv && src.length > 10) {
      findings.push({
        id: "config.no-env",
        severity: "low",
        points: 8,
        message: "No evidence of environment-based configuration.",
        fix: "Externalize config (ports, hosts, credentials, feature flags) via environment variables per 12-factor.",
      });
    }

    return buildCategory("config", "universal", findings);
  },
};
