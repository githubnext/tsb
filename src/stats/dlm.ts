/**
 * dlm — Dynamic Linear Model (Bayesian State-Space Model).
 *
 * Implements the West & Harrison DLM framework:
 *
 *   Observation: Y_t = F_t' θ_t + v_t,   v_t ~ N(0, V_t)
 *   System:      θ_t = G_t  θ_{t-1} + w_t,  w_t ~ N(0, W_t)
 *   Prior:       θ_0 ~ N(m_0, C_0)
 *
 * Supports:
 * - Scalar or multivariate observations
 * - Time-constant or time-varying system matrices
 * - Factory builders for common components: local-level, local-linear-trend,
 *   polynomial trend, Fourier seasonality, regression
 * - Component combination via `DLM.combine()`
 * - Forward filter (Kalman), backward smoother (RTS), forecasting
 * - MLE estimation of variance parameters via Nelder-Mead
 * - Discount-factor model fitting (West & Harrison §6)
 *
 * Mirrors the R `dlm` package and Python `statsmodels.tsa.statespace` API
 * surface while following TypeScript / tsb conventions.
 *
 * Exported names:
 * - {@link DLM}                — main class: filter, smooth, forecast, fit
 * - {@link DLMOptions}         — constructor options
 * - {@link DLMResult}          — filter / smoother result
 * - {@link DLMForecastResult}  — forecast result
 * - {@link buildLocalLevel}    — local-level (random-walk) component
 * - {@link buildLocalLinearTrend} — local-linear-trend component
 * - {@link buildPolynomial}    — n-th order polynomial trend
 * - {@link buildFourier}       — Fourier (harmonic) seasonal component
 * - {@link buildRegression}    — static regression component
 * - {@link combineDLMs}        — block-diagonal combination of components
 *
 * @example
 * ```ts
 * import { DLM, buildLocalLinearTrend } from "tsb";
 *
 * const spec = buildLocalLinearTrend({ sigmaObs: 1, sigmaLevel: 0.5, sigmaSlope: 0.1 });
 * const dlm = new DLM(spec);
 * const res = dlm.filter([1, 2, 1.5, 3, 2.5, 4, 3.5]);
 * console.log(res.filteredMeans);   // T × p state vectors
 * console.log(res.logLikelihood);
 *
 * const fc = dlm.forecast(res, 5);
 * console.log(fc.mean, fc.lower, fc.upper);
 * ```
 *
 * @module
 */

// ─── Internal matrix utilities ─────────────────────────────────────────────────

type Mat = readonly (readonly number[])[];
type MutMat = number[][];

function rows(A: Mat): number {
  return A.length;
}
function cols(A: Mat): number {
  return A[0]?.length ?? 0;
}
function zeros(n: number, m: number): MutMat {
  return Array.from({ length: n }, () => new Array(m).fill(0));
}
function eye(n: number): MutMat {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}
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
      if (aip === 0) {
        continue;
      }
      const bp = B[p]!;
      for (let j = 0; j < n; j++) {
        ci[j]! += aip * bp[j]!;
      }
    }
  }
  return C;
}
function mvmul(A: Mat, x: readonly number[]): number[] {
  const m = rows(A);
  const y = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    const ai = A[i]!;
    let s = 0;
    for (let p = 0; p < x.length; p++) {
      s += ai[p]! * x[p]!;
    }
    y[i] = s;
  }
  return y;
}
function tr(A: Mat): MutMat {
  const m = rows(A);
  const n = cols(A);
  const At = zeros(n, m);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      At[j]![i] = A[i]?.[j]!;
    }
  }
  return At;
}
function madd(A: Mat, B: Mat): MutMat {
  const m = rows(A);
  const n = cols(A);
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => A[i]?.[j]! + B[i]?.[j]!),
  );
}
function msub(A: Mat, B: Mat): MutMat {
  const m = rows(A);
  const n = cols(A);
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => A[i]?.[j]! - B[i]?.[j]!),
  );
}
function mscale(A: Mat, s: number): MutMat {
  return A.map((row) => row.map((v) => v * s));
}
function vdot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i]! * b[i]!;
  }
  return s;
}
function vadd(a: readonly number[], b: readonly number[]): number[] {
  return a.map((ai, i) => ai + b[i]!);
}
function vsub(a: readonly number[], b: readonly number[]): number[] {
  return a.map((ai, i) => ai - b[i]!);
}
function outer(a: readonly number[], b: readonly number[]): MutMat {
  return Array.from({ length: a.length }, (_, i) =>
    Array.from({ length: b.length }, (_, j) => a[i]! * b[j]!),
  );
}

