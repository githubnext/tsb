/**
 * network_stats — Graph/network analysis statistics.
 *
 * Implements:
 *   - **Graph representation** (adjacency list / matrix)
 *   - **Degree centrality**, **betweenness centrality** (exact, BFS-based)
 *   - **Clustering coefficient** (local and global)
 *   - **Shortest paths** (BFS for unweighted, Dijkstra for weighted)
 *   - **Connected components**
 *   - **PageRank** (power iteration)
 *   - **HITS** (hubs and authorities)
 *
 * @module
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** An undirected or directed graph stored as adjacency lists. */
export interface Graph {
  /** Number of nodes. */
  nNodes: number;
  /** Adjacency list: adjacency[i] = [{to, weight}]. */
  adjacency: { to: number; weight: number }[][];
  /** Whether the graph is directed. */
  directed: boolean;
}

/** Create a new empty graph. */
export function createGraph(nNodes: number, directed = false): Graph {
  const adjacency: { to: number; weight: number }[][] = [];
  for (let i = 0; i < nNodes; i++) {
    adjacency.push([]);
  }
  return { nNodes, adjacency, directed };
}

/**
 * Add an edge to the graph.
 *
 * @param g - The graph.
 * @param u - Source node.
 * @param v - Target node.
 * @param weight - Edge weight. Default 1.
 */
export function addEdge(g: Graph, u: number, v: number, weight = 1): void {
  (g.adjacency[u] ?? []).push({ to: v, weight });
  if (!g.directed) {
    (g.adjacency[v] ?? []).push({ to: u, weight });
  }
}

/**
 * Build a graph from an edge list.
 *
 * @param nNodes - Total number of nodes.
 * @param edges - Array of [u, v] or [u, v, weight] tuples.
 * @param directed - Whether edges are directed. Default false.
 * @returns Graph.
 */
export function graphFromEdges(
  nNodes: number,
  edges: [number, number][] | [number, number, number][],
  directed = false,
): Graph {
  const g = createGraph(nNodes, directed);
  for (const e of edges) {
    const u = e[0];
    const v = e[1];
    const w = e[2] ?? 1;
    addEdge(g, u, v, w);
  }
  return g;
}

// ─── Degree Centrality ────────────────────────────────────────────────────────

/**
 * Compute degree centrality for all nodes.
 *
 * Degree centrality = degree / (n - 1).
 *
 * @param g - The graph.
 * @returns Array of centrality values (one per node).
 */
export function degreeCentrality(g: Graph): number[] {
  const n = g.nNodes;
  const norm = n > 1 ? n - 1 : 1;
  return g.adjacency.map((adj) => adj.length / norm);
}

/**
 * Compute in-degree and out-degree for directed graphs.
 *
 * @param g - The graph.
 * @returns Object with inDegree and outDegree arrays.
 */
export function directedDegrees(g: Graph): { inDegree: number[]; outDegree: number[] } {
  const inDegree = new Array<number>(g.nNodes).fill(0);
  const outDegree = g.adjacency.map((adj) => adj.length);

  for (let u = 0; u < g.nNodes; u++) {
    for (const { to } of g.adjacency[u] ?? []) {
      inDegree[to] = (inDegree[to] ?? 0) + 1;
    }
  }

  return { inDegree, outDegree };
}

// ─── Shortest Paths ───────────────────────────────────────────────────────────

/**
 * BFS single-source shortest paths (unweighted).
 *
 * @param g - The graph.
 * @param source - Source node.
 * @returns Array of distances from source (-1 if unreachable).
 */
export function bfsDistances(g: Graph, source: number): number[] {
  const dist = new Array<number>(g.nNodes).fill(-1);
  dist[source] = 0;
  const queue: number[] = [source];
  let head = 0;

  while (head < queue.length) {
    const u = queue[head++] ?? 0;
    for (const { to } of g.adjacency[u] ?? []) {
      if ((dist[to] ?? -1) === -1) {
        dist[to] = (dist[u] ?? 0) + 1;
        queue.push(to);
      }
    }
  }

  return dist;
}

/**
 * Dijkstra single-source shortest paths (weighted, non-negative weights).
 *
 * @param g - The graph.
 * @param source - Source node.
 * @returns Array of shortest-path distances from source (Infinity if unreachable).
 */
