/**
 * multivariate — multivariate statistical analysis.
 *
 * Mirrors `scipy.spatial.distance.mahalanobis` and `sklearn.decomposition.PCA`,
 * implemented from scratch with no external dependencies.
 *
 * Implemented functions / classes:
 * - {@link mahalanobis}    — Mahalanobis distance between two points
 * - {@link PCA}            — Principal Component Analysis (eigen method)
 * - {@link covMatrix}      — sample covariance matrix from a data matrix
 * - {@link invertMatrix}   — matrix inverse via Gaussian elimination
 *
 * @module
 */

// ─── Internal matrix helpers ──────────────────────────────────────────────────

/** Row-major 2-D matrix (read-only). */
type Matrix = readonly (readonly number[])[];
type MutableMatrix = number[][];

/** Create an n×n identity matrix. */
function eye(n: number): MutableMatrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

/** Multiply A (m×k) by B (k×n) → (m×n). */
function matmul(A: Matrix, B: Matrix): MutableMatrix {
  const m = A.length;
  const k = (A[0] ?? []).length;
  const n = (B[0] ?? []).length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0;
      for (let p = 0; p < k; p++) {
        s += ((A[i] ?? [])[p] ?? 0) * ((B[p] ?? [])[j] ?? 0);
      }
      return s;
    }),
  );
}

/** Transpose A (m×n) → (n×m). */
function transpose(A: Matrix): MutableMatrix {
  const m = A.length;
  const n = (A[0] ?? []).length;
  return Array.from({ length: n }, (_, j) =>
    Array.from({ length: m }, (_, i) => (A[i] ?? [])[j] ?? 0),
  );
}

// ─── Public matrix utilities ──────────────────────────────────────────────────

/**
 * Invert an n×n matrix using Gaussian elimination with partial pivoting.
 *
 * Returns `null` when the matrix is (numerically) singular.
 *
 * @example
 * ```ts
 * const A = [[4,3],[6,3]];
 * const inv = invertMatrix(A);
 * // A * inv ≈ [[1,0],[0,1]]
 * ```
 */