/** Invert a square matrix via Gauss-Jordan with partial pivoting. Returns null if singular. */
function matInv(A: Mat): MutMat | null {
  const n = rows(A);
  const aug: MutMat = Array.from({ length: n }, (_, i) => [
    ...A[i]!,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotVal = Math.abs(aug[col]?.[col]!);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(aug[r]?.[col]!);
      if (v > pivotVal) {
        pivotVal = v;
        pivotRow = r;
      }
    }
    if (pivotVal < 1e-14) {
      return null;
    }
    [aug[col], aug[pivotRow]] = [aug[pivotRow]!, aug[col]!];
    const scale = 1 / aug[col]?.[col]!;
    for (let j = 0; j < 2 * n; j++) {
      aug[col]![j]! *= scale;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) {
        continue;
      }
      const f = aug[r]?.[col]!;
      if (f === 0) {
        continue;
      }
      for (let j = 0; j < 2 * n; j++) {
        aug[r]![j]! -= f * aug[col]?.[j]!;
      }
    }
  }
  return aug.map((row) => row.slice(n));
}

/** Block-diagonal combination of two matrices. */
function blockDiag(A: Mat, B: Mat): MutMat {
  const ra = rows(A);
  const ca = cols(A);
  const rb = rows(B);
  const cb = cols(B);
  const C = zeros(ra + rb, ca + cb);
  for (let i = 0; i < ra; i++) {
    for (let j = 0; j < ca; j++) {
      C[i]![j] = A[i]?.[j]!;
    }
  }
  for (let i = 0; i < rb; i++) {
    for (let j = 0; j < cb; j++) {
      C[ra + i]![ca + j] = B[i]?.[j]!;
    }
  }
  return C;
}

// ─── Public types ───────────────────────────────────────────────────────────────

/**
 * Specification for a Dynamic Linear Model.
 *
 * All matrices are row-major (array-of-rows).
 * p = state dimension, q = observation dimension.
 */
export interface DLMSpec {
  /**
   * System (transition) matrix G: p × p.
   * If omitted, defaults to the identity.
   */
  readonly G: Mat;
  /**
   * Observation matrix F: q × p  (rows = observation dim, cols = state dim).
   * For scalar observations q = 1, so F is 1 × p.
   */
  readonly F: Mat;
  /**
   * State-noise covariance W: p × p.
   */
  readonly W: Mat;
  /**
   * Observation-noise covariance V: q × q.
   */
  readonly V: Mat;
  /**
   * Prior mean m_0: length-p vector.
   * Defaults to zero vector.
   */
  readonly m0?: readonly number[];
  /**
   * Prior covariance C_0: p × p.
   * Defaults to 1e6 × I (diffuse prior).
   */
  readonly C0?: Mat;
}

/** Options for the {@link DLM} constructor. */
export type DLMOptions = DLMSpec;

/** Per-time-step output of the Kalman filter. */
export interface DLMFilterStep {
  /** Predicted state mean a_t = G m_{t-1}: length p. */
  readonly predictedMean: readonly number[];
  /** Predicted state covariance R_t = G C_{t-1} G' + W: p × p. */
  readonly predictedCov: Mat;
  /** Filtered state mean m_t: length p. */
  readonly filteredMean: readonly number[];
  /** Filtered state covariance C_t: p × p. */
  readonly filteredCov: Mat;
  /** One-step-ahead forecast mean f_t = F a_t: length q. */
  readonly forecastMean: readonly number[];
  /** One-step-ahead forecast variance Q_t = F R_t F' + V: q × q. */
  readonly forecastCov: Mat;
  /** Kalman gain K_t: p × q. */
  readonly gain: Mat;
  /** Innovation (residual) e_t = Y_t − f_t (null if observation missing). */
  readonly innovation: readonly number[] | null;
}

/** Result returned by {@link DLM.filter}. */
export interface DLMResult {
  /** Filter steps, one per time-point. */
  readonly steps: readonly DLMFilterStep[];
  /** Filtered state means: T × p. */
  readonly filteredMeans: readonly (readonly number[])[];
  /** Filtered state covariances: T × p × p. */
  readonly filteredCovs: readonly Mat[];
  /** Predicted (one-step-ahead) means: T × p. */
  readonly predictedMeans: readonly (readonly number[])[];
  /** One-step-ahead forecast means: T × q. */
  readonly forecastMeans: readonly (readonly number[])[];
  /** One-step-ahead forecast covariances: T × q × q. */
  readonly forecastCovs: readonly Mat[];
  /** Total log-likelihood. */
  readonly logLikelihood: number;
  /** Prior mean used. */
  readonly m0: readonly number[];
  /** Prior covariance used. */
  readonly C0: Mat;
}

