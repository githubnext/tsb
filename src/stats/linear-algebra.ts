/**
 * Linear algebra utilities — mirrors `pandas.core.computation.expressions` and
 * `numpy.linalg` functions exposed via pandas.
 *
 * Provides: dot products, matrix multiplication, outer products, vector norms,
 * and a simple QR-based least-squares solver.
 *
 * All operations work on plain `number[][]` matrices and `number[]` vectors,
 * keeping the implementation dependency-free.
 *
 * @example
 * ```ts
 * matmul([[1,2],[3,4]], [[5,6],[7,8]]);
 * // [[19,22],[43,50]]
 *
 * dot([1,2,3], [4,5,6]);  // 32
 * lstsq([[1,1],[1,2],[1,3]], [6,5,7]);
 * // { coefficients: [5.0, 0.5], residuals: 0.5, rank: 2 }
 * ```
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** A 1-D vector of numbers. */
export type Vector = readonly number[];

/** A 2-D matrix stored as row-major arrays. */
export type Matrix = readonly (readonly number[])[];

/** Result of a least-squares solve. */
export interface LstsqResult {
  /** Coefficient vector (best-fit solution). */
  readonly coefficients: number[];
  /** Sum of squared residuals (0 if exact fit). */
  readonly residuals: number;
  /** Rank of the design matrix. */
  readonly rank: number;
}

// ─── dimension helpers ────────────────────────────────────────────────────────

function rows(m: Matrix): number {
  return m.length;
}

function cols(m: Matrix): number {
  return m.length === 0 ? 0 : (m[0]?.length ?? 0);
}

// ─── vector operations ────────────────────────────────────────────────────────

/**
 * Inner (dot) product of two equal-length vectors.
 *
 * @throws If lengths differ.
 */
export function dot(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new RangeError(`dot: vectors must have equal length (${a.length} vs ${b.length}).`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return sum;
}

/**
 * Outer product of two vectors — returns a `rows × cols` matrix.
 */
export function outer(a: Vector, b: Vector): number[][] {
  return a.map((ai) => b.map((bi) => ai * bi));
}

/**
 * Element-wise addition of two equal-length vectors.
 */
export function vadd(a: Vector, b: Vector): number[] {
  if (a.length !== b.length) {
    throw new RangeError(`vadd: vectors must have equal length (${a.length} vs ${b.length}).`);
  }
  return a.map((ai, i) => ai + (b[i] ?? 0));
}

/**
 * Element-wise subtraction: `a − b`.
 */
export function vsub(a: Vector, b: Vector): number[] {
  if (a.length !== b.length) {
    throw new RangeError(`vsub: vectors must have equal length (${a.length} vs ${b.length}).`);
  }
  return a.map((ai, i) => ai - (b[i] ?? 0));
}

/**
 * Scale a vector by a scalar.
 */
export function vscale(v: Vector, s: number): number[] {
  return v.map((x) => x * s);
}

/**
 * Euclidean (L2) norm of a vector.
 */
export function norm(v: Vector): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

// ─── matrix operations ────────────────────────────────────────────────────────

/**
 * Matrix multiplication: `A @ B`.
 *
 * @throws If inner dimensions do not match.
 */
export function matmul(a: Matrix, b: Matrix): number[][] {
  const ar = rows(a);
  const ac = cols(a);
  const br = rows(b);
  const bc = cols(b);
  if (ac !== br) {
    throw new RangeError(`matmul: inner dimensions must match (${ac} vs ${br}).`);
  }
  const result: number[][] = Array.from({ length: ar }, () => new Array<number>(bc).fill(0));
  for (let i = 0; i < ar; i++) {
    for (let j = 0; j < bc; j++) {
      let sum = 0;
      for (let k = 0; k < ac; k++) {
        sum += (a[i]?.[k] ?? 0) * (b[k]?.[j] ?? 0);
      }
      const row = result[i];
      if (row !== undefined) {
        row[j] = sum;
      }
    }
  }
  return result;
}

/**
 * Transpose a matrix.
 */
export function transpose(m: Matrix): number[][] {
  const r = rows(m);
  const c = cols(m);
  const out: number[][] = Array.from({ length: c }, () => new Array<number>(r).fill(0));
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      const outRow = out[j];
      if (outRow !== undefined) {
        outRow[i] = m[i]?.[j] ?? 0;
      }
    }
  }
  return out;
}

/**
 * Matrix–vector product: `A @ v`.
 *
 * @throws If dimensions are incompatible.
 */
export function matvec(a: Matrix, v: Vector): number[] {
  const c = cols(a);
  if (c !== v.length) {
    throw new RangeError(`matvec: matrix cols (${c}) must equal vector length (${v.length}).`);
  }
  const r = rows(a);
  const out = new Array<number>(r).fill(0);
  for (let i = 0; i < r; i++) {
    let sum = 0;
    for (let j = 0; j < c; j++) {
      sum += (a[i]?.[j] ?? 0) * (v[j] ?? 0);
    }
    out[i] = sum;
  }
  return out;
}

// ─── QR decomposition (modified Gram–Schmidt) ─────────────────────────────────

interface QR {
  q: number[][];
  r: number[][];
}

/** Copy matrix columns into q, initialising q with a's values. */
function initQ(a: Matrix, q: number[][], m: number, n: number): void {
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      const qRow = q[i];
      if (qRow !== undefined) {
        qRow[j] = a[i]?.[j] ?? 0;
      }
    }
  }
}

