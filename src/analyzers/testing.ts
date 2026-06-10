import type { Analyzer, Finding, ProjectContext } from "../core/types.js";
import { buildCategory } from "../core/result.js";
import { sourceFiles, isSourceFile } from "./util.js";

const TEST_PATTERNS = [
  /\.test\./i,
  /\.spec\./i,
  /_test\.[a-z]+$/i, // go, python style
  /test_.*\.py$/i,
  /(^|\/)tests?\//i,
  /(^|\/)__tests__\//i,
  /(^|\/)spec\//i,
];

function isTestFile(rel: string): boolean {
  return TEST_PATTERNS.some((re) => re.test(rel));
}

/**
 * Testing Architecture (universal tier).
 * Looks at test presence, test-to-source ratio (banded), organization, and
 * whether integration/e2e layers exist.
 */
export const testingAnalyzer: Analyzer = {
  key: "testing",
  title: "Testing Architecture",
  analyze(ctx: ProjectContext) {
    const findings: Finding[] = [];
    const src = sourceFiles(ctx);
    if (src.length === 0) {
      return buildCategory("testing", "universal", [], {
        applicable: false,
        notes: ["No source files; testing not assessed."],
      });
    }

    const testFiles = ctx.files.filter((f) => isSourceFile(f) && isTestFile(f.relPath));
    const nonTestSrc = src.filter((f) => !isTestFile(f.relPath));

    if (testFiles.length === 0) {
      findings.push({
        id: "test.none",
        severity: "high",
        points: 55,
        message: "No test files detected.",
        fix: "Add a test suite. Start with unit tests for core logic, then an integration layer for IO boundaries.",
      });
      return buildCategory("testing", "universal", findings, {
        notes: ["0 test files found."],
      });
    }

    const ratio = testFiles.length / Math.max(1, nonTestSrc.length);
    // Banded ratio scoring rather than linear.
    if (ratio < 0.1) {
      findings.push({
        id: "test.low-ratio",
        severity: "high",
        points: 30,
        message: `Very low test-to-source ratio (${(ratio * 100).toFixed(0)}%).`,
        fix: "Increase coverage of core logic; aim for a meaningful ratio of test files to source modules.",
      });
    } else if (ratio < 0.25) {
      findings.push({
        id: "test.modest-ratio",
        severity: "medium",
        points: 15,
        message: `Modest test-to-source ratio (${(ratio * 100).toFixed(0)}%).`,
        fix: "Grow the suite around the most critical and most-changed modules.",
      });
    }

    // Integration/e2e layer signal.
    const hasIntegration = ctx.files.some((f) =>
      /(integration|e2e|end-to-end|functional)/i.test(f.relPath),
    );
    if (!hasIntegration && nonTestSrc.length > 30) {
      findings.push({
        id: "test.no-integration",
        severity: "low",
        points: 10,
        message: "No integration/e2e test layer detected in a non-trivial codebase.",
        fix: "Add an integration suite that exercises real IO boundaries (DB, HTTP) alongside fast unit tests.",
      });
    }

    // CI running tests.
    const ciFiles = ctx.files.filter((f) =>
      /(^|\/)\.github\/workflows\/|\.gitlab-ci|azure-pipelines|\.circleci\//i.test(f.relPath),
    );
    if (ciFiles.length === 0) {
      findings.push({
        id: "test.no-ci",
        severity: "low",
        points: 8,
        message: "No CI configuration found to run tests automatically.",
        fix: "Add a CI workflow that runs the test suite on every push/PR.",
      });
    }

    return buildCategory("testing", "universal", findings, {
      notes: [
        `${testFiles.length} test file(s), ratio ${(ratio * 100).toFixed(0)}% of source.`,
      ],
    });
  },
};