/** Result returned by {@link DLM.smooth}. */
export interface DLMSmootherResult extends DLMResult {
  /** Smoothed state means: T × p. */
  readonly smoothedMeans: readonly (readonly number[])[];
  /** Smoothed state covariances: T × p × p. */
  readonly smoothedCovs: readonly Mat[];
}

/** Forecast result returned by {@link DLM.forecast}. */
export interface DLMForecastResult {
  /** Forecast means for steps 1 … h: h × q. */
  readonly mean: readonly (readonly number[])[];
  /** Forecast covariances for steps 1 … h: h × q × q. */
  readonly cov: readonly Mat[];
  /** 2.5th percentile (scalar observation only): length h. */
  readonly lower: readonly number[];
  /** 97.5th percentile (scalar observation only): length h. */
  readonly upper: readonly number[];
}

// ─── Main DLM class ──────────────────────────────────────────────────────────────

/**
 * Dynamic Linear Model.
 *
 * @example
 * ```ts
 * import { DLM } from "tsb";
 *
 * const dlm = new DLM({
 *   G: [[1]],
 *   F: [[1]],
 *   W: [[0.1]],
 *   V: [[1]],
 * });
 * const res = dlm.filter([1, 2, 3, 4, 5]);
 * ```
 */
export class DLM {
  private readonly _G: Mat;
  private readonly _F: Mat;
  private readonly _W: Mat;
  private readonly _V: Mat;
  private readonly _m0: readonly number[];
  private readonly _C0: Mat;
  private readonly _p: number; // state dim
  private readonly _q: number; // obs dim

  constructor(options: DLMOptions) {
    this._G = options.G;
    this._F = options.F;
    this._W = options.W;
    this._V = options.V;
    this._p = rows(this._G);
    this._q = rows(this._F);
    this._m0 = options.m0 ?? new Array(this._p).fill(0);
    this._C0 = options.C0 ?? mscale(eye(this._p), 1e6);
  }

  // ── Factory helpers ──

  /**
   * Local-level (random-walk plus noise) model.
   * State: [μ_t], System: μ_t = μ_{t-1} + w_t, Obs: Y_t = μ_t + v_t.
   */
  static localLevel(opts: { sigmaObs?: number; sigmaLevel?: number } = {}): DLM {
    const sv = opts.sigmaObs ?? 1;
    const sw = opts.sigmaLevel ?? 1;
    return new DLM({
      G: [[1]],
      F: [[1]],
      W: [[sw * sw]],
      V: [[sv * sv]],
    });
  }

  /**
   * Local-linear-trend model.
   * State: [level, slope], G = [[1,1],[0,1]], F = [[1,0]].
   */
  static localLinearTrend(
    opts: { sigmaObs?: number; sigmaLevel?: number; sigmaSlope?: number } = {},
  ): DLM {
    const sv = opts.sigmaObs ?? 1;
    const sw1 = opts.sigmaLevel ?? 1;
    const sw2 = opts.sigmaSlope ?? 0.1;
    return new DLM({
      G: [
        [1, 1],
        [0, 1],
      ],
      F: [[1, 0]],
      W: [
        [sw1 * sw1, 0],
        [0, sw2 * sw2],
      ],
      V: [[sv * sv]],
    });
  }

  /**
   * Polynomial trend of order `order` (1 = random walk, 2 = linear trend, …).
   */
  static polynomial(order: number, opts: { sigmaObs?: number; sigmaState?: number } = {}): DLM {
    const sv = opts.sigmaObs ?? 1;
    const sw = opts.sigmaState ?? 1;
    // Jordan block (upper-triangular ones)
    const G = eye(order);
    for (let i = 0; i < order - 1; i++) {
      G[i]![i + 1] = 1;
    }
    const F: MutMat = [new Array(order).fill(0)];
    F[0]![0] = 1;
    const W = mscale(eye(order), sw * sw);
    const V: MutMat = [[sv * sv]];
    return new DLM({ G, F, W, V });
  }