/** Normalise column j of q and record its norm in r[j][j]. */
function normaliseColumn(q: number[][], r: number[][], j: number, m: number): void {
  let colNormSq = 0;
  for (let i = 0; i < m; i++) {
    const v = q[i]?.[j] ?? 0;
    colNormSq += v * v;
  }
  const colNorm = Math.sqrt(colNormSq);
  const rjj = r[j];
  if (rjj !== undefined) {
    rjj[j] = colNorm;
  }
  if (colNorm > 1e-14) {
    for (let i = 0; i < m; i++) {
      const qRow = q[i];
      if (qRow !== undefined) {
        qRow[j] = (qRow[j] ?? 0) / colNorm;
      }
    }
  }
}

/** Orthogonalise columns k > j against column j. */
function orthogonaliseRemainder(
  q: number[][],
  r: number[][],
  j: number,
  n: number,
  m: number,
): void {
  for (let k = j + 1; k < n; k++) {
    let proj = 0;
    for (let i = 0; i < m; i++) {
      proj += (q[i]?.[j] ?? 0) * (q[i]?.[k] ?? 0);
    }
    const rjk = r[j];
    if (rjk !== undefined) {
      rjk[k] = proj;
    }
    for (let i = 0; i < m; i++) {
      const qRow = q[i];
      if (qRow !== undefined) {
        qRow[k] = (qRow[k] ?? 0) - proj * (qRow[j] ?? 0);
      }
    }
  }
}

function qrDecomp(a: Matrix): QR {
  const m = rows(a);
  const n = cols(a);
  const q: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  const r: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  initQ(a, q, m, n);
  for (let j = 0; j < n; j++) {
    normaliseColumn(q, r, j, m);
    orthogonaliseRemainder(q, r, j, n, m);
  }
  return { q, r };
}

/** Solve an upper-triangular system Rx = c via back-substitution. */
function backSubstitute(r: Matrix, c: Vector): number[] {
  const n = rows(r);
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = c[i] ?? 0;
    for (let j = i + 1; j < n; j++) {
      s -= (r[i]?.[j] ?? 0) * (x[j] ?? 0);
    }
    const riv = r[i]?.[i] ?? 0;
    x[i] = Math.abs(riv) < 1e-14 ? 0 : s / riv;
  }
  return x;
}

// ─── least squares ────────────────────────────────────────────────────────────

/**
 * Solve the least-squares problem `min ‖Ax − b‖₂`.
 *
 * Uses a QR decomposition approach (modified Gram–Schmidt).
 * Mirrors `numpy.linalg.lstsq`.
 *
 * @param a - Design matrix of shape `[m, n]` with `m >= n`.
 * @param b - Target vector of length `m`.
 */
export function lstsq(a: Matrix, b: Vector): LstsqResult {
  const m = rows(a);
  const n = cols(a);
  if (m < n) {
    throw new RangeError(`lstsq: system is underdetermined (m=${m} < n=${n}).`);
  }
  if (b.length !== m) {
    throw new RangeError(`lstsq: b.length (${b.length}) must equal rows(a) (${m}).`);
  }

  const { q, r } = qrDecomp(a);
  // c = Qᵀ b
  const c: number[] = new Array<number>(n).fill(0);
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < m; i++) {
      s += (q[i]?.[j] ?? 0) * (b[i] ?? 0);
    }
    c[j] = s;
  }
  const coefficients = backSubstitute(r.slice(0, n), c);

  // residuals = ‖Ax - b‖²
  const predicted = matvec(a, coefficients);
  let resid = 0;
  for (let i = 0; i < m; i++) {
    const diff = (predicted[i] ?? 0) - (b[i] ?? 0);
    resid += diff * diff;
  }

  // rank = number of non-near-zero diagonal entries in R
  let rank = 0;
  for (let j = 0; j < n; j++) {
    if (Math.abs(r[j]?.[j] ?? 0) > 1e-10) {
      rank++;
    }
  }

  return { coefficients, residuals: resid, rank };
}

// ─── determinant (2×2 and 3×3 only) ──────────────────────────────────────────

/**
 * Determinant of a square matrix.
 *
 * Supports 1×1, 2×2, and 3×3; larger matrices use cofactor expansion
 * (exponential — use sparingly for large inputs).
 */
function det2x2(m: Matrix): number {
  return (m[0]?.[0] ?? 0) * (m[1]?.[1] ?? 0) - (m[0]?.[1] ?? 0) * (m[1]?.[0] ?? 0);
}

function det3x3(m: Matrix): number {
  const a = m[0]?.[0] ?? 0;
  const b = m[0]?.[1] ?? 0;
  const c = m[0]?.[2] ?? 0;
  const d = m[1]?.[0] ?? 0;
  const e = m[1]?.[1] ?? 0;
  const f = m[1]?.[2] ?? 0;
  const g = m[2]?.[0] ?? 0;
  const h = m[2]?.[1] ?? 0;
  const k = m[2]?.[2] ?? 0;
  return a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
}

function detNxN(m: Matrix, n: number): number {
  let result = 0;
  for (let j = 0; j < n; j++) {
    const minor = m.slice(1).map((row) => [...row.slice(0, j), ...row.slice(j + 1)]);
    const sign = j % 2 === 0 ? 1 : -1;
    result += sign * (m[0]?.[j] ?? 0) * det(minor);
  }
  return result;
}

/**
 * Determinant of a square matrix.
 *
 * Supports 1×1, 2×2, and 3×3; larger matrices use cofactor expansion
 * (exponential — use sparingly for large inputs).
 */
export function det(m: Matrix): number {
  const n = rows(m);
  if (n !== cols(m)) {
    throw new RangeError("det: matrix must be square.");
  }
  if (n === 0) {
    return 1;
  }
  if (n === 1) {
    return m[0]?.[0] ?? 0;
  }
  if (n === 2) {
    return det2x2(m);
  }
  if (n === 3) {
    return det3x3(m);
  }
  return detNxN(m, n);
}
