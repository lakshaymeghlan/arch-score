import type { Analyzer, Finding, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";
import { sourceFiles } from "./util.js";

/**
 * High-signal secret token patterns. These provider-specific formats are
 * distinctive enough to flag unconditionally (not placeholder-suppressed).
 */
const TOKEN_RES: Array<{ name: string; re: RegExp }> = [
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "Slack token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g },
  { name: "GitHub token", re: /\bgh[pousr]_[0-9A-Za-z]{36,}\b/g },
  { name: "Stripe secret key", re: /\bsk_live_[0-9A-Za-z]{16,}\b/g },
  { name: "private key block", re: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
];

/**
 * Generic credential-assignment pattern. Prone to false positives, so matches
 * are suppressed when they look like placeholders or env-var references.
 */
const ASSIGN_RE =
  /(password|passwd|secret|api[_-]?key|token|access[_-]?key)\s*[:=]\s*['"][^'"\n]{8,}['"]/gi;

/** Assignments that are obviously placeholders, to suppress false positives. */
const PLACEHOLDER = /(your[_-]?|example|changeme|placeholder|xxxx|\.\.\.|<.*>|process\.env|os\.environ|getenv|\$\{)/i;

/**
 * Security Hygiene (universal tier).
 * Secret/credential leakage heuristics, .gitignore coverage, dependency
 * pinning. Intentionally conservative on secret matching.
 */
export const securityAnalyzer: Analyzer = {
  key: "security",
  title: "Security Hygiene",
  analyze(ctx: ProjectContext) {
    const findings: Finding[] = [];
    const src = sourceFiles(ctx);

    // Scan source + common config files for secrets.
    const scanTargets = ctx.files.filter(
      (f) =>
        src.includes(f) ||
        ["env", "yml", "yaml", "json", "toml", "ini", "conf", "properties"].includes(f.ext) ||
        f.relPath.split("/").pop()!.toLowerCase().startsWith(".env"),
    );
    const secretRefs: string[] = [];
    let secretCount = 0;
    for (const f of scanTargets) {
      // Don't flag the example/sample files.
      if (/\.(example|sample|template)$/i.test(f.relPath)) continue;
      const c = ctx.readFile(f.relPath);
      if (!c) continue;
      let flaggedThisFile = false;
      // High-signal provider tokens. AWS publishes example keys ending in
      // "EXAMPLE"; treat those as the documented placeholders they are.
      for (const { re } of TOKEN_RES) {
        const matches = c.match(re);
        if (matches && matches.some((m) => !m.includes("EXAMPLE"))) {
          secretCount += 1;
          flaggedThisFile = true;
          break;
        }
      }
      // Generic credential assignments: only when not a placeholder/env ref.
      if (!flaggedThisFile) {
        const assigns = c.match(ASSIGN_RE);
        if (assigns && assigns.some((m) => !PLACEHOLDER.test(m))) {
          secretCount += 1;
          flaggedThisFile = true;
        }
      }
      if (flaggedThisFile && secretRefs.length < 6) secretRefs.push(f.relPath);
    }
    if (secretCount > 0) {
      findings.push({
        id: "sec.secret",
        severity: "high",
        points: Math.min(45, 20 + secretCount * 5),
        message: `${secretCount} likely hardcoded secret(s)/credential(s) detected.`,
        fix: "Remove secrets from the repo, rotate them, and load via environment/secret manager. Add a secret scanner to CI.",
        refs: secretRefs,
      });
    }

    // .gitignore coverage for env/secret files.
    const gitignore = ctx.readFile(".gitignore") ?? "";
    const ignoresEnv = /(^|\n)\s*\*?\.env/.test(gitignore) || gitignore.includes(".env");
    const hasEnvFiles = ctx.files.some((f) =>
      f.relPath.split("/").pop()!.toLowerCase().startsWith(".env"),
    );
    if (hasEnvFiles && !ignoresEnv) {
      findings.push({
        id: "sec.gitignore-env",
        severity: "medium",
        points: 12,
        message: ".env-style files exist but .gitignore doesn't appear to exclude them.",
        fix: "Add `.env` and `.env.*` (except `.env.example`) to .gitignore.",
      });
    }

    if (!ctx.exists(".gitignore") && src.length > 5) {
      findings.push({
        id: "sec.no-gitignore",
        severity: "low",
        points: 6,
        message: "No .gitignore present.",
        fix: "Add a .gitignore covering build output, dependencies, and secret/env files.",
      });
    }

    // Dependency pinning (lockfile presence) for ecosystems that have one.
    const hasNodeManifest = ctx.detection.manifests.includes("package.json");
    const hasLock = ctx.files.some((f) =>
      /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Pipfile\.lock|go\.sum|Cargo\.lock|composer\.lock|Gemfile\.lock)$/.test(
        f.relPath,
      ),
    );
    if (hasNodeManifest && !hasLock) {
      findings.push({
        id: "sec.no-lockfile",
        severity: "low",
        points: 8,
        message: "Dependency manifest present but no lockfile committed.",
        fix: "Commit a lockfile so builds are reproducible and dependency versions are auditable.",
      });
    }

    return buildCategory("security", "universal", findings);
  },
};