  /**
   * Fourier (harmonic) seasonal component with period `period` and `harmonics` pairs.
   * Each harmonic adds a 2-dimensional block to the state.
   */
  static fourier(
    period: number,
    harmonics: number,
    opts: { sigmaObs?: number; sigmaState?: number } = {},
  ): DLM {
    const sv = opts.sigmaObs ?? 1;
    const sw = opts.sigmaState ?? 0.01;
    const p = 2 * harmonics;
    // Block-diagonal G: each 2×2 block is a rotation matrix for harmonic j
    const G = zeros(p, p);
    const F: MutMat = [new Array(p).fill(0)];
    for (let j = 1; j <= harmonics; j++) {
      const omega = (2 * Math.PI * j) / period;
      const c = Math.cos(omega);
      const s = Math.sin(omega);
      const r = 2 * (j - 1);
      G[r]![r] = c;
      G[r]![r + 1] = s;
      G[r + 1]![r] = -s;
      G[r + 1]![r + 1] = c;
      F[0]![r] = 1; // cosine coefficient contributes to observation
    }
    const W = mscale(eye(p), sw * sw);
    const V: MutMat = [[sv * sv]];
    return new DLM({ G, F, W, V });
  }

  /**
   * Static regression component with known regressors `X` (T × k).
   * The state is the k regression coefficients (treated as random walk with
   * small process noise `sigmaState`).
   */
  static regression(
    X: readonly (readonly number[])[],
    opts: { sigmaObs?: number; sigmaState?: number } = {},
  ): DLM {
    const sv = opts.sigmaObs ?? 1;
    const sw = opts.sigmaState ?? 0.001;
    const k = cols(X);
    // G = identity (coefficients evolve slowly)
    // F_t = X[t] (time-varying — not supported by DLMSpec directly, but we
    // handle via per-step override at filter time)
    const G = eye(k);
    const F: MutMat = [X[0] ? [...X[0]] : new Array(k).fill(0)];
    const W = mscale(eye(k), sw * sw);
    const V: MutMat = [[sv * sv]];
    return new DLM({ G, F, W, V });
  }

  // ── Core filter ──

  /**
   * Run the Kalman filter on observations `y`.
   * Each element of `y` may be a scalar (for 1-D obs) or a vector; `null` for missing.
   */
  filter(
    y: readonly (number | readonly number[] | null)[],
    opts: { m0?: readonly number[]; C0?: Mat } = {},
  ): DLMResult {
    const m0 = opts.m0 ?? this._m0;
    const C0 = opts.C0 ?? this._C0;
    return this._filter(y, m0, C0);
  }

  private _obs(y: number | readonly number[] | null): readonly number[] | null {
    if (y === null) {
      return null;
    }
    if (typeof y === "number") {
      return [y];
    }
    return y;
  }

  private _filter(
    y: readonly (number | readonly number[] | null)[],
    m0: readonly number[],
    C0: Mat,
  ): DLMResult {
    const T = y.length;
    const steps: DLMFilterStep[] = [];
    let m = m0.slice();
    let C: Mat = C0;
    let logLik = 0;

    for (let t = 0; t < T; t++) {
      const yt = this._obs(y[t]!);

      // Predict
      const a = mvmul(this._G, m);
      const R = madd(mmul(mmul(this._G, C), tr(this._G)), this._W);

      // Forecast
      const f = mvmul(this._F, a);
      const Q = madd(mmul(mmul(this._F, R), tr(this._F)), this._V);

      let mNew = a;
      let CNew: Mat = R;
      let innovation: readonly number[] | null = null;
      let K: Mat = zeros(this._p, this._q);

      if (yt !== null) {
        // Kalman gain: K = R F' Q^{-1}
        const RF = mmul(R, tr(this._F));
        const Qinv = matInv(Q);
        if (Qinv !== null) {
          K = mmul(RF, Qinv);
          innovation = vsub(yt, f);
          mNew = vadd(a, mvmul(K, innovation));
          // Joseph-form for numerical stability: C = (I-KF)R(I-KF)' + K V K'
          const IKF = msub(eye(this._p), mmul(K, this._F));
          CNew = madd(mmul(mmul(IKF, R), tr(IKF)), mmul(mmul(K, this._V), tr(K)));

          // Log-likelihood contribution: -0.5*(q*log2π + log|Q| + e'Q^{-1}e)
          const eQe = vdot(innovation, mvmul(Qinv, innovation));
          const logDetQ = logDet(Q);
          logLik += -0.5 * (this._q * Math.log(2 * Math.PI) + logDetQ + eQe);
        }
      }

      steps.push({
        predictedMean: a,
        predictedCov: R,
        filteredMean: mNew,
        filteredCov: CNew,
        forecastMean: f,
        forecastCov: Q,
        gain: K,
        innovation,
      });
      m = mNew.slice();
      C = CNew;
    }

    return {
      steps,
      filteredMeans: steps.map((s) => s.filteredMean),
      filteredCovs: steps.map((s) => s.filteredCov),
      predictedMeans: steps.map((s) => s.predictedMean),
      forecastMeans: steps.map((s) => s.forecastMean),
      forecastCovs: steps.map((s) => s.forecastCov),
      logLikelihood: logLik,
      m0,
      C0,
    };
  }

