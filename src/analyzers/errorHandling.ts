import type { Analyzer, Finding, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";
import { sourceFiles, countMatches } from "./util.js";

/** Empty/swallowed catch blocks across common languages. */
const EMPTY_CATCH_RES = [
  /catch\s*\([^)]*\)\s*\{\s*\}/g, // JS/TS/Java/C# empty catch
  /except[^\n:]*:\s*\n\s*pass\b/g, // python except: pass
  /catch\s*\{\s*\}/g, // C# catch {}
];

/** Resilience-related dependency/config signals. */
const RESILIENCE_SIGNALS = [
  "timeout",
  "retry",
  "retries",
  "circuit",
  "backoff",
  "ratelimit",
  "rate-limit",
  "bulkhead",
  "polly",
  "resilience4j",
  "opossum",
  "tenacity",
];

/**
 * Error Handling & Resilience (universal + light source heuristics).
 */
export const errorHandlingAnalyzer: Analyzer = {
  key: "errorHandling",
  title: "Error Handling & Resilience",
  analyze(ctx: ProjectContext) {
    const findings: Finding[] = [];
    const src = sourceFiles(ctx);
    if (src.length === 0) {
      return buildCategory("errorHandling", "universal", [], {
        applicable: false,
        notes: ["No source files; error handling not assessed."],
      });
    }

    // Empty catch blocks.
    let emptyCatch = 0;
    const refs: string[] = [];
    for (const f of src) {
      const c = ctx.readFile(f.relPath);
      if (!c) continue;
      const hits = EMPTY_CATCH_RES.reduce((s, re) => s + countMatches(c, re), 0);
      if (hits > 0) {
        emptyCatch += hits;
        if (refs.length < 5) refs.push(f.relPath);
      }
    }
    if (emptyCatch > 0) {
      findings.push({
        id: "err.empty-catch",
        severity: emptyCatch > 5 ? "high" : "medium",
        points: Math.min(30, emptyCatch * 5),
        message: `${emptyCatch} empty/swallowed catch block(s) — errors silently discarded.`,
        fix: "Handle, log, or rethrow in catch blocks; never swallow errors silently.",
        refs,
      });
    }

    // Centralized error handling presence.
    const hasCentral = ctx.files.some((f) =>
      /(errorhandler|error-handler|error_handler|errors?\.(ts|js|py|go|rs|java)|exception|middleware\/error)/i.test(
        f.relPath,
      ),
    );
    if (!hasCentral && src.length > 15) {
      findings.push({
        id: "err.no-central",
        severity: "low",
        points: 10,
        message: "No centralized error-handling module/middleware detected.",
        fix: "Introduce a single error-handling boundary (middleware or top-level handler) that maps errors to responses/exit codes.",
      });
    }

    // Resilience signals (timeouts/retries/circuit breakers).
    const manifests = ctx.detection.manifests
      .map((m) => ctx.readFile(m) ?? "")
      .join("\n")
      .toLowerCase();
    let resilienceInCode = false;
    for (const f of src.slice(0, 500)) {
      const c = ctx.readFile(f.relPath);
      if (c && RESILIENCE_SIGNALS.some((s) => c.toLowerCase().includes(s))) {
        resilienceInCode = true;
        break;
      }
    }
    const hasResilience =
      resilienceInCode || RESILIENCE_SIGNALS.some((s) => manifests.includes(s));
    const isService = ["backend", "monorepo"].includes(ctx.detection.projectType);
    if (isService && !hasResilience) {
      findings.push({
        id: "err.no-resilience",
        severity: "medium",
        points: 12,
        message: "No timeout/retry/circuit-breaker signals for a backend service.",
        fix: "Add timeouts and retries (with backoff) around network calls; consider circuit breakers for critical dependencies.",
      });
    }

    return buildCategory("errorHandling", "universal", findings);
  },
};
