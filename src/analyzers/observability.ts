import type { Analyzer, Finding, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";
import { sourceFiles, countMatches } from "./util.js";

const STRUCTURED_LOGGERS = [
  "winston", "pino", "bunyan", "structlog", "loguru", "zap", "logrus", "zerolog",
  "slf4j", "log4j", "serilog", "tracing", "opentelemetry", "@opentelemetry",
];

const METRICS_TRACING = [
  "prometheus", "prom-client", "opentelemetry", "@opentelemetry", "jaeger",
  "datadog", "dd-trace", "statsd", "micrometer", "sentry",
];

const BARE_PRINT_RES = [
  /console\.(log|info|debug)\s*\(/g,
  /\bprint\s*\(/g, // python (rough)
  /fmt\.Print(ln|f)?\s*\(/g, // go
  /System\.out\.print/g,
];

/**
 * Observability (universal tier).
 * Rewards structured logging + metrics/tracing deps and health endpoints;
 * penalizes reliance on bare prints in services.
 */
export const observabilityAnalyzer: Analyzer = {
  key: "observability",
  title: "Observability",
  analyze(ctx: ProjectContext) {
    const findings: Finding[] = [];
    const src = sourceFiles(ctx);
    const isService = ["backend", "monorepo"].includes(ctx.detection.projectType);

    if (src.length === 0 || (!isService && ctx.detection.projectType !== "cli")) {
      // Observability matters most for runnable services; for libraries/frontends
      // it's lightly weighted and we avoid over-penalizing.
      if (!isService) {
        return buildCategory("observability", "universal", [], {
          notes: ["Observability lightly assessed for non-service project type."],
        });
      }
    }

    const manifests = ctx.detection.manifests
      .map((m) => ctx.readFile(m) ?? "")
      .join("\n")
      .toLowerCase();

    const hasStructuredLog =
      STRUCTURED_LOGGERS.some((l) => manifests.includes(l)) ||
      src.slice(0, 400).some((f) => {
        const c = ctx.readFile(f.relPath);
        return c ? STRUCTURED_LOGGERS.some((l) => c.toLowerCase().includes(l)) : false;
      });

    const hasMetrics = METRICS_TRACING.some((m) => manifests.includes(m));

    if (isService) {
      if (!hasStructuredLog) {
        // Count bare prints as supporting evidence.
        let bare = 0;
        for (const f of src.slice(0, 400)) {
          const c = ctx.readFile(f.relPath);
          if (c) bare += BARE_PRINT_RES.reduce((s, re) => s + countMatches(c, re), 0);
        }
        findings.push({
          id: "obs.no-structured-log",
          severity: "medium",
          points: 18,
          message:
            bare > 0
              ? `No structured logging library; ${bare} bare print/console call(s) found instead.`
              : "No structured logging library detected.",
          fix: "Adopt a structured logger (JSON logs with levels and context) instead of bare prints.",
        });
      }
      if (!hasMetrics) {
        findings.push({
          id: "obs.no-metrics",
          severity: "low",
          points: 12,
          message: "No metrics/tracing instrumentation (Prometheus, OpenTelemetry, etc.) detected.",
          fix: "Expose metrics and/or distributed traces so the service is observable in production.",
        });
      }
      const hasHealth = src.some((f) => {
        const c = ctx.readFile(f.relPath);
        return c ? /\/health|\/healthz|\/readyz|\/livez|readiness|liveness/i.test(c) : false;
      });
      if (!hasHealth) {
        findings.push({
          id: "obs.no-health",
          severity: "low",
          points: 10,
          message: "No health/readiness endpoint detected.",
          fix: "Add /health (liveness) and /ready (readiness) endpoints for orchestrators and load balancers.",
        });
      }
    } else if (!hasStructuredLog && ctx.detection.projectType === "cli") {
      findings.push({
        id: "obs.cli-logging",
        severity: "low",
        points: 8,
        message: "No leveled/structured logging detected for the CLI.",
        fix: "Add a --verbose/quiet logging strategy with levels rather than scattered prints.",
      });
    }

    return buildCategory("observability", "universal", findings);
  },
};
