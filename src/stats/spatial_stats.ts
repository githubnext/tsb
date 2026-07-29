/**
 * spatial_stats — Spatial statistics and geostatistics.
 *
 * Implements:
 *   - **Variogram** estimation (empirical) and theoretical models (spherical, exponential, Gaussian)
 *   - **Ordinary Kriging** interpolation
 *   - **Moran's I** spatial autocorrelation
 *   - **Ripley's K function** and L function
 *   - **Kernel density estimation** (2D)
 *   - **Spatial weights** (distance-based, k-nearest-neighbor)
 *
 * @module
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A 2D point with optional value. */
export interface SpatialPoint {
  x: number;
  y: number;
  value?: number;
}

// ─── Distance Utilities ───────────────────────────────────────────────────────

/**
 * Euclidean distance between two points.
 */
export function euclideanDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * Compute pairwise distance matrix.
 *
 * @param points - Array of spatial points.
 * @returns n×n distance matrix (flat row-major array).
 */
export function pairwiseDistances(points: { x: number; y: number }[]): number[] {
  const n = points.length;
  const D = new Array<number>(n * n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = euclideanDistance(points[i] ?? { x: 0, y: 0 }, points[j] ?? { x: 0, y: 0 });
      D[i * n + j] = d;
      D[j * n + i] = d;
    }
  }

  return D;
}

// ─── Variogram ────────────────────────────────────────────────────────────────

/** A lag-semivariance pair for variogram estimation. */
export interface VariogramPoint {
  lag: number;
  semivariance: number;
  count: number;
}

/**
 * Compute the empirical (experimental) variogram.
 *
 * @param points - Spatial points with values.
 * @param nLags - Number of lag bins. Default 10.
 * @param maxLag - Maximum lag distance (auto if undefined).
 * @returns Array of variogram points.
 *
 * @example
 * ```ts
 * import { empiricalVariogram } from "tsb";
 * const pts = [{ x:0, y:0, value:1 }, { x:1, y:0, value:2 }, { x:2, y:0, value:1.5 }];
 * const vgram = empiricalVariogram(pts, 5);
 * ```
 */
export function empiricalVariogram(
  points: SpatialPoint[],
  nLags = 10,
  maxLag?: number,
): VariogramPoint[] {
  const n = points.length;
  const D = pairwiseDistances(points);

  let maxD = maxLag ?? 0;
  if (maxLag === undefined) {
    for (let i = 0; i < n * n; i++) {
      if ((D[i] ?? 0) > maxD) maxD = D[i] ?? 0;
    }
    maxD *= 0.5; // Rule of thumb: use half the max distance
  }

  const lagSize = maxD / nLags;
  const sumSq = new Array<number>(nLags).fill(0);
  const counts = new Array<number>(nLags).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = D[i * n + j] ?? 0;
      if (d > maxD || d === 0) continue;

      const bin = Math.min(Math.floor(d / lagSize), nLags - 1);
      const dv = ((points[i]?.value ?? 0) - (points[j]?.value ?? 0)) ** 2;
      sumSq[bin] = (sumSq[bin] ?? 0) + dv;
      counts[bin] = (counts[bin] ?? 0) + 1;
    }
  }

  return Array.from({ length: nLags }, (_, k) => ({
    lag: (k + 0.5) * lagSize,
    semivariance: (counts[k] ?? 0) > 0 ? (sumSq[k] ?? 0) / (2 * (counts[k] ?? 1)) : 0,
    count: counts[k] ?? 0,
  }));
}

/** Parameters for theoretical variogram models. */
export interface VariogramModelParams {
  /** Nugget (c0). Default 0. */
  nugget?: number;
  /** Sill (c). */
  sill: number;
  /** Range (a). */
  range: number;
}

/**
 * Spherical variogram model γ(h).
 */
export function sphericalVariogram(h: number, params: VariogramModelParams): number {
  const c0 = params.nugget ?? 0;
  const c = params.sill;
  const a = params.range;
  if (h === 0) return 0;
  if (h >= a) return c0 + c;
  return c0 + c * (1.5 * (h / a) - 0.5 * (h / a) ** 3);
}

