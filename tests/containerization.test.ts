import { describe, it, expect } from "vitest";
import { containerizationAnalyzer } from "../src/analyzers/containerization.js";
import { fakeContext } from "./helpers.js";

describe("containerization analyzer", () => {
  it("rewards a service with a Dockerfile that has a HEALTHCHECK", () => {
    const ctx = fakeContext(
      {
        "src/server.ts": "export const s = 1;",
        Dockerfile: "FROM node:20\nHEALTHCHECK CMD curl -f http://localhost/health || exit 1\nCMD node server.js",
      },
      { projectType: "backend" },
    );
    const r = containerizationAnalyzer.analyze(ctx);
    expect(r.applicable).toBe(true);
    expect(r.score).toBe(100);
    expect(r.findings).toHaveLength(0);
  });

  it("flags a service that has a Dockerfile but no HEALTHCHECK", () => {
    const ctx = fakeContext(
      {
        "src/server.ts": "export const s = 1;",
        Dockerfile: "FROM node:20\nCMD node server.js",
      },
      { projectType: "backend" },
    );
    const r = containerizationAnalyzer.analyze(ctx);
    expect(r.applicable).toBe(true);
    expect(r.findings.some((f) => f.id === "container.no-healthcheck")).toBe(true);
    expect(r.score).toBeLessThan(100);
  });

  it("penalizes a service with no Dockerfile or compose file", () => {
    const ctx = fakeContext(
      { "src/server.ts": "export const s = 1;" },
      { projectType: "backend" },
    );
    const r = containerizationAnalyzer.analyze(ctx);
    expect(r.applicable).toBe(true);
    expect(r.findings.some((f) => f.id === "container.none")).toBe(true);
  });

  it("accepts a compose file alone as containerization", () => {
    const ctx = fakeContext(
      {
        "src/server.ts": "export const s = 1;",
        "docker-compose.yml": "services:\n  app:\n    image: myapp",
      },
      { projectType: "backend" },
    );
    const r = containerizationAnalyzer.analyze(ctx);
    expect(r.findings.some((f) => f.id === "container.none")).toBe(false);
  });

  it("does NOT penalize a CLI project for having no Dockerfile (re-weighted out)", () => {
    const ctx = fakeContext(
      { "src/cli.ts": "export const c = 1;" },
      { projectType: "cli" },
    );
    const r = containerizationAnalyzer.analyze(ctx);
    expect(r.applicable).toBe(false);
    expect(r.findings).toHaveLength(0);
  });

  it("does NOT penalize a library project for having no Dockerfile", () => {
    const ctx = fakeContext(
      { "src/index.ts": "export const x = 1;" },
      { projectType: "library" },
    );
    const r = containerizationAnalyzer.analyze(ctx);
    expect(r.applicable).toBe(false);
  });
});