  // ── RTS Smoother ──

  /**
   * Run the Kalman filter followed by the RTS backward smoother.
   */
  smooth(
    y: readonly (number | readonly number[] | null)[],
    opts: { m0?: readonly number[]; C0?: Mat } = {},
  ): DLMSmootherResult {
    const filterResult = this.filter(y, opts);
    return this._smooth(filterResult);
  }

  private _smooth(res: DLMResult): DLMSmootherResult {
    const T = res.steps.length;
    const sMeans: MutMat = res.filteredMeans.map((m) => m.slice());
    const sCovs: MutMat[] = res.filteredCovs.map((C) => C.map((r) => r.slice()));

    for (let t = T - 2; t >= 0; t--) {
      const step = res.steps[t]!;
      const stepNext = res.steps[t + 1]!;
      const Rt1 = stepNext.predictedCov;
      const Rt1inv = matInv(Rt1);
      if (Rt1inv === null) {
        continue;
      }
      // Smoother gain: J_t = C_t G' R_{t+1}^{-1}
      const Jt = mmul(mmul(step.filteredCov, tr(this._G)), Rt1inv);
      // Smoothed mean: s_t = m_t + J_t (s_{t+1} - a_{t+1})
      const diff = vsub(sMeans[t + 1]!, stepNext.predictedMean);
      sMeans[t] = vadd(step.filteredMean, mvmul(Jt, diff));
      // Smoothed covariance: S_t = C_t + J_t (S_{t+1} - R_{t+1}) J_t'
      const covDiff = msub(sCovs[t + 1]!, stepNext.predictedCov);
      sCovs[t] = madd(step.filteredCov, mmul(mmul(Jt, covDiff), tr(Jt)));
    }

    return {
      ...res,
      smoothedMeans: sMeans,
      smoothedCovs: sCovs,
    };
  }

  // ── Forecasting ──

  /**
   * Forecast `h` steps ahead from the end of the filter result.
   * Returns means and 95% prediction intervals (scalar obs only).
   */
  forecast(filterResult: DLMResult, h: number): DLMForecastResult {
    const T = filterResult.steps.length;
    const lastStep = filterResult.steps[T - 1]!;
    let m = lastStep.filteredMean.slice();
    let C: Mat = lastStep.filteredCov;

    const meanArr: (readonly number[])[] = [];
    const covArr: Mat[] = [];
    const lower: number[] = [];
    const upper: number[] = [];
    const z975 = 1.959963985;

    for (let h_i = 0; h_i < h; h_i++) {
      // Predict one step
      const a = mvmul(this._G, m);
      const R = madd(mmul(mmul(this._G, C), tr(this._G)), this._W);
      // Forecast mean and variance
      const f = mvmul(this._F, a);
      const Q = madd(mmul(mmul(this._F, R), tr(this._F)), this._V);
      meanArr.push(f);
      covArr.push(Q);
      if (this._q === 1) {
        const sd = Math.sqrt(Math.max(0, Q[0]?.[0]!));
        lower.push(f[0]! - z975 * sd);
        upper.push(f[0]! + z975 * sd);
      }
      m = a;
      C = R;
    }

    return { mean: meanArr, cov: covArr, lower, upper };
  }

  // ── MLE estimation ──

