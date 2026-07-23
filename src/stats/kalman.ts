/**
 * kalman — Linear Gaussian State-Space Model: Kalman Filter & RTS Smoother.
 *
 * Implements the standard discrete-time Kalman filter (forward pass) and the
 * Rauch-Tung-Striebel (RTS) smoother (backward pass) for linear dynamical
 * systems:
 *
 *   x_t = F·x_{t-1} + w_t,  w_t ~ N(0, Q)   (state equation)
 *   y_t = H·x_t    + v_t,   v_t ~ N(0, R)   (observation equation)
 *   x_0 ~ N(m0, P0)
 *
 * Missing observations (null) are handled by skipping the update step —
 * the filtered state reverts to the predicted state for that time-step.
 *
 * Mirrors the `statsmodels.tsa.statespace.kalman_filter.KalmanFilter` and
 * `pykalman.KalmanFilter` APIs; factory helpers match common pandas patterns.
 *
 * Exported names:
 * - {@link KalmanFilter}          — main class (filter + smooth)
 * - {@link KalmanFilterOptions}   — constructor options
 * - {@link KalmanFilterResult}    — forward-pass output
 * - {@link KalmanSmootherResult}  — backward-pass output
 *
 * @example
 * ```ts
 * import { KalmanFilter } from "tsb";
 *
 * // Local-level model (random walk observed with noise)
 * const kf = KalmanFilter.localLevel({ processNoise: 1, observationNoise: 2 });
 * const res = kf.filter([[1], [2], [1.5], [null], [3], [2.5]]);
 * console.log(res.filteredStateMeans);   // [[…], …]  T × 1
 * console.log(res.logLikelihood);
 *
 * const sm = kf.smooth([[1], [2], [1.5], [null], [3], [2.5]]);
 * console.log(sm.smoothedStateMeans);
 * ```
 *
 * @module
 */

// ─── Internal matrix helpers ───────────────────────────────────────────────────

/** Read-only row-major matrix. */
type Mat = readonly (readonly number[])[];
/** Mutable row-major matrix. */
type MutMat = number[][];

/** Rows of A (no checks — callers must ensure dimensions). */
function rows(A: Mat): number {
  return A.length;
}
/** Columns of A (0 if empty). */
function cols(A: Mat): number {
  return A[0]?.length ?? 0;
}

/** Create an n×m zero matrix. */
function zeros(n: number, m: number): MutMat {
  return Array.from({ length: n }, () => Array<number>(m).fill(0));
}

/** Create an n×n identity matrix. */
function eye(n: number): MutMat {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

/** Matrix–matrix product A (m×k) · B (k×n) → (m×n). */
function mmul(A: Mat, B: Mat): MutMat {
  const m = rows(A);
  const k = cols(A);
  const n = cols(B);
  const C = zeros(m, n);
  for (let i = 0; i < m; i++) {
    const ai = A[i]!;
    const ci = C[i]!;
    for (let p = 0; p < k; p++) {
      const aip = ai[p]!;
      if (aip === 0) continue;
      const bp = B[p]!;
      for (let j = 0; j < n; j++) {
        ci[j] = (ci[j] ?? 0) + aip * bp[j]!;
      }
    }
  }
  return C;
}

/** Matrix–vector product A (m×k) · x (k) → (m). */
function mvmul(A: Mat, x: readonly number[]): number[] {
  const m = rows(A);
  const k = x.length;
  const y = Array<number>(m).fill(0);
  for (let i = 0; i < m; i++) {
    const ai = A[i]!;
    let s = 0;
    for (let p = 0; p < k; p++) s += ai[p]! * x[p]!;
    y[i] = s;
  }
  return y;
}

/** Transpose of A (m×n) → (n×m). */
function T(A: Mat): MutMat {
  const m = rows(A);
  const n = cols(A);
  const At = zeros(n, m);
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) At[j]![i] = A[i]![j]!;
  return At;
}

