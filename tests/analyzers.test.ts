import { describe, it, expect } from "vitest";
import { testingAnalyzer } from "../src/analyzers/testing.js";
import { securityAnalyzer } from "../src/analyzers/security.js";
import { configAnalyzer } from "../src/analyzers/config.js";
import { documentationAnalyzer } from "../src/analyzers/documentation.js";
import { fakeContext } from "./helpers.js";

describe("testing analyzer", () => {
  it("flags a project with no tests", () => {
    const ctx = fakeContext({ "src/a.ts": "export const a = 1;" });
    const r = testingAnalyzer.analyze(ctx);
    expect(r.score).toBeLessThan(50);
    expect(r.findings.some((f) => f.id === "test.none")).toBe(true);
  });

  it("rewards a project with a healthy test ratio", () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 4; i++) files[`src/m${i}.ts`] = "export const x = 1;";
    for (let i = 0; i < 3; i++) files[`src/m${i}.test.ts`] = "test('x', () => {});";
    const ctx = fakeContext(files);
    const r = testingAnalyzer.analyze(ctx);
    expect(r.findings.some((f) => f.id === "test.none")).toBe(false);
  });
});

describe("security analyzer", () => {
  it("detects a hardcoded AWS key", () => {
    // Build the key from parts so this test file's own source doesn't contain
    // a matchable token (keeps arch-score's self-scan clean).
    const realKey = "AKIA" + "Z4XB7CD9EFGH1234";
    const ctx = fakeContext({
      "src/config.ts": `const key = "${realKey}";`,
    });
    const r = securityAnalyzer.analyze(ctx);
    expect(r.findings.some((f) => f.id === "sec.secret")).toBe(true);
  });

  it("ignores AWS documented example keys (…EXAMPLE)", () => {
    const ctx = fakeContext({
      "src/config.ts": `const key = "AKIAIOSFODNN7EXAMPLE";`,
    });
    const r = securityAnalyzer.analyze(ctx);
    expect(r.findings.some((f) => f.id === "sec.secret")).toBe(false);
  });

  it("ignores env-var references (not hardcoded)", () => {
    const ctx = fakeContext({
      "src/config.ts": `const apiKey = process.env.API_KEY;`,
    });
    const r = securityAnalyzer.analyze(ctx);
    expect(r.findings.some((f) => f.id === "sec.secret")).toBe(false);
  });
});

describe("config analyzer", () => {
  it("flags a committed .env file", () => {
    const ctx = fakeContext({
      ".env": "SECRET=abc123def456",
      "src/a.ts": "export const a = 1;",
    });
    const r = configAnalyzer.analyze(ctx);
    expect(r.findings.some((f) => f.id === "config.committed-env")).toBe(true);
  });
});

describe("documentation analyzer", () => {
  it("flags missing README", () => {
    const ctx = fakeContext({ "src/a.ts": "export const a = 1;" });
    const r = documentationAnalyzer.analyze(ctx);
    expect(r.findings.some((f) => f.id === "doc.no-readme")).toBe(true);
  });

  it("accepts a substantial README", () => {
    const ctx = fakeContext({
      "README.md": `# Title\n\n## Setup\n\n${"word ".repeat(100)}\n\n## Usage\n\nmore`,
      "src/a.ts": "export const a = 1;",
    });
    const r = documentationAnalyzer.analyze(ctx);
    expect(r.findings.some((f) => f.id === "doc.no-readme")).toBe(false);
    expect(r.findings.some((f) => f.id === "doc.thin-readme")).toBe(false);
  });
});