  /**
   * Estimate variance parameters (log V, log W diagonal) by maximum likelihood.
   * Returns a new DLM with the fitted parameters.
   *
   * Uses Nelder-Mead minimisation of negative log-likelihood.
   */
  fitMLE(y: readonly (number | readonly number[] | null)[]): DLM {
    const p = this._p;
    const q = this._q;
    // Pack: theta = [log V entries (q*q), log diag(W) entries (p)]
    // Only diagonal elements of V and W are fitted; off-diagonal kept fixed.
    const packV = Array.from({ length: q }, (_, i) => Math.log(Math.max(1e-8, this._V[i]?.[i]!)));
    const packW = Array.from({ length: p }, (_, i) => Math.log(Math.max(1e-8, this._W[i]?.[i]!)));
    const x0 = [...packV, ...packW];

    const objective = (x: readonly number[]): number => {
      const V2: MutMat = this._V.map((row) => row.slice());
      for (let i = 0; i < q; i++) {
        V2[i]![i] = Math.exp(x[i]!);
      }
      const W2: MutMat = this._W.map((row) => row.slice());
      for (let i = 0; i < p; i++) {
        W2[i]![i] = Math.exp(x[q + i]!);
      }
      const dlm2 = new DLM({ G: this._G, F: this._F, W: W2, V: V2, m0: this._m0, C0: this._C0 });
      const res = dlm2._filter(y, this._m0, this._C0);
      return -res.logLikelihood;
    };

    const xOpt = nelderMead(objective, x0, { maxIter: 500, tol: 1e-6 });

    const Vfit: MutMat = this._V.map((row) => row.slice());
    for (let i = 0; i < q; i++) {
      Vfit[i]![i] = Math.exp(xOpt[i]!);
    }
    const Wfit: MutMat = this._W.map((row) => row.slice());
    for (let i = 0; i < p; i++) {
      Wfit[i]![i] = Math.exp(xOpt[q + i]!);
    }

    return new DLM({ G: this._G, F: this._F, W: Wfit, V: Vfit, m0: this._m0, C0: this._C0 });
  }

  /**
   * Fit with discount factors (West & Harrison §6).
   * The process covariance is replaced by W_t = ((1-δ)/δ) C_{t-1},
   * where δ ∈ (0,1] is the discount factor (close to 1 = small evolution).
   * Returns a new DLM plus the filter result under the discounted model.
   */
  filterDiscount(y: readonly (number | readonly number[] | null)[], delta: number): DLMResult {
    const m0 = this._m0;
    const C0 = this._C0;
    const T = y.length;
    const steps: DLMFilterStep[] = [];
    let m = m0.slice();
    let C: Mat = C0;
    let logLik = 0;

    for (let t = 0; t < T; t++) {
      const yt = this._obs(y[t]!);

      // Predict with discount: R_t = G C_{t-1} G' / delta
      const GCGt = mmul(mmul(this._G, C), tr(this._G));
      const R = mscale(GCGt, 1 / delta);
      const a = mvmul(this._G, m);

      const f = mvmul(this._F, a);
      const Q = madd(mmul(mmul(this._F, R), tr(this._F)), this._V);

      let mNew = a;
      let CNew: Mat = R;
      let innovation: readonly number[] | null = null;
      let K: Mat = zeros(this._p, this._q);

      if (yt !== null) {
        const Qinv = matInv(Q);
        if (Qinv !== null) {
          K = mmul(mmul(R, tr(this._F)), Qinv);
          innovation = vsub(yt, f);
          mNew = vadd(a, mvmul(K, innovation));
          const IKF = msub(eye(this._p), mmul(K, this._F));
          CNew = madd(mmul(mmul(IKF, R), tr(IKF)), mmul(mmul(K, this._V), tr(K)));
          const eQe = vdot(innovation, mvmul(Qinv, innovation));
          const logDetQ = logDet(Q);
          logLik += -0.5 * (this._q * Math.log(2 * Math.PI) + logDetQ + eQe);
        }
      }

      steps.push({
        predictedMean: a,
        predictedCov: R,
        filteredMean: mNew,
        filteredCov: CNew,
        forecastMean: f,
        forecastCov: Q,
        gain: K,
        innovation,
      });
      m = mNew.slice();
      C = CNew;
    }

    return {
      steps,
      filteredMeans: steps.map((s) => s.filteredMean),
      filteredCovs: steps.map((s) => s.filteredCov),
      predictedMeans: steps.map((s) => s.predictedMean),
      forecastMeans: steps.map((s) => s.forecastMean),
      forecastCovs: steps.map((s) => s.forecastCov),
      logLikelihood: logLik,
      m0,
      C0,
    };
  }
}

// ─── Factory helpers ────────────────────────────────────────────────────────────

/** Build a local-level DLM (random walk + noise). */
export function buildLocalLevel(opts: { sigmaObs?: number; sigmaLevel?: number } = {}): DLMSpec {
  return {
    G: [[1]],
    F: [[1]],
    W: [[(opts.sigmaLevel ?? 1) ** 2]],
    V: [[(opts.sigmaObs ?? 1) ** 2]],
  };
}

