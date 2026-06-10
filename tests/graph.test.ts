import { describe, it, expect } from "vitest";
import { analyzeGraph, findCycles, longestPath } from "../src/adapters/graph.js";

function adj(map: Record<string, string[]>): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const [k, v] of Object.entries(map)) m.set(k, new Set(v));
  return m;
}

describe("graph analysis", () => {
  it("detects a simple 2-node cycle", () => {
    const nodes = ["a", "b"];
    const cycles = findCycles(nodes, adj({ a: ["b"], b: ["a"] }));
    expect(cycles).toHaveLength(1);
    expect(cycles[0].sort()).toEqual(["a", "b"]);
  });

  it("detects a 3-node cycle and ignores acyclic edges", () => {
    const nodes = ["a", "b", "c", "d"];
    const cycles = findCycles(nodes, adj({ a: ["b"], b: ["c"], c: ["a"], d: ["a"] }));
    expect(cycles).toHaveLength(1);
    expect(cycles[0].sort()).toEqual(["a", "b", "c"]);
  });

  it("reports no cycles for a DAG", () => {
    const nodes = ["a", "b", "c"];
    expect(findCycles(nodes, adj({ a: ["b", "c"], b: ["c"], c: [] }))).toHaveLength(0);
  });

  it("computes fan-in and fan-out", () => {
    const m = analyzeGraph("test", ["a", "b", "c"], adj({ a: ["b", "c"], b: ["c"], c: [] }));
    expect(m.fanOut.a).toBe(2);
    expect(m.fanOut.b).toBe(1);
    expect(m.fanIn.c).toBe(2);
    expect(m.fanIn.a).toBe(0);
  });

  it("computes longest path and stays finite on cycles", () => {
    expect(longestPath(["a", "b", "c"], adj({ a: ["b"], b: ["c"], c: [] }))).toBe(3);
    // A cycle must not loop forever.
    const d = longestPath(["a", "b"], adj({ a: ["b"], b: ["a"] }));
    expect(Number.isFinite(d)).toBe(true);
  });
});
