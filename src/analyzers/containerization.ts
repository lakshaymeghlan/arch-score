import type { Analyzer, Finding, FileEntry, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";

/**
 * Containerization (universal tier).
 *
 * Only services genuinely need a container, so this category applies to
 * `backend` and `monorepo` projects. CLIs, libraries, frontends (often
 * deployed to static hosts/CDNs), mobile apps, and unknown types are marked
 * not-applicable and re-weighted out — they are never penalized for lacking a
 * Dockerfile.
 *
 * For services it rewards a Dockerfile / compose file and flags a Dockerfile
 * that defines no HEALTHCHECK (orchestrators can't tell when it's unhealthy).
 */
const SERVICE_TYPES = ["backend", "monorepo"];

function findDockerfiles(ctx: ProjectContext): FileEntry[] {
  return ctx.files.filter((f) => {
    const base = f.relPath.split("/").pop()!.toLowerCase();
    return base === "dockerfile" || base.endsWith(".dockerfile") || base === "containerfile";
  });
}

function findComposeFiles(ctx: ProjectContext): FileEntry[] {
  return ctx.files.filter((f) => /(^|\/)(docker-compose|compose)\.ya?ml$/i.test(f.relPath));
}

export const containerizationAnalyzer: Analyzer = {
  key: "containerization",
  title: "Containerization",
  analyze(ctx: ProjectContext) {
    const type = ctx.detection.projectType;
    if (!SERVICE_TYPES.includes(type)) {
      return buildCategory("containerization", "universal", [], {
        applicable: false,
        notes: [
          `Containerization not assessed for ${type} projects — a container isn't expected for this project type.`,
        ],
      });
    }

    const findings: Finding[] = [];
    const dockerfiles = findDockerfiles(ctx);
    const composeFiles = findComposeFiles(ctx);

    if (dockerfiles.length === 0 && composeFiles.length === 0) {
      findings.push({
        id: "container.none",
        severity: "medium",
        points: 30,
        message: "No Dockerfile or docker-compose file for a service project.",
        fix: "Add a Dockerfile so the service builds and runs reproducibly across environments (and for parity with production).",
      });
      return buildCategory("containerization", "universal", findings, {
        notes: ["No containerization detected."],
      });
    }

    // Presence is rewarded (no deduction). If there are Dockerfiles but none
    // declares a HEALTHCHECK, flag it — orchestrators rely on it.
    if (dockerfiles.length > 0) {
      const withoutHealthcheck = dockerfiles.filter((f) => {
        const content = ctx.readFile(f.relPath) ?? "";
        return !/^\s*HEALTHCHECK\b/im.test(content);
      });
      if (withoutHealthcheck.length === dockerfiles.length) {
        findings.push({
          id: "container.no-healthcheck",
          severity: "low",
          points: 12,
          message: "Dockerfile is present but defines no HEALTHCHECK instruction.",
          fix: "Add a HEALTHCHECK so orchestrators (Docker/Kubernetes) can detect and restart an unhealthy container.",
          refs: withoutHealthcheck.slice(0, 3).map((f) => f.relPath),
        });
      }
    }

    const notes: string[] = [];
    if (dockerfiles.length) notes.push(`${dockerfiles.length} Dockerfile(s) detected.`);
    if (composeFiles.length) notes.push(`${composeFiles.length} compose file(s) detected.`);
    return buildCategory("containerization", "universal", findings, { notes });
  },
};
