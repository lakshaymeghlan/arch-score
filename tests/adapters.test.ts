import { describe, it, expect } from "vitest";
import { jsTsAdapter, extractSpecifiers } from "../src/adapters/js-ts.js";
import { pythonAdapter, extractPyImports } from "../src/adapters/python.js";
import { goAdapter, extractGoImports } from "../src/adapters/go.js";
import { fakeContext } from "./helpers.js";

describe("js-ts adapter", () => {
  it("extracts import/require/dynamic specifiers", () => {
    const specs = extractSpecifiers(
      `import a from "./a";\nimport "./b.js";\nconst c = require("./c");\nawait import("./d");\nexport * from "./e";\nimport x from "react";`,
    );
    expect(specs).toContain("./a");
    expect(specs).toContain("./b.js");
    expect(specs).toContain("./c");
    expect(specs).toContain("./d");
    expect(specs).toContain("./e");
    expect(specs).toContain("react");
  });

  it("builds an internal import graph and finds a cycle", () => {
    const ctx = fakeContext({
      "src/a.ts": `import { b } from "./b";\nexport const a = 1;`,
      "src/b.ts": `import { a } from "./a";\nexport const b = 2;`,
      "src/index.ts": `import "./a";`,
    });
    const m = jsTsAdapter.analyze(ctx);
    expect(m).not.toBeNull();
    expect(m!.moduleCount).toBe(3);
    expect(m!.cycles.length).toBe(1);
    // External "react"-style imports are not nodes.
    expect(m!.graph.nodes).toContain("src/a.ts");
  });

  it("resolves directory index imports", () => {
    const ctx = fakeContext({
      "src/app.ts": `import { thing } from "./feature";`,
      "src/feature/index.ts": `export const thing = 1;`,
    });
    const m = jsTsAdapter.analyze(ctx)!;
    expect(m.graph.edges["src/app.ts"]).toContain("src/feature/index.ts");
  });
});

describe("python adapter", () => {
  it("extracts absolute and relative imports", () => {
    const imps = extractPyImports(
      `import os\nimport pkg.mod\nfrom .sibling import x\nfrom ..parent.thing import y`,
    );
    expect(imps).toContainEqual({ level: 0, module: "os" });
    expect(imps).toContainEqual({ level: 0, module: "pkg.mod" });
    expect(imps).toContainEqual({ level: 1, module: "sibling" });
    expect(imps).toContainEqual({ level: 2, module: "parent.thing" });
  });

  it("links modules via relative and absolute imports", () => {
    const ctx = fakeContext({
      "app/__init__.py": ``,
      "app/main.py": `from .service import run\nimport app.util`,
      "app/service.py": `from app.util import helper`,
      "app/util.py": `helper = 1`,
    });
    const m = pythonAdapter.analyze(ctx)!;
    expect(m.graph.edges["app/main.py"]).toContain("app/service.py");
    expect(m.graph.edges["app/main.py"]).toContain("app/util.py");
    expect(m.graph.edges["app/service.py"]).toContain("app/util.py");
  });
});

describe("go adapter", () => {
  it("extracts block and single imports", () => {
    const imps = extractGoImports(
      `import (\n  "fmt"\n  "example.com/m/svc"\n)\nimport "example.com/m/db"`,
    );
    expect(imps).toContain("fmt");
    expect(imps).toContain("example.com/m/svc");
    expect(imps).toContain("example.com/m/db");
  });

  it("builds a package-level graph using go.mod module path", () => {
    const ctx = fakeContext({
      "go.mod": `module example.com/m\n\ngo 1.21`,
      "main.go": `package main\nimport "example.com/m/svc"`,
      "svc/svc.go": `package svc\nimport "example.com/m/db"`,
      "db/db.go": `package db`,
    });
    const m = goAdapter.analyze(ctx)!;
    expect(m.graph.edges[""]).toContain("svc"); // root dir imports svc
    expect(m.graph.edges["svc"]).toContain("db");
  });
});