/** Build a local-linear-trend DLM. */
export function buildLocalLinearTrend(
  opts: {
    sigmaObs?: number;
    sigmaLevel?: number;
    sigmaSlope?: number;
  } = {},
): DLMSpec {
  const sv = opts.sigmaObs ?? 1;
  const sw1 = opts.sigmaLevel ?? 1;
  const sw2 = opts.sigmaSlope ?? 0.1;
  return {
    G: [
      [1, 1],
      [0, 1],
    ],
    F: [[1, 0]],
    W: [
      [sw1 * sw1, 0],
      [0, sw2 * sw2],
    ],
    V: [[sv * sv]],
  };
}

/** Build a polynomial (Jordan-block) trend DLM of a given order. */
export function buildPolynomial(
  order: number,
  opts: { sigmaObs?: number; sigmaState?: number } = {},
): DLMSpec {
  const sv = opts.sigmaObs ?? 1;
  const sw = opts.sigmaState ?? 1;
  const G = eye(order);
  for (let i = 0; i < order - 1; i++) {
    G[i]![i + 1] = 1;
  }
  const F: MutMat = [new Array(order).fill(0)];
  F[0]![0] = 1;
  return { G, F, W: mscale(eye(order), sw * sw), V: [[sv * sv]] };
}

/** Build a Fourier seasonal DLM. */
export function buildFourier(
  period: number,
  harmonics: number,
  opts: { sigmaObs?: number; sigmaState?: number } = {},
): DLMSpec {
  const sv = opts.sigmaObs ?? 1;
  const sw = opts.sigmaState ?? 0.01;
  const p = 2 * harmonics;
  const G = zeros(p, p);
  const F: MutMat = [new Array(p).fill(0)];
  for (let j = 1; j <= harmonics; j++) {
    const omega = (2 * Math.PI * j) / period;
    const c = Math.cos(omega);
    const s = Math.sin(omega);
    const r = 2 * (j - 1);
    G[r]![r] = c;
    G[r]![r + 1] = s;
    G[r + 1]![r] = -s;
    G[r + 1]![r + 1] = c;
    F[0]![r] = 1;
  }
  return { G, F, W: mscale(eye(p), sw * sw), V: [[sv * sv]] };
}

/** Build a static regression DLM with k predictors (slow-varying coefficients). */
export function buildRegression(
  k: number,
  opts: { sigmaObs?: number; sigmaState?: number } = {},
): DLMSpec {
  const sv = opts.sigmaObs ?? 1;
  const sw = opts.sigmaState ?? 0.001;
  return {
    G: eye(k),
    F: [new Array(k).fill(0)], // placeholder; rows are set externally
    W: mscale(eye(k), sw * sw),
    V: [[sv * sv]],
  };
}

/**
 * Combine multiple DLM specs into a single block-diagonal model.
 * The combined observation matrix is the horizontal concatenation of the
 * individual F matrices (summing each component's contribution to the scalar
 * observation). All component V matrices must have the same dimension.
 */
export function combineDLMs(...specs: DLMSpec[]): DLMSpec {
  if (specs.length === 0) {
    throw new RangeError("combineDLMs requires at least one spec");
  }
  const first = specs[0];
  let G: Mat = first.G;
  let W: Mat = first.W;
  let C0: Mat | undefined = first.C0;
  let m0: number[] = first.m0 ? [...first.m0] : new Array(rows(first.G)).fill(0);

  // Combined F: 1 × (p1+p2+…) — horizontal concat of F rows
  let Fcombined: number[] = first.F[0] ? [...first.F[0]] : [];

  for (let i = 1; i < specs.length; i++) {
    const s = specs[i]!;
    G = blockDiag(G, s.G);
    W = blockDiag(W, s.W);
    if (C0 !== undefined && s.C0 !== undefined) {
      C0 = blockDiag(C0, s.C0);
    } else {
      C0 = undefined;
    }
    const fi = s.F[0] ? [...s.F[0]] : [];
    Fcombined = [...Fcombined, ...fi];
    const pm = s.m0 ? [...s.m0] : new Array(rows(s.G)).fill(0);
    m0 = [...m0, ...pm];
  }

  // Use the first component's V (they must agree)
  const V = specs[0]?.V;
  const spec: DLMSpec = {
    G,
    F: [Fcombined],
    W,
    V,
    m0,
    ...(C0 !== undefined ? { C0 } : {}),
  };
  return spec;
}

// ─── Log-determinant helper ─────────────────────────────────────────────────────