/** A + B (element-wise). */
function madd(A: Mat, B: Mat): MutMat {
  const m = rows(A);
  const n = cols(A);
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => A[i]![j]! + B[i]![j]!),
  );
}

/** A − B (element-wise). */
function msub(A: Mat, B: Mat): MutMat {
  const m = rows(A);
  const n = cols(A);
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => A[i]![j]! - B[i]![j]!),
  );
}

/** Vector addition a + b. */
function vadd(a: readonly number[], b: readonly number[]): number[] {
  return a.map((ai, i) => ai + b[i]!);
}

/** Vector subtraction a − b. */
function vsub(a: readonly number[], b: readonly number[]): number[] {
  return a.map((ai, i) => ai - b[i]!);
}

/**
 * Invert a square matrix via Gaussian elimination with partial pivoting.
 * Returns null if the matrix is singular (|pivot| < 1e-14).
 */
function matInv(A: Mat): MutMat | null {
  const n = rows(A);
  // Augmented [A | I]
  const aug: MutMat = Array.from({ length: n }, (_, i) => [
    ...A[i]!,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(aug[col]![col]!);
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(aug[row]![col]!);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxVal < 1e-14) return null;
    [aug[col], aug[maxRow]] = [aug[maxRow]!, aug[col]!];
    const pivot = aug[col]![col]!;
    const pivRow = aug[col]!;
    for (let j = 0; j < 2 * n; j++) pivRow[j] = pivRow[j]! / pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const fac = aug[row]![col]!;
      if (fac === 0) continue;
      const r = aug[row]!;
      for (let j = 0; j < 2 * n; j++) r[j] = r[j]! - fac * pivRow[j]!;
    }
  }
  return aug.map((row) => row.slice(n));
}

/** log-determinant via LU decomposition (for log-likelihood). */
function logDet(A: Mat): number {
  const n = rows(A);
  const L: MutMat = Array.from({ length: n }, (_, i) => [...A[i]!]);
  let logD = 0;
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(L[col]![col]!);
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(L[row]![col]!);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [L[col], L[maxRow]] = [L[maxRow]!, L[col]!];
      logD += Math.log(-1); // sign flip — handled by real part
    }
    const pivot = L[col]![col]!;
    if (Math.abs(pivot) < 1e-300) return -Infinity;
    logD += Math.log(Math.abs(pivot));
    for (let row = col + 1; row < n; row++) {
      const fac = L[row]![col]! / pivot;
      const r = L[row]!;
      for (let j = col; j < n; j++) r[j] = r[j]! - fac * L[col]![j]!;
    }
  }
  return logD;
}

/** Outer product a·bᵀ → matrix. */
function outer(a: readonly number[], b: readonly number[]): MutMat {
  return Array.from({ length: a.length }, (_, i) =>
    Array.from({ length: b.length }, (_, j) => a[i]! * b[j]!),
  );
}

/** Scale matrix by scalar. */
function mscale(A: Mat, s: number): MutMat {
  return A.map((row) => row.map((v) => v * s));
}

// ─── Public types ──────────────────────────────────────────────────────────────

/** Constructor options for {@link KalmanFilter}. */
export interface KalmanFilterOptions {
  /**
   * State transition matrix **F** (n_states × n_states).
   * Defines how the state evolves: x_t = F·x_{t-1} + noise.
   */
  readonly transitionMatrix: readonly (readonly number[])[];
  /**
   * Observation matrix **H** (n_obs × n_states).
   * Maps states to observations: y_t = H·x_t + noise.
   */
  readonly observationMatrix: readonly (readonly number[])[];
  /**
   * Process noise covariance **Q** (n_states × n_states).
   * Covariance of the state-transition noise.
   */
  readonly processNoiseCov: readonly (readonly number[])[];
  /**
   * Observation noise covariance **R** (n_obs × n_obs).
   * Covariance of the observation noise.
   */
  readonly observationNoiseCov: readonly (readonly number[])[];
  /**
   * Initial state mean **m₀** (n_states vector).
   * Defaults to the zero vector.
   */
  readonly initialStateMean?: readonly number[];
  /**
   * Initial state covariance **P₀** (n_states × n_states).
   * Defaults to the identity matrix.
   */
  readonly initialStateCovariance?: readonly (readonly number[])[];
}