export function dijkstra(g: Graph, source: number): number[] {
  const dist = new Array<number>(g.nNodes).fill(Infinity);
  dist[source] = 0;
  // Simple priority queue via sorted array (sufficient for small graphs)
  const pq: { node: number; d: number }[] = [{ node: source, d: 0 }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const top = pq.shift();
    if (top === undefined) break;
    const { node: u, d } = top;
    if (d > (dist[u] ?? Infinity)) continue;

    for (const { to, weight } of g.adjacency[u] ?? []) {
      const nd = (dist[u] ?? Infinity) + weight;
      if (nd < (dist[to] ?? Infinity)) {
        dist[to] = nd;
        pq.push({ node: to, d: nd });
      }
    }
  }

  return dist;
}

// ─── Betweenness Centrality ───────────────────────────────────────────────────

/**
 * Compute betweenness centrality (Brandes algorithm for unweighted graphs).
 *
 * @param g - The graph.
 * @returns Array of betweenness centrality values (normalized).
 */
export function betweennessCentrality(g: Graph): number[] {
  const n = g.nNodes;
  const bc = new Array<number>(n).fill(0);

  for (let s = 0; s < n; s++) {
    const stack: number[] = [];
    const pred: number[][] = Array.from({ length: n }, () => []);
    const sigma = new Array<number>(n).fill(0);
    sigma[s] = 1;
    const dist = new Array<number>(n).fill(-1);
    dist[s] = 0;
    const queue: number[] = [s];
    let head = 0;

    while (head < queue.length) {
      const v = queue[head++] ?? 0;
      stack.push(v);

      for (const { to: w } of g.adjacency[v] ?? []) {
        if ((dist[w] ?? -1) < 0) {
          queue.push(w);
          dist[w] = (dist[v] ?? 0) + 1;
        }
        if ((dist[w] ?? 0) === (dist[v] ?? 0) + 1) {
          sigma[w] = (sigma[w] ?? 0) + (sigma[v] ?? 0);
          (pred[w] ?? []).push(v);
        }
      }
    }

    const delta = new Array<number>(n).fill(0);
    while (stack.length > 0) {
      const w = stack.pop() ?? 0;
      for (const v of pred[w] ?? []) {
        delta[v] =
          (delta[v] ?? 0) +
          ((sigma[v] ?? 0) / (sigma[w] ?? 1)) * (1 + (delta[w] ?? 0));
      }
      if (w !== s) bc[w] = (bc[w] ?? 0) + (delta[w] ?? 0);
    }
  }

  // Normalize
  const norm = g.directed ? (n - 1) * (n - 2) : ((n - 1) * (n - 2)) / 2;
  if (norm > 0) {
    for (let i = 0; i < n; i++) {
      bc[i] = (bc[i] ?? 0) / norm;
    }
  }

  return bc;
}

// ─── Clustering Coefficient ───────────────────────────────────────────────────

/**
 * Compute local clustering coefficient for each node (undirected).
 *
 * @param g - The graph (undirected).
 * @returns Array of clustering coefficients.
 */
export function clusteringCoefficient(g: Graph): number[] {
  const n = g.nNodes;
  const cc = new Array<number>(n).fill(0);

  for (let u = 0; u < n; u++) {
    const neighbors = new Set((g.adjacency[u] ?? []).map((e) => e.to));
    const k = neighbors.size;
    if (k < 2) {
      cc[u] = 0;
      continue;
    }

    let triangles = 0;
    for (const v of neighbors) {
      for (const { to: w } of g.adjacency[v] ?? []) {
        if (neighbors.has(w)) triangles++;
      }
    }

    cc[u] = triangles / (k * (k - 1));
  }

  return cc;
}

/**
 * Compute the global (average) clustering coefficient.
 *
 * @param g - The graph.
 * @returns Global clustering coefficient.
 */
export function globalClusteringCoefficient(g: Graph): number {
  const cc = clusteringCoefficient(g);
  return cc.reduce((a, b) => a + b, 0) / cc.length;
}

// ─── Connected Components ─────────────────────────────────────────────────────

/**
 * Find all connected components (undirected graph).
 *
 * @param g - The graph.
 * @returns Array of components, each an array of node indices.
 */