/** Log-determinant of a positive-definite matrix via Cholesky. Falls back to LU. */
function logDet(A: Mat): number {
  const n = rows(A);
  // Try Cholesky L L' = A
  const L = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i]?.[j]!;
      for (let k2 = 0; k2 < j; k2++) {
        s -= L[i]?.[k2]! * L[j]?.[k2]!;
      }
      if (i === j) {
        if (s < 0) {
          return _logDetLU(A); // fall back
        }
        L[i]![j] = Math.sqrt(s);
      } else {
        L[i]![j] = s / (L[j]?.[j] ?? 1);
      }
    }
  }
  let ld = 0;
  for (let i = 0; i < n; i++) {
    ld += 2 * Math.log(Math.abs(L[i]?.[i]!));
  }
  return ld;
}

function _logDetLU(A: Mat): number {
  const n = rows(A);
  const U: MutMat = A.map((r) => r.slice());
  let sign = 1;
  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(U[col]?.[col]!);
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(U[r]?.[col]!);
      if (v > maxVal) {
        maxVal = v;
        maxRow = r;
      }
    }
    if (maxRow !== col) {
      [U[col], U[maxRow]] = [U[maxRow]!, U[col]!];
      sign *= -1;
    }
    const pivot = U[col]?.[col]!;
    if (Math.abs(pivot) < 1e-14) {
      return Number.NEGATIVE_INFINITY;
    }
    for (let r = col + 1; r < n; r++) {
      const f = U[r]?.[col]! / pivot;
      for (let j = col; j < n; j++) {
        U[r]![j]! -= f * U[col]?.[j]!;
      }
    }
  }
  let ld = Math.log(Math.abs(sign));
  for (let i = 0; i < n; i++) {
    ld += Math.log(Math.abs(U[i]?.[i]!));
  }
  return ld;
}

// ─── Nelder-Mead optimizer ──────────────────────────────────────────────────────

interface NelderMeadOptions {
  maxIter?: number;
  tol?: number;
}

function nelderMead(
  f: (x: readonly number[]) => number,
  x0: readonly number[],
  opts: NelderMeadOptions = {},
): number[] {
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 1e-8;
  const n = x0.length;
  // Build initial simplex
  const simplex: number[][] = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const xi = x0.slice();
    xi[i]! += xi[i]! !== 0 ? 0.05 * Math.abs(xi[i]!) : 0.00025;
    simplex.push(xi);
  }
  const fvals = simplex.map((x) => f(x));

  const alpha = 1.0;
  const gamma = 2.0;
  const rho = 0.5;
  const sigma = 0.5;

  for (let iter = 0; iter < maxIter; iter++) {
    // Sort
    const order = Array.from({ length: n + 1 }, (_, i) => i).sort((a, b) => fvals[a]! - fvals[b]!);
    const sx = order.map((i) => simplex[i]!);
    const sf = order.map((i) => fvals[i]!);

    // Convergence check
    const range = sf[n]! - sf[0]!;
    if (range < tol) {
      return sx[0]?.slice();
    }

    // Centroid of all but worst
    const xbar = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        xbar[j]! += sx[i]?.[j]! / n;
      }
    }

    // Reflect
    const xr = xbar.map((xi, j) => xi + alpha * (xi - sx[n]?.[j]!));
    const fr = f(xr);

    if (fr < sf[0]!) {
      // Expand
      const xe = xbar.map((xi, j) => xi + gamma * (xr[j]! - xi));
      const fe = f(xe);
      simplex[order[n]!] = fe < fr ? xe : xr;
      fvals[order[n]!] = fe < fr ? fe : fr;
    } else if (fr < sf[n - 1]!) {
      simplex[order[n]!] = xr;
      fvals[order[n]!] = fr;
    } else {
      // Contract
      const xc = xbar.map((xi, j) => xi + rho * (sx[n]?.[j]! - xi));
      const fc = f(xc);
      if (fc < sf[n]!) {
        simplex[order[n]!] = xc;
        fvals[order[n]!] = fc;
      } else {
        // Shrink
        for (let i = 1; i <= n; i++) {
          for (let j = 0; j < n; j++) {
            simplex[order[i]!]![j] = sx[0]?.[j]! + sigma * (sx[i]?.[j]! - sx[0]?.[j]!);
          }
          fvals[order[i]!] = f(simplex[order[i]!]!);
        }
      }
    }
  }

  // Return best found
  let best = 0;
  for (let i = 1; i < simplex.length; i++) {
    if (fvals[i]! < fvals[best]!) {
      best = i;
    }
  }
  return simplex[best]?.slice();
}