/** Options for {@link KalmanFilter.localLevel}. */
export interface LocalLevelOptions {
  /** Process (state) noise variance σ²_q. Default: 1. */
  readonly processNoise?: number;
  /** Observation noise variance σ²_r. Default: 1. */
  readonly observationNoise?: number;
  /** Initial state mean scalar. Default: 0. */
  readonly initialMean?: number;
  /** Initial state variance scalar. Default: 1. */
  readonly initialVariance?: number;
}

/** Options for {@link KalmanFilter.localLinearTrend}. */
export interface LocalLinearTrendOptions {
  /** Level process noise variance. Default: 1. */
  readonly levelNoise?: number;
  /** Slope process noise variance. Default: 0.1. */
  readonly slopeNoise?: number;
  /** Observation noise variance. Default: 1. */
  readonly observationNoise?: number;
  /** Initial [level, slope] mean vector. Default: [0, 0]. */
  readonly initialMean?: readonly [number, number];
  /** Initial state variance (diagonal). Default: 1. */
  readonly initialVariance?: number;
}

/** Result of the Kalman filter forward pass. */
export interface KalmanFilterResult {
  /**
   * Filtered state means x_{t|t} — shape T × n_states.
   * Each row is the posterior mean after incorporating observation t.
   */
  readonly filteredStateMeans: readonly (readonly number[])[];
  /**
   * Filtered state covariances P_{t|t} — shape T × n_states × n_states.
   * Each entry is the posterior covariance after incorporating observation t.
   */
  readonly filteredStateCovariances: readonly (readonly (readonly number[])[])[];
  /**
   * Predicted state means x_{t|t-1} — shape T × n_states.
   * Each row is the prior mean before incorporating observation t.
   */
  readonly predictedStateMeans: readonly (readonly number[])[];
  /**
   * Predicted state covariances P_{t|t-1} — shape T × n_states × n_states.
   */
  readonly predictedStateCovariances: readonly (readonly (readonly number[])[])[];
  /**
   * Innovation (prediction error) vectors y_t − H·x_{t|t-1} — shape T × n_obs.
   * NaN rows indicate missing observations.
   */
  readonly innovations: readonly (readonly number[])[];
  /**
   * Innovation covariance matrices S_t = H·P_{t|t-1}·Hᵀ + R — shape T × n_obs × n_obs.
   */
  readonly innovationCovariances: readonly (readonly (readonly number[])[])[];
  /** Gaussian log-likelihood summed over all non-missing time-steps. */
  readonly logLikelihood: number;
  /** Number of states (n_states). */
  readonly nStates: number;
  /** Number of observation dimensions (n_obs). */
  readonly nObs: number;
  /** Number of time steps (T). */
  readonly nTime: number;
}

/** Result of the RTS smoother backward pass. */
export interface KalmanSmootherResult {
  /**
   * Smoothed state means x_{t|T} — shape T × n_states.
   * Each row is the posterior mean using all T observations.
   */
  readonly smoothedStateMeans: readonly (readonly number[])[];
  /**
   * Smoothed state covariances P_{t|T} — shape T × n_states × n_states.
   */
  readonly smoothedStateCovariances: readonly (readonly (readonly number[])[])[];
  /**
   * Smoother gain matrices G_t — shape T × n_states × n_states.
   * (Last entry is all-zeros by convention.)
   */
  readonly smootherGains: readonly (readonly (readonly number[])[])[];
  /** Same as {@link KalmanFilterResult.logLikelihood} (computed in forward pass). */
  readonly logLikelihood: number;
  /** The forward-pass result used to compute the smoother. */
  readonly filterResult: KalmanFilterResult;
}

// ─── KalmanFilter class ────────────────────────────────────────────────────────