export function invertMatrix(A: Matrix): MutableMatrix | null {
  const n = A.length;
  // Augmented matrix [A | I]
  const aug: MutableMatrix = Array.from({ length: n }, (_, i) => [
    ...(A[i] ?? []),
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    let maxVal = Math.abs((aug[col] ?? [])[col] ?? 0);
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs((aug[row] ?? [])[col] ?? 0);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxVal < 1e-15) {
      return null; // singular
    }

    // Swap rows col ↔ maxRow
    const tmpRow = aug[col];
    const swapRow = aug[maxRow];
    if (tmpRow !== undefined && swapRow !== undefined) {
      aug[col] = swapRow;
      aug[maxRow] = tmpRow;
    }

    // Scale pivot row so leading element becomes 1
    const pivot = (aug[col] ?? [])[col] ?? 0;
    const pivRow = aug[col];
    if (pivRow !== undefined) {
      for (let j = 0; j < 2 * n; j++) {
        pivRow[j] = (pivRow[j] ?? 0) / pivot;
      }
    }

    // Eliminate column col from all other rows
    for (let row = 0; row < n; row++) {
      if (row === col) {
        continue;
      }
      const factor = (aug[row] ?? [])[col] ?? 0;
      if (factor === 0) {
        continue;
      }
      const r = aug[row];
      if (r !== undefined) {
        for (let j = 0; j < 2 * n; j++) {
          r[j] = (r[j] ?? 0) - factor * ((aug[col] ?? [])[j] ?? 0);
        }
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

/**
 * Compute the sample covariance matrix from a data matrix X (n × p).
 *
 * Each row of X is one observation. Returns a p × p symmetric matrix.
 * Uses the unbiased estimator divided by `n − 1`.
 *
 * @example
 * ```ts
 * const X = [[1,2],[3,4],[5,6]];
 * const C = covMatrix(X);
 * // C ≈ [[4,4],[4,4]]
 * ```
 */
export function covMatrix(X: Matrix): MutableMatrix {
  const n = X.length;
  const p = (X[0] ?? []).length;
  if (n < 2) {
    throw new Error("covMatrix: need at least 2 observations");
  }

  // Column means
  const mean: number[] = Array.from(
    { length: p },
    (_, j) => X.reduce((s, row) => s + (row[j] ?? 0), 0) / n,
  );

  // Centred data
  const Xc: MutableMatrix = X.map((row) =>
    Array.from({ length: p }, (_, j) => (row[j] ?? 0) - (mean[j] ?? 0)),
  );

  // cov = Xc^T Xc / (n − 1)
  const CT = transpose(Xc);
  const CTC = matmul(CT, Xc);
  return CTC.map((row) => row.map((v) => v / (n - 1)));
}

// ─── Jacobi eigendecomposition (symmetric matrices) ──────────────────────────

/**
 * Jacobi eigendecomposition of a real symmetric p×p matrix.
 *
 * Returns eigenvalues (diagonal of converged matrix) and eigenvectors
 * (columns of the accumulated rotation matrix V).
 * Convergence criterion: largest off-diagonal element < 1e-12.
 */
function jacobiEigen(A: Matrix): { values: number[]; vectors: MutableMatrix } {
  const n = A.length;
  const S: MutableMatrix = A.map((row) => [...row]);
  const V: MutableMatrix = eye(n);

  const maxIter = Math.max(200 * n * n, 100);

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const v = Math.abs((S[i] ?? [])[j] ?? 0);
        if (v > maxVal) {
          maxVal = v;
          p = i;
          q = j;
        }
      }
    }
    if (maxVal < 1e-12) {
      break;
    }

    const app = (S[p] ?? [])[p] ?? 0;
    const aqq = (S[q] ?? [])[q] ?? 0;
    const apq = (S[p] ?? [])[q] ?? 0;

    // Rotation angle (avoids catastrophic cancellation)
    const theta = 0.5 * Math.atan2(2 * apq, app - aqq);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Apply Givens rotation: S ← J^T S J
    // Step 1: form S' = S with rows p,q rotated (left-multiply J^T)
    const newS: MutableMatrix = S.map((row) => [...row]);
    for (let i = 0; i < n; i++) {
      const sip = (S[i] ?? [])[p] ?? 0;
      const siq = (S[i] ?? [])[q] ?? 0;
      const newSi = newS[i];
      if (newSi !== undefined) {
        newSi[p] = c * sip + s * siq;
        newSi[q] = -s * sip + c * siq;
      }
    }
    // Step 2: right-multiply J (rotate columns p,q)
    for (let j = 0; j < n; j++) {
      const spj = (newS[p] ?? [])[j] ?? 0;
      const sqj = (newS[q] ?? [])[j] ?? 0;
      const newSp = newS[p];
      const newSq = newS[q];
      if (newSp !== undefined) {
        newSp[j] = c * spj + s * sqj;
      }
      if (newSq !== undefined) {
        newSq[j] = -s * spj + c * sqj;
      }
    }
    // Enforce exact zeros on (p,q) and (q,p)
    const newSp2 = newS[p];
    const newSq2 = newS[q];
    if (newSp2 !== undefined) {
      newSp2[q] = 0;
    }
    if (newSq2 !== undefined) {
      newSq2[p] = 0;
    }

    // Accumulate rotations into V: V ← V J
    for (let i = 0; i < n; i++) {
      const vip = (V[i] ?? [])[p] ?? 0;
      const viq = (V[i] ?? [])[q] ?? 0;
      const vi = V[i];
      if (vi !== undefined) {
        vi[p] = c * vip + s * viq;
        vi[q] = -s * vip + c * viq;
      }
    }

    // Copy newS back to S
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const si = S[i];
        if (si !== undefined) {
          si[j] = (newS[i] ?? [])[j] ?? 0;
        }
      }
    }
  }

  const values: number[] = Array.from({ length: n }, (_, i) => (S[i] ?? [])[i] ?? 0);
  return { values, vectors: V };
}

// ─── Public types ──────────────────────────────────────────────────────────────

/** Options for the {@link PCA} constructor. */
export interface PCAOptions {
  /**
   * Number of principal components to retain.
   * - Integer ≥ 1: keep exactly that many components.
   * - Float in (0, 1): keep enough components to explain at least that
   *   fraction of total variance (e.g. `0.95` → 95 % explained).
   * - Omitted: keep all components.
   */
  readonly n_components?: number;
  /**
   * Whether to scale (whiten) projected scores so each component has unit
   * variance. Equivalent to `sklearn`'s `whiten=True`. Default `false`.
   */
  readonly whiten?: boolean;
}

