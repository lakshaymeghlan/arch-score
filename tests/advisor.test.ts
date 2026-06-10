import { describe, it, expect } from "vitest";
import { classifyStructure } from "../src/advisor/classify.js";
import { adviseFolders } from "../src/advisor/recommend.js";
import { fakeContext } from "./helpers.js";

describe("structure classification", () => {
  it("classifies a hexagonal layout", () => {
    const ctx = fakeContext({
      "src/domain/user.ts": "export {}",
      "src/application/createUser.ts": "export {}",
      "src/infrastructure/db.ts": "export {}",
      "src/interfaces/http/route.ts": "export {}",
    });
    expect(classifyStructure(ctx)).toBe("hexagonal");
  });

  it("classifies a layered layout", () => {
    const ctx = fakeContext({
      "src/controllers/a.ts": "export {}",
      "src/services/b.ts": "export {}",
      "src/repositories/c.ts": "export {}",
    });
    expect(classifyStructure(ctx)).toBe("layered");
  });

  it("classifies a flat layout", () => {
    const ctx = fakeContext({
      "a.ts": "export {}",
      "b.ts": "export {}",
      "c.ts": "export {}",
    });
    expect(classifyStructure(ctx)).toBe("flat");
  });
});

describe("folder advice", () => {
  it("recommends feature structure for a frontend project", () => {
    const ctx = fakeContext(
      { "src/App.tsx": "export {}" },
      { projectType: "frontend" },
    );
    const advice = adviseFolders(ctx);
    expect(advice.recommended).toBe("feature");
    expect(advice.proposedTree).toContain("features/");
  });

  it("recommends hexagonal for a backend project and lists gaps", () => {
    const ctx = fakeContext(
      { "src/index.ts": "export {}" },
      { projectType: "backend" },
    );
    const advice = adviseFolders(ctx);
    expect(advice.recommended).toBe("hexagonal");
    expect(advice.gaps.length).toBeGreaterThan(0);
  });
});