/**
 * Linear Gaussian State-Space Model with Kalman filter and RTS smoother.
 *
 * The model is:
 * ```
 *   x_t = F·x_{t-1} + w_t,   w_t ~ N(0, Q)
 *   y_t = H·x_t    + v_t,    v_t ~ N(0, R)
 *   x_0 ~ N(m0, P0)
 * ```
 *
 * @example
 * ```ts
 * const kf = new KalmanFilter({
 *   transitionMatrix:      [[1]],
 *   observationMatrix:     [[1]],
 *   processNoiseCov:       [[1]],
 *   observationNoiseCov:   [[2]],
 * });
 * const result = kf.filter([[1], [2], [null], [3]]);
 * ```
 */
export class KalmanFilter {
  /** State transition matrix F (n_states × n_states). */
  readonly transitionMatrix: Mat;
  /** Observation matrix H (n_obs × n_states). */
  readonly observationMatrix: Mat;
  /** Process noise covariance Q (n_states × n_states). */
  readonly processNoiseCov: Mat;
  /** Observation noise covariance R (n_obs × n_obs). */
  readonly observationNoiseCov: Mat;
  /** Initial state mean m₀ (n_states). */
  readonly initialStateMean: readonly number[];
  /** Initial state covariance P₀ (n_states × n_states). */
  readonly initialStateCovariance: Mat;

  constructor(opts: KalmanFilterOptions) {
    this.transitionMatrix = opts.transitionMatrix;
    this.observationMatrix = opts.observationMatrix;
    this.processNoiseCov = opts.processNoiseCov;
    this.observationNoiseCov = opts.observationNoiseCov;

    const ns = rows(opts.transitionMatrix);
    this.initialStateMean =
      opts.initialStateMean ?? Array<number>(ns).fill(0);
    this.initialStateCovariance = opts.initialStateCovariance ?? eye(ns);
  }

  // ─── Factory helpers ───────────────────────────────────────────────────────

  /**
   * Local-level model (random walk + measurement noise):
   * ```
   *   x_t = x_{t-1} + w_t,   w_t ~ N(0, σ²_q)
   *   y_t = x_t     + v_t,   v_t ~ N(0, σ²_r)
   * ```
   */
  static localLevel(opts: LocalLevelOptions = {}): KalmanFilter {
    const q = opts.processNoise ?? 1;
    const r = opts.observationNoise ?? 1;
    const m0 = opts.initialMean ?? 0;
    const p0 = opts.initialVariance ?? 1;
    return new KalmanFilter({
      transitionMatrix: [[1]],
      observationMatrix: [[1]],
      processNoiseCov: [[q]],
      observationNoiseCov: [[r]],
      initialStateMean: [m0],
      initialStateCovariance: [[p0]],
    });
  }

  /**
   * Local linear trend model (level + slope):
   * ```
   *   level_t = level_{t-1} + slope_{t-1} + w1_t
   *   slope_t = slope_{t-1}               + w2_t
   *   y_t     = level_t                   + v_t
   * ```
   */
  static localLinearTrend(opts: LocalLinearTrendOptions = {}): KalmanFilter {
    const ql = opts.levelNoise ?? 1;
    const qs = opts.slopeNoise ?? 0.1;
    const r = opts.observationNoise ?? 1;
    const [m0l, m0s] = opts.initialMean ?? [0, 0];
    const p0 = opts.initialVariance ?? 1;
    return new KalmanFilter({
      transitionMatrix: [
        [1, 1],
        [0, 1],
      ],
      observationMatrix: [[1, 0]],
      processNoiseCov: [
        [ql, 0],
        [0, qs],
      ],
      observationNoiseCov: [[r]],
      initialStateMean: [m0l, m0s],
      initialStateCovariance: [
        [p0, 0],
        [0, p0],
      ],
    });
  }

  // ─── Main methods ──────────────────────────────────────────────────────────