/**
 * Exponential variogram model γ(h).
 */
export function exponentialVariogram(h: number, params: VariogramModelParams): number {
  const c0 = params.nugget ?? 0;
  const c = params.sill;
  const a = params.range;
  if (h === 0) return 0;
  return c0 + c * (1 - Math.exp(-h / a));
}

/**
 * Gaussian variogram model γ(h).
 */
export function gaussianVariogram(h: number, params: VariogramModelParams): number {
  const c0 = params.nugget ?? 0;
  const c = params.sill;
  const a = params.range;
  if (h === 0) return 0;
  return c0 + c * (1 - Math.exp(-((h / a) ** 2)));
}

// ─── Ordinary Kriging ─────────────────────────────────────────────────────────

type VariogramFn = (h: number, params: VariogramModelParams) => number;

/**
 * Ordinary Kriging interpolation at unsampled locations.
 *
 * @param knownPoints - Known data points with values.
 * @param queryPoints - Locations to interpolate.
 * @param variogramFn - Variogram model function.
 * @param vParams - Variogram model parameters.
 * @returns Interpolated values at query points.
 *
 * @example
 * ```ts
 * import { ordinaryKriging, sphericalVariogram } from "tsb";
 * const known = [{ x:0, y:0, value:1 }, { x:1, y:1, value:2 }];
 * const query = [{ x:0.5, y:0.5 }];
 * const pred = ordinaryKriging(known, query, sphericalVariogram, { sill:1, range:2 });
 * ```
 */
export function ordinaryKriging(
  knownPoints: SpatialPoint[],
  queryPoints: { x: number; y: number }[],
  variogramFn: VariogramFn,
  vParams: VariogramModelParams,
): number[] {
  const n = knownPoints.length;
  // Build kriging matrix (n+1) x (n+1) with Lagrange multiplier
  const size = n + 1;
  const K = new Array<number>(size * size).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const d = euclideanDistance(knownPoints[i] ?? { x: 0, y: 0 }, knownPoints[j] ?? { x: 0, y: 0 });
      K[i * size + j] = variogramFn(d, vParams);
    }
    K[i * size + n] = 1;
    K[n * size + i] = 1;
  }
  K[n * size + n] = 0;

  const results: number[] = [];

  for (const q of queryPoints) {
    const k = new Array<number>(size).fill(0);
    for (let i = 0; i < n; i++) {
      const d = euclideanDistance(q, knownPoints[i] ?? { x: 0, y: 0 });
      k[i] = variogramFn(d, vParams);
    }
    k[n] = 1;

    // Solve K * w = k via Gaussian elimination
    const w = solveLinearSystem(K, k, size);
    let pred = 0;
    for (let i = 0; i < n; i++) {
      pred += (w[i] ?? 0) * (knownPoints[i]?.value ?? 0);
    }
    results.push(pred);
  }

  return results;
}

// ─── Moran's I ────────────────────────────────────────────────────────────────

/**
 * Compute Moran's I spatial autocorrelation statistic.
 *
 * @param values - Observed values at each location.
 * @param weights - n×n spatial weight matrix (flat row-major).
 * @returns Moran's I statistic.
 *
 * @example
 * ```ts
 * import { moransI } from "tsb";
 * const vals = [1, 2, 3, 4];
 * const W = [0,1,0,0, 1,0,1,0, 0,1,0,1, 0,0,1,0];
 * const I = moransI(vals, W);
 * ```
 */
export function moransI(values: number[], weights: number[]): number {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const deviations = values.map((v) => v - mean);

  let numerator = 0;
  let W = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const wij = weights[i * n + j] ?? 0;
      W += wij;
      numerator += wij * (deviations[i] ?? 0) * (deviations[j] ?? 0);
    }
  }

  const denominator = deviations.reduce((s, d) => s + d * d, 0);

  if (denominator === 0 || W === 0) return 0;
  return (n / W) * (numerator / denominator);
}

// ─── Ripley's K Function ──────────────────────────────────────────────────────

/**
 * Estimate Ripley's K function for a point pattern.
 *
 * @param points - Array of 2D points.
 * @param distances - Array of distances at which to evaluate K.
 * @param area - Area of the study region.
 * @returns K(d) values.
 */
