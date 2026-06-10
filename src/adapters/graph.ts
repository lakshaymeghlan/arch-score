import type { DeepMetrics, DependencyGraph } from "../core/types.js";

/**
 * Compute coupling metrics from an adjacency map of module -> imported modules.
 * All edges must reference modules present in `nodes`.
 */
export function analyzeGraph(
  language: string,
  nodes: string[],
  adjacency: Map<string, Set<string>>,
): DeepMetrics {
  const edges: Record<string, string[]> = {};
  const fanOut: Record<string, number> = {};
  const fanIn: Record<string, number> = {};
  for (const n of nodes) {
    fanOut[n] = 0;
    fanIn[n] = 0;
  }
  for (const [from, tos] of adjacency) {
    const list = [...tos].filter((t) => t !== from);
    edges[from] = list;
    fanOut[from] = list.length;
    for (const to of list) fanIn[to] = (fanIn[to] ?? 0) + 1;
  }

  const cycles = findCycles(nodes, adjacency);
  const maxDepth = longestPath(nodes, adjacency);

  const graph: DependencyGraph = { nodes, edges };
  return {
    language,
    graph,
    cycles,
    fanIn,
    fanOut,
    maxDepth,
    moduleCount: nodes.length,
  };
}

/**
 * Tarjan's strongly-connected-components algorithm. Any SCC with more than one
 * node (or a self-loop) is reported as a dependency cycle.
 */
export function findCycles(
  nodes: string[],
  adjacency: Map<string, Set<string>>,
): string[][] {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Iterative Tarjan to avoid stack overflow on large graphs.
  for (const start of nodes) {
    if (indices.has(start)) continue;
    const work: Array<{ node: string; iter: Iterator<string> }> = [];
    indices.set(start, index);
    lowlink.set(start, index);
    index++;
    stack.push(start);
    onStack.add(start);
    work.push({ node: start, iter: (adjacency.get(start) ?? new Set()).values() });

    while (work.length > 0) {
      const top = work[work.length - 1];
      const next = top.iter.next();
      if (!next.done) {
        const w = next.value;
        if (!adjacency.has(w)) continue; // edge to unknown node
        if (!indices.has(w)) {
          indices.set(w, index);
          lowlink.set(w, index);
          index++;
          stack.push(w);
          onStack.add(w);
          work.push({ node: w, iter: (adjacency.get(w) ?? new Set()).values() });
        } else if (onStack.has(w)) {
          lowlink.set(top.node, Math.min(lowlink.get(top.node)!, indices.get(w)!));
        }
      } else {
        const v = top.node;
        if (lowlink.get(v) === indices.get(v)) {
          const comp: string[] = [];
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            comp.push(w);
          } while (w !== v);
          const selfLoop = (adjacency.get(v)?.has(v)) ?? false;
          if (comp.length > 1 || selfLoop) sccs.push(comp.reverse());
        }
        work.pop();
        if (work.length > 0) {
          const parent = work[work.length - 1].node;
          lowlink.set(parent, Math.min(lowlink.get(parent)!, lowlink.get(v)!));
        }
      }
    }
  }
  return sccs;
}

/**
 * Longest dependency chain length (node count). Cycle-safe via a per-path
 * visited guard; memoizes acyclic subpaths.
 */
export function longestPath(
  nodes: string[],
  adjacency: Map<string, Set<string>>,
): number {
  const memo = new Map<string, number>();

  function dfs(node: string, path: Set<string>): number {
    if (memo.has(node)) return memo.get(node)!;
    if (path.has(node)) return 0; // back-edge in a cycle
    path.add(node);
    let best = 0;
    for (const next of adjacency.get(node) ?? []) {
      if (!adjacency.has(next)) continue;
      best = Math.max(best, dfs(next, path));
    }
    path.delete(node);
    const depth = best + 1;
    // Only memoize when not inside an active cycle path to stay correct.
    memo.set(node, depth);
    return depth;
  }

  let max = 0;
  for (const n of nodes) max = Math.max(max, dfs(n, new Set()));
  return max;
}