  /**
   * Run the Kalman filter (forward pass).
   *
   * @param observations  T × n_obs array of observations.
   *   Pass `null` for any element to indicate a missing value at that
   *   time-step × dimension. If an entire row is missing, pass a row of nulls
   *   or just pass `null` in a scalar array like `[[null]]`.
   * @returns {@link KalmanFilterResult}
   *
   * @example
   * ```ts
   * const result = kf.filter([[1], [2], [null], [3], [2.5]]);
   * ```
   */
  filter(
    observations: readonly (readonly (number | null)[])[],
  ): KalmanFilterResult {
    return kalmanFilter(
      observations,
      this.transitionMatrix,
      this.observationMatrix,
      this.processNoiseCov,
      this.observationNoiseCov,
      this.initialStateMean,
      this.initialStateCovariance,
    );
  }

  /**
   * Run the RTS smoother (Kalman filter forward pass + RTS backward pass).
   *
   * @param observations  T × n_obs array (same format as {@link filter}).
   * @returns {@link KalmanSmootherResult}
   *
   * @example
   * ```ts
   * const smoothed = kf.smooth([[1], [2], [null], [3], [2.5]]);
   * console.log(smoothed.smoothedStateMeans);
   * ```
   */
  smooth(
    observations: readonly (readonly (number | null)[])[],
  ): KalmanSmootherResult {
    const fwd = this.filter(observations);
    return rtsSmooth(fwd, this.transitionMatrix);
  }
}

// ─── Core algorithms ───────────────────────────────────────────────────────────

/**
 * Kalman filter forward pass.
 *
 * Returns all intermediate quantities needed for the RTS smoother and for
 * log-likelihood computation.
 */
function kalmanFilter(
  obs: readonly (readonly (number | null)[])[],
  F: Mat,
  H: Mat,
  Q: Mat,
  R: Mat,
  m0: readonly number[],
  P0: Mat,
): KalmanFilterResult {
  const T_len = obs.length;
  const ns = rows(F);
  const no = rows(H);

  // Storage
  const filtMeans: number[][] = [];
  const filtCovs: MutMat[] = [];
  const predMeans: number[][] = [];
  const predCovs: MutMat[] = [];
  const innovations: number[][] = [];
  const innovCovs: MutMat[] = [];
  let logLik = 0;

  // Initialize
  let xFilt: number[] = [...m0];
  let PFilt: MutMat = P0.map((row) => [...row]);
  const FT = T(F);
  const HT = T(H);
  const LOG2PI = Math.log(2 * Math.PI);

  for (let t = 0; t < T_len; t++) {
    const yt = obs[t]!;

    // ── Predict ────────────────────────────────────────────────────────────
    const xPred = mvmul(F, xFilt);
    // P_pred = F P F' + Q
    const PPred = madd(mmul(mmul(F, PFilt), FT), Q);

    predMeans.push(xPred);
    predCovs.push(PPred);

    // Innovation covariance S = H P_pred H' + R
    const S = madd(mmul(mmul(H, PPred), HT), R);
    innovCovs.push(S);

    // Check if observation has any non-null values
    const hasObs = yt.some((v) => v !== null);

    if (!hasObs) {
      // ── Missing observation: skip update ──────────────────────────────
      innovations.push(Array<number>(no).fill(NaN));
      filtMeans.push(xPred);
      filtCovs.push(PPred);
      xFilt = xPred;
      PFilt = PPred;
      continue;
    }

    // ── Update ─────────────────────────────────────────────────────────────
    const yHat = mvmul(H, xPred); // predicted observation
    const innov = vsub(
      yt.map((v) => (v === null ? 0 : v)), // treat null as 0 for innovation
      yHat,
    );

    // For partial missing (some dims null), we handle by projecting to
    // observed subspace. For simplicity: use full update with null→predicted.
    innovations.push(innov);

    // Kalman gain K = P_pred H' S^{-1}
    const Sinv = matInv(S);
    if (Sinv === null) {
      // Singular innovation covariance: skip update
      filtMeans.push(xPred);
      filtCovs.push(PPred);
      xFilt = xPred;
      PFilt = PPred;
      continue;
    }

    const K = mmul(mmul(PPred, HT), Sinv);

    // x_filt = x_pred + K * innov
    const xNew = vadd(xPred, mvmul(K, innov));

    // P_filt = (I − K H) P_pred  — Joseph form for numerical stability:
    // P_filt = (I−KH) P (I−KH)' + K R K'
    const IKH = msub(eye(ns), mmul(K, H));
    const IKHPIKHT = mmul(mmul(IKH, PPred), T(IKH));
    const KRKT = mmul(mmul(K, R), T(K));
    const PNew: MutMat = madd(IKHPIKHT, KRKT);

    // Log-likelihood contribution: -½ [d·log(2π) + log|S| + v'S⁻¹v]
    const logDetS = logDet(S);
    let vSv = 0;
    for (let i = 0; i < no; i++) {
      const Sinv_row = Sinv[i]!;
      let sSinvRow = 0;
      for (let j = 0; j < no; j++) sSinvRow += innov[j]! * Sinv_row[j]!;
      vSv += innov[i]! * sSinvRow;
    }
    logLik -= 0.5 * (no * LOG2PI + logDetS + vSv);

    filtMeans.push(xNew);
    filtCovs.push(PNew);
    xFilt = xNew;
    PFilt = PNew;
  }

  return {
    filteredStateMeans: filtMeans,
    filteredStateCovariances: filtCovs,
    predictedStateMeans: predMeans,
    predictedStateCovariances: predCovs,
    innovations,
    innovationCovariances: innovCovs,
    logLikelihood: logLik,
    nStates: ns,
    nObs: no,
    nTime: T_len,
  };
}