export function ripleysK(
  points: { x: number; y: number }[],
  distances: number[],
  area: number,
): number[] {
  const n = points.length;
  const lambda = n / area;
  const D = pairwiseDistances(points);

  return distances.map((r) => {
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && (D[i * n + j] ?? Infinity) <= r) count++;
      }
    }
    return count / (n * lambda);
  });
}

/**
 * Compute Ripley's L function: L(r) = sqrt(K(r) / pi).
 *
 * @param K - K function values.
 * @returns L function values.
 */
export function ripleysL(K: number[]): number[] {
  return K.map((k) => Math.sqrt(k / Math.PI));
}

// ─── 2D Kernel Density Estimation ─────────────────────────────────────────────

/**
 * Compute 2D kernel density estimate on a grid.
 *
 * @param points - Data points.
 * @param xGrid - x-grid values.
 * @param yGrid - y-grid values.
 * @param bandwidth - Bandwidth (h). Default 1.
 * @returns Density values on the grid (flat row-major, len = xGrid.length × yGrid.length).
 */
export function kde2d(
  points: { x: number; y: number }[],
  xGrid: number[],
  yGrid: number[],
  bandwidth = 1,
): number[] {
  const nx = xGrid.length;
  const ny = yGrid.length;
  const n = points.length;
  const density = new Array<number>(nx * ny).fill(0);
  const h2 = bandwidth * bandwidth * 2;

  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      let sum = 0;
      const xi = xGrid[i] ?? 0;
      const yj = yGrid[j] ?? 0;
      for (const p of points) {
        const d2 = (p.x - xi) ** 2 + (p.y - yj) ** 2;
        sum += Math.exp(-d2 / h2);
      }
      density[i * ny + j] = sum / (n * Math.PI * h2);
    }
  }

  return density;
}

// ─── Spatial Weights ──────────────────────────────────────────────────────────

/**
 * Build a distance-based spatial weight matrix (inverse distance weighting).
 *
 * @param points - Spatial points.
 * @param maxDist - Maximum distance for neighbors (Infinity = all pairs).
 * @param power - Distance decay power. Default 1.
 * @returns Row-standardized weight matrix (flat row-major).
 */
export function distanceWeights(
  points: { x: number; y: number }[],
  maxDist = Infinity,
  power = 1,
): number[] {
  const n = points.length;
  const D = pairwiseDistances(points);
  const W = new Array<number>(n * n).fill(0);

  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = D[i * n + j] ?? Infinity;
      if (d <= maxDist && d > 0) {
        W[i * n + j] = 1 / d ** power;
        rowSum += W[i * n + j] ?? 0;
      }
    }
    if (rowSum > 0) {
      for (let j = 0; j < n; j++) {
        W[i * n + j] = (W[i * n + j] ?? 0) / rowSum;
      }
    }
  }

  return W;
}

// ─── Linear System Solver (Gaussian Elimination) ─────────────────────────────

function solveLinearSystem(A: number[], b: number[], n: number): number[] {
  // Augmented matrix
  const aug: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      row.push(A[i * n + j] ?? 0);
    }
    row.push(b[i] ?? 0);
    aug.push(row);
  }

  // Forward elimination
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col]?.[col] ?? 0);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(aug[row]?.[col] ?? 0);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow] ?? [], aug[col] ?? []];

    const pivot = aug[col]?.[col] ?? 0;
    if (Math.abs(pivot) < 1e-12) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = (aug[row]?.[col] ?? 0) / pivot;
      for (let j = col; j <= n; j++) {
        (aug[row] ?? [])[j] = ((aug[row] ?? [])[j] ?? 0) - factor * ((aug[col] ?? [])[j] ?? 0);
      }
    }
  }

  // Back substitution
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i]?.[n] ?? 0;
    for (let j = i + 1; j < n; j++) {
      sum -= (aug[i]?.[j] ?? 0) * (x[j] ?? 0);
    }
    const pivot = aug[i]?.[i] ?? 0;
    x[i] = Math.abs(pivot) < 1e-12 ? 0 : sum / pivot;
  }

  return x;
}
