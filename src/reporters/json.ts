import type { ScoreReport } from "../core/types.js";

/**
 * Serialize the report as JSON. The dependency graph can be large, so it is
 * omitted by default and summarized instead; pass includeGraph to keep it.
 */
export function renderJson(report: ScoreReport, includeGraph = false): string {
  const clone: ScoreReport = { ...report };
  if (report.deep && !includeGraph) {
    clone.deep = {
      ...report.deep,
      graph: { nodes: report.deep.graph.nodes, edges: {} },
    };
  }
  return JSON.stringify(clone, null, 2);
}