/**
 * Rauch-Tung-Striebel (RTS) smoother backward pass.
 *
 * Given the Kalman filter result, runs the smoother backward from t=T to t=0.
 *
 * Smoother equations:
 *   G_t = P_{t|t} · Fᵀ · P_{t+1|t}^{-1}
 *   x_{t|T} = x_{t|t} + G_t · (x_{t+1|T} − x_{t+1|t})
 *   P_{t|T} = P_{t|t} + G_t · (P_{t+1|T} − P_{t+1|t}) · G_tᵀ
 */
function rtsSmooth(fwd: KalmanFilterResult, F: Mat): KalmanSmootherResult {
  const T_len = fwd.nTime;
  const ns = fwd.nStates;

  const smoothMeans: number[][] = new Array<number[]>(T_len);
  const smoothCovs: MutMat[] = new Array<MutMat>(T_len);
  const gains: MutMat[] = new Array<MutMat>(T_len);

  // Initialise last time step from filter
  const lastFiltMean = [...(fwd.filteredStateMeans[T_len - 1] ?? [])];
  const lastFiltCov = (fwd.filteredStateCovariances[T_len - 1] ?? []).map(
    (r) => [...r],
  );
  smoothMeans[T_len - 1] = lastFiltMean;
  smoothCovs[T_len - 1] = lastFiltCov;
  gains[T_len - 1] = zeros(ns, ns);

  const FT = T(F);

  for (let t = T_len - 2; t >= 0; t--) {
    const xFilt = fwd.filteredStateMeans[t]!;
    const PFilt = fwd.filteredStateCovariances[t]!;
    const PPred_next = fwd.predictedStateCovariances[t + 1]!;

    // G_t = P_{t|t} · Fᵀ · P_{t+1|t}^{-1}
    const PPredInv = matInv(PPred_next);
    const G: MutMat =
      PPredInv !== null
        ? mmul(mmul(PFilt, FT), PPredInv)
        : zeros(ns, ns);

    const xSmooth_next = smoothMeans[t + 1]!;
    const PSmooth_next = smoothCovs[t + 1]!;
    const xPred_next = fwd.predictedStateMeans[t + 1]!;

    // x_{t|T} = x_{t|t} + G_t · (x_{t+1|T} − x_{t+1|t})
    const dx = vsub(xSmooth_next, xPred_next);
    smoothMeans[t] = vadd(xFilt, mvmul(G, dx));

    // P_{t|T} = P_{t|t} + G_t · (P_{t+1|T} − P_{t+1|t}) · G_tᵀ
    const dP = msub(PSmooth_next, PPred_next);
    const GT = T(G);
    smoothCovs[t] = madd(PFilt, mmul(mmul(G, dP), GT));

    gains[t] = G;
  }

  return {
    smoothedStateMeans: smoothMeans,
    smoothedStateCovariances: smoothCovs,
    smootherGains: gains,
    logLikelihood: fwd.logLikelihood,
    filterResult: fwd,
  };
}