/** Fitted PCA model — returned by {@link PCA.fit}. */
export interface PCAResult {
  /** Per-component explained variance (eigenvalues of the covariance matrix). */
  readonly explainedVariance: readonly number[];
  /** Fraction of total variance explained by each retained component. */
  readonly explainedVarianceRatio: readonly number[];
  /**
   * Cumulative explained variance ratio (monotone increasing; last entry is
   * ≥ the requested fraction when `n_components` is a float).
   */
  readonly cumulativeExplainedVarianceRatio: readonly number[];
  /**
   * Principal component loadings — shape `[n_components × n_features]`.
   * Row `i` is the unit vector for the i-th principal component.
   */
  readonly components: readonly (readonly number[])[];
  /** Per-feature means used for centering. */
  readonly mean: readonly number[];
  /** Number of retained principal components. */
  readonly nComponents: number;
  /** Number of input features (dimensionality). */
  readonly nFeatures: number;
  /** Number of training samples. */
  readonly nSamples: number;
  /**
   * Project new data onto the fitted principal components.
   *
   * @param X  Shape `[n_obs × n_features]`.
   * @returns  Score matrix — shape `[n_obs × n_components]`.
   */
  transform(X: Matrix): number[][];
  /**
   * Reconstruct approximate original data from projected scores.
   *
   * @param Z  Score matrix — shape `[n_obs × n_components]`.
   * @returns  Approximate original data — shape `[n_obs × n_features]`.
   */
  inverseTransform(Z: Matrix): number[][];
}

// ─── mahalanobis ──────────────────────────────────────────────────────────────

/**
 * Mahalanobis distance between vectors `u` and `v`.
 *
 * ```
 * d = sqrt( (u − v)ᵀ · VI · (u − v) )
 * ```
 *
 * Mirrors `scipy.spatial.distance.mahalanobis(u, v, VI)`.
 *
 * Supply either a pre-computed inverse covariance matrix `VI`, or a data
 * matrix `X` from which the sample covariance is estimated and inverted.
 *
 * @param u   First point (length p).
 * @param v   Second point (length p).
 * @param VI  Inverse covariance matrix (p × p), or `null` to auto-compute
 *            from `X`.
 * @param X   Optional data matrix (n × p). Required when `VI` is `null`.
 *
 * @example
 * ```ts
 * import { mahalanobis } from "tsb";
 *
 * // Identity inverse covariance → Euclidean distance
 * const VI = [[1,0],[0,1]];
 * console.log(mahalanobis([0,0], [3,4], VI)); // 5
 *
 * // Auto-compute VI from training data
 * const X = [[1,0],[2,1],[3,0],[2,-1]];
 * const d = mahalanobis([1,0], [3,0], null, X);
 * ```
 */
export function mahalanobis(
  u: readonly number[],
  v: readonly number[],
  VI: Matrix | null,
  X?: Matrix,
): number {
  const p = u.length;
  if (v.length !== p) {
    throw new Error("mahalanobis: u and v must have the same length");
  }

  let viMat: Matrix;
  if (VI !== null && VI !== undefined) {
    viMat = VI;
  } else {
    if (!X) {
      throw new Error("mahalanobis: provide VI or X");
    }
    const cov = covMatrix(X);
    const inv = invertMatrix(cov);
    if (!inv) {
      throw new Error("mahalanobis: covariance matrix is singular");
    }
    viMat = inv;
  }

  // diff = u − v
  const diff: number[] = Array.from({ length: p }, (_, i) => (u[i] ?? 0) - (v[i] ?? 0));

  // d² = diffᵀ · VI · diff
  let d2 = 0;
  for (let i = 0; i < p; i++) {
    let vd = 0;
    for (let j = 0; j < p; j++) {
      vd += ((viMat[i] ?? [])[j] ?? 0) * (diff[j] ?? 0);
    }
    d2 += (diff[i] ?? 0) * vd;
  }

  return Math.sqrt(Math.max(0, d2));
}

// ─── PCA ──────────────────────────────────────────────────────────────────────

/**
 * Principal Component Analysis (PCA).
 *
 * Fits a linear dimensionality reduction using the eigendecomposition of the
 * sample covariance matrix. Mirrors `sklearn.decomposition.PCA`.
 *
 * @example
 * ```ts
 * import { PCA } from "tsb";
 *
 * const X = [
 *   [2.5, 2.4],
 *   [0.5, 0.7],
 *   [2.2, 2.9],
 *   [1.9, 2.2],
 *   [3.1, 3.0],
 * ];
 *
 * const pca = new PCA({ n_components: 1 });
 * const result = pca.fit(X);
 * console.log(result.explainedVarianceRatio[0]); // ≈ 0.965
 * const scores = result.transform(X); // shape [5 × 1]
 * ```
 */
export class PCA {
  private readonly _n_components: number | undefined;
  private readonly _whiten: boolean;
  private _result: PCAResult | null = null;

  constructor(options: PCAOptions = {}) {
    this._n_components = options.n_components;
    this._whiten = options.whiten ?? false;
  }

