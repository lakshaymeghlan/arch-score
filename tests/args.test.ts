import { describe, it, expect } from "vitest";
import { parseArgs } from "../src/cli/args.js";

describe("CLI argument parsing", () => {
  it("defaults sensibly", () => {
    const o = parseArgs([]);
    expect(o.path).toBe(".");
    expect(o.threshold).toBe(70);
    expect(o.skillFormat).toBe("agents");
    expect(o.json).toBe(false);
  });

  it("parses a positional path and flags", () => {
    const o = parseArgs(["./svc", "--ci", "--threshold", "85", "--json"]);
    expect(o.path).toBe("./svc");
    expect(o.ci).toBe(true);
    expect(o.threshold).toBe(85);
    expect(o.json).toBe(true);
  });

  it("supports --flag=value form", () => {
    const o = parseArgs(["--emit-md=docs/SD.md", "--html=out.html"]);
    expect(o.emitMd).toBe("docs/SD.md");
    expect(o.html).toBe("out.html");
  });

  it("uses default output paths for bare emit flags", () => {
    const o = parseArgs(["--emit-md", "--html"]);
    expect(o.emitMd).toBe("SYSTEM_DESIGN.md");
    expect(o.html).toBe("archscore-report.html");
  });

  it("validates --format", () => {
    expect(() => parseArgs(["--format", "bogus"])).toThrow();
    expect(parseArgs(["--format", "cursor"]).skillFormat).toBe("cursor");
  });

  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--nope"])).toThrow();
  });

  it("parses badge and comment flags with defaults", () => {
    const o = parseArgs(["--emit-badge", "--emit-badge-json", "--emit-comment"]);
    expect(o.emitBadge).toBe("arch-score-badge.svg");
    expect(o.emitBadgeJson).toBe("arch-score-badge.json");
    expect(o.emitComment).toBe("arch-score-comment.md");
  });

  it("parses badge/comment flags with explicit paths", () => {
    const o = parseArgs([
      "--emit-badge=out/b.svg",
      "--emit-comment=out/c.md",
    ]);
    expect(o.emitBadge).toBe("out/b.svg");
    expect(o.emitComment).toBe("out/c.md");
    expect(o.emitBadgeJson).toBe(null);
  });
});