// ─── Standalone functional API ─────────────────────────────────────────────────

/**
 * Apply the Kalman filter to a sequence of scalar observations.
 *
 * Convenience wrapper for the common 1-D case (local-level model or similar).
 *
 * @example
 * ```ts
 * import { kalmanFilter1D } from "tsb";
 * const { filteredStateMeans, logLikelihood } = kalmanFilter1D(
 *   [1, 2, null, 3, 2.5],
 *   { processNoise: 0.5, observationNoise: 1 },
 * );
 * ```
 */
export function kalmanFilter1D(
  observations: readonly (number | null)[],
  opts: LocalLevelOptions = {},
): KalmanFilterResult {
  const kf = KalmanFilter.localLevel(opts);
  return kf.filter(observations.map((v) => [v]));
}

/**
 * Apply the RTS smoother to scalar observations with a local-level model.
 *
 * @example
 * ```ts
 * import { kalmanSmooth1D } from "tsb";
 * const { smoothedStateMeans } = kalmanSmooth1D([1, 2, null, 3, 2.5]);
 * ```
 */
export function kalmanSmooth1D(
  observations: readonly (number | null)[],
  opts: LocalLevelOptions = {},
): KalmanSmootherResult {
  const kf = KalmanFilter.localLevel(opts);
  return kf.smooth(observations.map((v) => [v]));
}

// ─── Utility: extract scalars from 1-D results ─────────────────────────────────

/**
 * Extract the scalar filtered means from a 1-state filter result.
 * Returns an array of length T where each value is x_{t|t}[0].
 *
 * @example
 * ```ts
 * const result = kf.filter([[1], [2], [null], [3]]);
 * const means = extractScalarMeans(result.filteredStateMeans);
 * ```
 */
export function extractScalarMeans(
  means: readonly (readonly number[])[],
): number[] {
  return means.map((m) => m[0] ?? NaN);
}

/**
 * Extract the scalar filtered variances from a 1-state filter result.
 * Returns an array of length T where each value is P_{t|t}[0][0].
 *
 * @example
 * ```ts
 * const result = kf.filter([[1], [2], [null], [3]]);
 * const vars = extractScalarVariances(result.filteredStateCovariances);
 * ```
 */
export function extractScalarVariances(
  covs: readonly (readonly (readonly number[])[])[]
): number[] {
  return covs.map((P) => P[0]?.[0] ?? NaN);
}

/**
 * Compute a 95 % prediction interval around the filtered means for a 1-D
 * local-level model.
 *
 * Returns `{ lower, upper }` arrays of length T.
 *
 * @example
 * ```ts
 * const result = kf.filter([[1], [2], [null], [3]]);
 * const { lower, upper } = filteredPredictionInterval(result);
 * ```
 */
export function filteredPredictionInterval(
  result: KalmanFilterResult,
  zScore = 1.96,
): { lower: number[]; upper: number[] } {
  const means = extractScalarMeans(result.filteredStateMeans);
  const vars = extractScalarVariances(result.filteredStateCovariances);
  return {
    lower: means.map((m, i) => m - zScore * Math.sqrt(vars[i] ?? 0)),
    upper: means.map((m, i) => m + zScore * Math.sqrt(vars[i] ?? 0)),
  };
}

/** Alias kept for backward compat — use {@link KalmanFilter} directly. */
export { KalmanFilter as StateSpaceModel };