  /**
   * Fit PCA to data matrix `X` (n_samples × n_features).
   *
   * @param X  Each row is one observation.
   */
  fit(X: Matrix): PCAResult {
    const n = X.length;
    const p = (X[0] ?? []).length;
    if (n < 2) {
      throw new Error("PCA.fit: need at least 2 samples");
    }
    if (p < 1) {
      throw new Error("PCA.fit: need at least 1 feature");
    }

    // Column means
    const mean: number[] = Array.from(
      { length: p },
      (_, j) => X.reduce((s, row) => s + (row[j] ?? 0), 0) / n,
    );

    // Centred data
    const Xc: MutableMatrix = X.map((row) =>
      Array.from({ length: p }, (_, j) => (row[j] ?? 0) - (mean[j] ?? 0)),
    );

    // Sample covariance matrix (p×p) = Xc^T Xc / (n−1)
    const CT = transpose(Xc);
    const CTC = matmul(CT, Xc);
    const covM: MutableMatrix = CTC.map((row) => row.map((v) => v / (n - 1)));

    // Eigendecomposition of the symmetric covariance matrix
    const { values, vectors } = jacobiEigen(covM);

    // Sort eigenvalues descending; eigenvalue i → column i of V
    const order = Array.from({ length: p }, (_, i) => i).sort(
      (a, b) => (values[b] ?? 0) - (values[a] ?? 0),
    );
    const sortedValues: number[] = order.map((i) => Math.max(0, values[i] ?? 0));

    // Each component is a column of V (extracted as a row vector for storage)
    const sortedComponents: (readonly number[])[] = order.map((oi) =>
      Array.from({ length: p }, (_, j) => (vectors[j] ?? [])[oi] ?? 0),
    );

    // Explained variance ratio and cumulative EVR
    const totalVar = sortedValues.reduce((s, v) => s + v, 0);
    const evr: number[] = sortedValues.map((v) => (totalVar > 0 ? v / totalVar : 0));
    const cumEvr: number[] = [];
    let cum = 0;
    for (const r of evr) {
      cum += r;
      cumEvr.push(cum);
    }

    // Determine k = number of components to retain
    let k = p;
    const nc = this._n_components;
    if (nc !== undefined) {
      if (nc >= 1) {
        k = Math.min(Math.round(nc), p);
      } else if (nc > 0) {
        // Float fraction: smallest k such that cumEvr[k-1] >= nc
        const idx = cumEvr.findIndex((c) => c >= nc - 1e-10);
        k = idx >= 0 ? idx + 1 : p;
      }
    }

    const finalValues: readonly number[] = sortedValues.slice(0, k);
    const finalEvr: readonly number[] = evr.slice(0, k);
    const finalCumEvr: readonly number[] = cumEvr.slice(0, k);
    const finalComponents: readonly (readonly number[])[] = sortedComponents.slice(0, k);

    const whiten = this._whiten;
    // Whitening standard deviations (sqrt of eigenvalue, ε for stability)
    const stdArr: readonly number[] = finalValues.map((v) => Math.sqrt(v + 1e-15));

    // Capture into closures (frozen at fit time)
    const frozenMean: readonly number[] = mean;
    const frozenComps: readonly (readonly number[])[] = finalComponents;
    const frozenStd: readonly number[] = stdArr;

    const doTransform = (Xin: Matrix): number[][] =>
      Xin.map((row) => {
        const centered = Array.from({ length: p }, (_, j) => (row[j] ?? 0) - (frozenMean[j] ?? 0));
        return frozenComps.map((comp, ci) => {
          const dot = comp.reduce((s, c, j) => s + c * (centered[j] ?? 0), 0);
          return whiten ? dot / (frozenStd[ci] ?? 1) : dot;
        });
      });

    const doInverseTransform = (Z: Matrix): number[][] =>
      Z.map((row) =>
        Array.from({ length: p }, (_, j) => {
          const base = frozenMean[j] ?? 0;
          return row.reduce((s, z, ci) => {
            const scale = whiten ? (frozenStd[ci] ?? 1) : 1;
            return s + ((frozenComps[ci] ?? [])[j] ?? 0) * z * scale;
          }, base);
        }),
      );

    this._result = {
      explainedVariance: finalValues,
      explainedVarianceRatio: finalEvr,
      cumulativeExplainedVarianceRatio: finalCumEvr,
      components: finalComponents,
      mean: frozenMean,
      nComponents: k,
      nFeatures: p,
      nSamples: n,
      transform: doTransform,
      inverseTransform: doInverseTransform,
    };

    return this._result;
  }

  /**
   * Fit the model and transform the training data in one step.
   *
   * @param X  Data matrix (n_samples × n_features).
   */
  fitTransform(X: Matrix): number[][] {
    return this.fit(X).transform(X);
  }

  /**
   * Access the most recently fitted PCA result.
   * Throws if {@link fit} has not been called.
   */
  get result(): PCAResult {
    if (!this._result) {
      throw new Error("PCA: call fit() first");
    }
    return this._result;
  }
}
