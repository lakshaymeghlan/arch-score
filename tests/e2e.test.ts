import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { analyzeProject } from "../src/core/analyze.js";

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "archscore-e2e-"));
  // A small TS backend fixture with a circular dependency and no tests.
  fs.mkdirSync(path.join(dir, "src/domain"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src/application"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "fixture", dependencies: { express: "^4" } }),
  );
  fs.writeFileSync(
    path.join(dir, "src/domain/user.ts"),
    `import { createUser } from "../application/createUser";\nexport const User = 1;`,
  );
  fs.writeFileSync(
    path.join(dir, "src/application/createUser.ts"),
    `import { User } from "../domain/user";\nexport const createUser = () => User;`,
  );
  fs.writeFileSync(path.join(dir, "src/index.ts"), `import "./domain/user";`);
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("end-to-end analysis", () => {
  it("produces a complete, well-formed report", () => {
    const report = analyzeProject(dir, { now: "2026-06-10T00:00:00.000Z" });
    expect(report.overall).toBeGreaterThanOrEqual(0);
    expect(report.overall).toBeLessThanOrEqual(100);
    expect(report.categories).toHaveLength(9);
    expect(report.detection.primaryLanguage).toBe("TypeScript");
    expect(["backend", "library", "cli", "unknown"]).toContain(report.detection.projectType);
  });

  it("runs the deep tier and detects the circular dependency", () => {
    const report = analyzeProject(dir, { now: "2026-06-10T00:00:00.000Z" });
    expect(report.tierUsed).toBe("deep");
    expect(report.deep!.cycles.length).toBeGreaterThanOrEqual(1);
    const mod = report.categories.find((c) => c.key === "modularity")!;
    expect(mod.findings.some((f) => f.id === "mod.cycles")).toBe(true);
  });

  it("penalizes the missing test suite", () => {
    const report = analyzeProject(dir, { now: "2026-06-10T00:00:00.000Z" });
    const testing = report.categories.find((c) => c.key === "testing")!;
    expect(testing.score).toBeLessThan(60);
  });

  it("degrades to universal tier when deep is disabled", () => {
    const report = analyzeProject(dir, { noDeep: true });
    expect(report.tierUsed).toBe("universal");
    expect(report.deep).toBeNull();
  });
});