export function connectedComponents(g: Graph): number[][] {
  const visited = new Array<boolean>(g.nNodes).fill(false);
  const components: number[][] = [];

  for (let start = 0; start < g.nNodes; start++) {
    if (visited[start] ?? false) continue;

    const component: number[] = [];
    const queue: number[] = [start];
    visited[start] = true;

    while (queue.length > 0) {
      const u = queue.shift() ?? 0;
      component.push(u);
      for (const { to } of g.adjacency[u] ?? []) {
        if (!(visited[to] ?? false)) {
          visited[to] = true;
          queue.push(to);
        }
      }
    }

    components.push(component);
  }

  return components;
}

// ─── PageRank ─────────────────────────────────────────────────────────────────

/**
 * Compute PageRank via power iteration.
 *
 * @param g - The graph (directed).
 * @param dampingFactor - Damping factor (alpha). Default 0.85.
 * @param maxIter - Maximum iterations. Default 100.
 * @param tol - Convergence tolerance. Default 1e-6.
 * @returns PageRank scores (sum to 1).
 *
 * @example
 * ```ts
 * import { graphFromEdges, pageRank } from "tsb";
 * const g = graphFromEdges(4, [[0,1],[0,2],[1,3],[2,3]], true);
 * const pr = pageRank(g);
 * ```
 */
export function pageRank(
  g: Graph,
  dampingFactor = 0.85,
  maxIter = 100,
  tol = 1e-6,
): number[] {
  const n = g.nNodes;
  let rank = new Array<number>(n).fill(1 / n);
  const outDeg = g.adjacency.map((adj) => adj.length);

  for (let iter = 0; iter < maxIter; iter++) {
    const newRank = new Array<number>(n).fill((1 - dampingFactor) / n);

    for (let u = 0; u < n; u++) {
      const deg = outDeg[u] ?? 0;
      if (deg === 0) {
        // Dangling node — distribute rank equally
        const share = (rank[u] ?? 0) / n;
        for (let v = 0; v < n; v++) {
          newRank[v] = (newRank[v] ?? 0) + dampingFactor * share;
        }
      } else {
        for (const { to: v } of g.adjacency[u] ?? []) {
          newRank[v] = (newRank[v] ?? 0) + dampingFactor * ((rank[u] ?? 0) / deg);
        }
      }
    }

    let diff = 0;
    for (let i = 0; i < n; i++) {
      diff += Math.abs((newRank[i] ?? 0) - (rank[i] ?? 0));
    }
    rank = newRank;
    if (diff < tol) break;
  }

  return rank;
}

// ─── HITS ─────────────────────────────────────────────────────────────────────

/**
 * Compute HITS (Hubs and Authorities) scores via power iteration.
 *
 * @param g - The graph (directed).
 * @param maxIter - Maximum iterations. Default 100.
 * @param tol - Convergence tolerance. Default 1e-6.
 * @returns Object with hub and authority score arrays.
 */
export function hits(
  g: Graph,
  maxIter = 100,
  tol = 1e-6,
): { hub: number[]; authority: number[] } {
  const n = g.nNodes;
  let hub = new Array<number>(n).fill(1 / n);
  let auth = new Array<number>(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    const newAuth = new Array<number>(n).fill(0);
    const newHub = new Array<number>(n).fill(0);

    for (let u = 0; u < n; u++) {
      for (const { to: v } of g.adjacency[u] ?? []) {
        newAuth[v] = (newAuth[v] ?? 0) + (hub[u] ?? 0);
      }
    }
    for (let u = 0; u < n; u++) {
      for (const { to: v } of g.adjacency[u] ?? []) {
        newHub[u] = (newHub[u] ?? 0) + (auth[v] ?? 0);
      }
    }

    // Normalize
    const authNorm = Math.sqrt(newAuth.reduce((s, x) => s + x * x, 0)) || 1;
    const hubNorm = Math.sqrt(newHub.reduce((s, x) => s + x * x, 0)) || 1;
    for (let i = 0; i < n; i++) {
      newAuth[i] = (newAuth[i] ?? 0) / authNorm;
      newHub[i] = (newHub[i] ?? 0) / hubNorm;
    }

    let diff = 0;
    for (let i = 0; i < n; i++) {
      diff +=
        Math.abs((newAuth[i] ?? 0) - (auth[i] ?? 0)) +
        Math.abs((newHub[i] ?? 0) - (hub[i] ?? 0));
    }
    auth = newAuth;
    hub = newHub;
    if (diff < tol) break;
  }

  return { hub, authority: auth };
}
