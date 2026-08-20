/**
 * hmm — Hidden Markov Model (HMM) with discrete and Gaussian emissions.
 *
 * Implements:
 *   - **Forward-Backward** algorithm (log-space for numerical stability)
 *   - **Baum-Welch** EM parameter estimation
 *   - **Viterbi** algorithm for most-likely state sequence decoding
 *   - **GaussianHMM**: continuous observations with Gaussian emission distributions
 *   - **MultinomialHMM**: discrete observations with categorical emission distributions
 *
 * Mirrors `hmmlearn.hmm.GaussianHMM` and `MultinomialHMM` APIs.
 *
 * @example
 * ```ts
 * import { GaussianHMM } from "tsb";
 *
 * const model = new GaussianHMM({ nComponents: 2, nIter: 100 });
 * const obs = [0.1, 0.2, 0.15, 2.1, 2.3, 2.0, 0.05, 0.1, 2.5, 2.2];
 * model.fit(obs);
 * const states = model.predict(obs);
 * const logProb = model.score(obs);
 * ```
 *
 * @module
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

const LOG_ZERO = Number.NEGATIVE_INFINITY;

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** log(exp(a) + exp(b)) with numerical stability. */
function logSumExp(a: number, b: number): number {
  if (a === LOG_ZERO) {
    return b;
  }
  if (b === LOG_ZERO) {
    return a;
  }
  const m = Math.max(a, b);
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
}

/** Stable log-sum-exp over an array. */
function logSumExpArr(arr: readonly number[]): number {
  let result = LOG_ZERO;
  for (const v of arr) {
    result = logSumExp(result, v);
  }
  return result;
}

/** Safe log (returns LOG_ZERO for non-positive). */
function safeLog(x: number): number {
  return x > 0 ? Math.log(x) : LOG_ZERO;
}

/** Normalise an array in-place so it sums to 1. Returns sum before normalisation. */
function normalise(arr: number[]): number {
  const s = arr.reduce((a, b) => a + b, 0);
  if (s > 0) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = (arr[i] ?? 0) / s;
    }
  }
  return s;
}

// ─── Public types ─────────────────────────────────────────────────────────────

/** Parameters for a Gaussian HMM. */
export interface GaussianHMMParams {
  /** Number of hidden states. */
  nComponents: number;
  /** Maximum EM iterations. Default 100. */
  nIter?: number;
  /** Convergence tolerance on log-likelihood. Default 1e-4. */
  tol?: number;
  /** Random seed for initialisation (unused in deterministic init). */
  randomState?: number;
}

/** Fitted Gaussian HMM result. */
export interface GaussianHMMFit {
  /** Initial state probabilities (shape: nComponents). */
  startProb: number[];
  /** Transition matrix (shape: nComponents × nComponents). Row i → state i, column j → state j. */
  transmat: number[][];
  /** Emission means (shape: nComponents). */
  means: number[];
  /** Emission variances (shape: nComponents). */
  covars: number[];
  /** Log-likelihood of training data at convergence. */
  logProb: number;
  /** Number of EM iterations completed. */
  nIterDone: number;
}

/** Parameters for a Multinomial HMM. */
export interface MultinomialHMMParams {
  /** Number of hidden states. */
  nComponents: number;
  /** Number of distinct observation symbols. */
  nFeatures: number;
  /** Maximum EM iterations. Default 100. */
  nIter?: number;
  /** Convergence tolerance on log-likelihood. Default 1e-4. */
  tol?: number;
}

/** Fitted Multinomial HMM result. */
export interface MultinomialHMMFit {
  /** Initial state probabilities (shape: nComponents). */
  startProb: number[];
  /** Transition matrix (shape: nComponents × nComponents). */
  transmat: number[][];
  /** Emission probability matrix (shape: nComponents × nFeatures). */
  emissionProb: number[][];
  /** Log-likelihood of training data at convergence. */
  logProb: number;
  /** Number of EM iterations completed. */
  nIterDone: number;
}

// ─── Forward-Backward (log-space) ─────────────────────────────────────────────

/**
 * Compute log-forward variables.
 * @param logStartProb - log initial probabilities (nStates)
 * @param logTransmat  - log transition matrix (nStates × nStates)
 * @param logEmit      - log emission probabilities (T × nStates)
 * @returns logAlpha (T × nStates)
 */
function logForward(
  logStartProb: readonly number[],
  logTransmat: readonly (readonly number[])[],
  logEmit: readonly (readonly number[])[],
): number[][] {
  const T = logEmit.length;
  const K = logStartProb.length;
  const logAlpha: number[][] = Array.from({ length: T }, () => new Array<number>(K).fill(LOG_ZERO));

  for (let j = 0; j < K; j++) {
    logAlpha[0]![j] = (logStartProb[j] ?? LOG_ZERO) + (logEmit[0]?.[j] ?? LOG_ZERO);
  }
  for (let t = 1; t < T; t++) {
    for (let j = 0; j < K; j++) {
      let s = LOG_ZERO;
      for (let i = 0; i < K; i++) {
        s = logSumExp(s, (logAlpha[t - 1]?.[i] ?? LOG_ZERO) + (logTransmat[i]?.[j] ?? LOG_ZERO));
      }
      logAlpha[t]![j] = s + (logEmit[t]?.[j] ?? LOG_ZERO);
    }
  }
  return logAlpha;
}

/**
 * Compute log-backward variables.
 * @param logTransmat - log transition matrix (nStates × nStates)
 * @param logEmit     - log emission probabilities (T × nStates)
 * @returns logBeta (T × nStates)
 */
function logBackward(
  logTransmat: readonly (readonly number[])[],
  logEmit: readonly (readonly number[])[],
): number[][] {
  const T = logEmit.length;
  const K = logTransmat.length;
  const logBeta: number[][] = Array.from({ length: T }, () => new Array<number>(K).fill(0));

  for (let t = T - 2; t >= 0; t--) {
    for (let i = 0; i < K; i++) {
      let s = LOG_ZERO;
      for (let j = 0; j < K; j++) {
        s = logSumExp(
          s,
          (logTransmat[i]?.[j] ?? LOG_ZERO) +
            (logEmit[t + 1]?.[j] ?? LOG_ZERO) +
            (logBeta[t + 1]?.[j] ?? 0),
        );
      }
      logBeta[t]![i] = s;
    }
  }
  return logBeta;
}

// ─── Viterbi ──────────────────────────────────────────────────────────────────

/**
 * Viterbi algorithm to find the most-likely state sequence.
 * @returns decoded state sequence (length T)
 */
function viterbi(
  logStartProb: readonly number[],
  logTransmat: readonly (readonly number[])[],
  logEmit: readonly (readonly number[])[],
): number[] {
  const T = logEmit.length;
  const K = logStartProb.length;
  const delta: number[][] = Array.from({ length: T }, () => new Array<number>(K).fill(LOG_ZERO));
  const psi: number[][] = Array.from({ length: T }, () => new Array<number>(K).fill(0));

  for (let j = 0; j < K; j++) {
    delta[0]![j] = (logStartProb[j] ?? LOG_ZERO) + (logEmit[0]?.[j] ?? LOG_ZERO);
  }
  for (let t = 1; t < T; t++) {
    for (let j = 0; j < K; j++) {
      let best = LOG_ZERO;
      let bestI = 0;
      for (let i = 0; i < K; i++) {
        const v = (delta[t - 1]?.[i] ?? LOG_ZERO) + (logTransmat[i]?.[j] ?? LOG_ZERO);
        if (v > best) {
          best = v;
          bestI = i;
        }
      }
      delta[t]![j] = best + (logEmit[t]?.[j] ?? LOG_ZERO);
      psi[t]![j] = bestI;
    }
  }

  // Backtrack
  const path = new Array<number>(T).fill(0);
  let s = 0;
  let best = LOG_ZERO;
  for (let j = 0; j < K; j++) {
    const v = delta[T - 1]?.[j] ?? LOG_ZERO;
    if (v > best) {
      best = v;
      s = j;
    }
  }
  path[T - 1] = s;
  for (let t = T - 2; t >= 0; t--) {
    path[t] = psi[t + 1]?.[path[t + 1] ?? 0] ?? 0;
  }
  return path;
}

// ─── GaussianHMM ──────────────────────────────────────────────────────────────

/** Log probability of x under N(mu, sigma^2). */
function gaussianLogProb(x: number, mu: number, sigma2: number): number {
  if (sigma2 <= 0) {
    return LOG_ZERO;
  }
  return -0.5 * (Math.log(2 * Math.PI * sigma2) + ((x - mu) * (x - mu)) / sigma2);
}

/**
 * Hidden Markov Model with univariate Gaussian emission distributions.
 *
 * Uses Baum-Welch EM for parameter estimation, Viterbi for decoding.
 */
export class GaussianHMM {
  private readonly K: number;
  private readonly nIter: number;
  private readonly tol: number;

  // Parameters (set after fit)
  private _startProb: number[] = [];
  private _transmat: number[][] = [];
  private _means: number[] = [];
  private _covars: number[] = [];
  private _fitted = false;

  constructor(params: GaussianHMMParams) {
    this.K = params.nComponents;
    this.nIter = params.nIter ?? 100;
    this.tol = params.tol ?? 1e-4;
  }

  /** Fit the HMM to a sequence of observations using Baum-Welch EM. */
  fit(obs: readonly number[]): GaussianHMMFit {
    const T = obs.length;
    const K = this.K;
    if (T < 2) {
      throw new Error("Need at least 2 observations");
    }

    // ── Initialise ───────────────────────────────────────────────────────────
    // k-means-style: split sorted observations into K equal buckets
    const sorted = [...obs].sort((a, b) => a - b);
    const means = new Array<number>(K).fill(0);
    const covars = new Array<number>(K).fill(1);
    for (let k = 0; k < K; k++) {
      const lo = Math.floor((k * T) / K);
      const hi = Math.floor(((k + 1) * T) / K);
      const slice = sorted.slice(lo, hi);
      const mu = slice.reduce((a, b) => a + b, 0) / slice.length;
      const v = slice.reduce((a, b) => a + (b - mu) ** 2, 0) / Math.max(slice.length - 1, 1);
      means[k] = mu;
      covars[k] = Math.max(v, 1e-6);
    }

    // Uniform start and transition
    const startProb = new Array<number>(K).fill(1 / K);
    const transmat: number[][] = Array.from({ length: K }, () => new Array<number>(K).fill(1 / K));

    let prevLogProb = Number.NEGATIVE_INFINITY;
    let nIterDone = 0;

    for (let iter = 0; iter < this.nIter; iter++) {
      // ── E-step ─────────────────────────────────────────────────────────────
      const logEmit: number[][] = Array.from({ length: T }, (_, t) =>
        Array.from({ length: K }, (__, k) =>
          gaussianLogProb(obs[t] ?? 0, means[k] ?? 0, covars[k] ?? 1),
        ),
      );

      const logStartProb = startProb.map(safeLog);
      const logTransmat = transmat.map((row) => row.map(safeLog));

      const logAlpha = logForward(logStartProb, logTransmat, logEmit);
      const logBeta = logBackward(logTransmat, logEmit);

      // Log-likelihood
      const logProb = logSumExpArr(logAlpha[T - 1] ?? []);

      if (Math.abs(logProb - prevLogProb) < this.tol) {
        nIterDone = iter + 1;
        break;
      }
      prevLogProb = logProb;
      nIterDone = iter + 1;

      // γ_t(k) = P(z_t = k | obs, θ)  in log space
      const logGamma: number[][] = Array.from({ length: T }, (_, t) => {
        const row = Array.from(
          { length: K },
          (__, k) => (logAlpha[t]?.[k] ?? LOG_ZERO) + (logBeta[t]?.[k] ?? 0),
        );
        const z = logSumExpArr(row);
        return row.map((v) => v - z);
      });

      // ξ_t(i,j) = P(z_t=i, z_{t+1}=j | obs, θ) — sum over t
      const logXiSum: number[][] = Array.from({ length: K }, () =>
        new Array<number>(K).fill(LOG_ZERO),
      );
      for (let t = 0; t < T - 1; t++) {
        for (let i = 0; i < K; i++) {
          for (let j = 0; j < K; j++) {
            const v =
              (logAlpha[t]?.[i] ?? LOG_ZERO) +
              (logTransmat[i]?.[j] ?? LOG_ZERO) +
              (logEmit[t + 1]?.[j] ?? LOG_ZERO) +
              (logBeta[t + 1]?.[j] ?? 0) -
              logProb;
            logXiSum[i]![j] = logSumExp(logXiSum[i]?.[j] ?? LOG_ZERO, v);
          }
        }
      }

      // ── M-step ─────────────────────────────────────────────────────────────
      // Update startProb
      for (let k = 0; k < K; k++) {
        startProb[k] = Math.exp(logGamma[0]?.[k] ?? LOG_ZERO);
      }
      normalise(startProb);

      // Update transmat
      for (let i = 0; i < K; i++) {
        for (let j = 0; j < K; j++) {
          transmat[i]![j] = Math.exp(logXiSum[i]?.[j] ?? LOG_ZERO);
        }
        normalise(transmat[i]!);
      }

      // Update means
      for (let k = 0; k < K; k++) {
        let num = 0;
        let den = 0;
        for (let t = 0; t < T; t++) {
          const g = Math.exp(logGamma[t]?.[k] ?? LOG_ZERO);
          num += g * (obs[t] ?? 0);
          den += g;
        }
        means[k] = den > 0 ? num / den : (means[k] ?? 0);
      }

      // Update covars
      for (let k = 0; k < K; k++) {
        let num = 0;
        let den = 0;
        for (let t = 0; t < T; t++) {
          const g = Math.exp(logGamma[t]?.[k] ?? LOG_ZERO);
          const diff = (obs[t] ?? 0) - (means[k] ?? 0);
          num += g * diff * diff;
          den += g;
        }
        covars[k] = Math.max(den > 0 ? num / den : (covars[k] ?? 1), 1e-6);
      }
    }

    this._startProb = [...startProb];
    this._transmat = transmat.map((row) => [...row]);
    this._means = [...means];
    this._covars = [...covars];
    this._fitted = true;

    return {
      startProb: [...startProb],
      transmat: transmat.map((row) => [...row]),
      means: [...means],
      covars: [...covars],
      logProb: prevLogProb,
      nIterDone,
    };
  }

  /** Decode the most-likely state sequence using the Viterbi algorithm. */
  predict(obs: readonly number[]): number[] {
    this._checkFitted();
    const K = this.K;
    const logEmit = obs.map((x) =>
      Array.from({ length: K }, (_, k) =>
        gaussianLogProb(x, this._means[k] ?? 0, this._covars[k] ?? 1),
      ),
    );
    return viterbi(
      this._startProb.map(safeLog),
      this._transmat.map((row) => row.map(safeLog)),
      logEmit,
    );
  }

  /** Compute the log-probability of the observation sequence. */
  score(obs: readonly number[]): number {
    this._checkFitted();
    const K = this.K;
    const logEmit = obs.map((x) =>
      Array.from({ length: K }, (_, k) =>
        gaussianLogProb(x, this._means[k] ?? 0, this._covars[k] ?? 1),
      ),
    );
    const logAlpha = logForward(
      this._startProb.map(safeLog),
      this._transmat.map((row) => row.map(safeLog)),
      logEmit,
    );
    return logSumExpArr(logAlpha.at(-1) ?? []);
  }

  /** Compute posterior state probabilities (T × nComponents). */
  predictProba(obs: readonly number[]): number[][] {
    this._checkFitted();
    const K = this.K;
    const T = obs.length;
    const logEmit = obs.map((x) =>
      Array.from({ length: K }, (_, k) =>
        gaussianLogProb(x, this._means[k] ?? 0, this._covars[k] ?? 1),
      ),
    );
    const logStartProb = this._startProb.map(safeLog);
    const logTransmat = this._transmat.map((row) => row.map(safeLog));
    const logAlpha = logForward(logStartProb, logTransmat, logEmit);
    const logBeta = logBackward(logTransmat, logEmit);
    return Array.from({ length: T }, (_, t) => {
      const row = Array.from(
        { length: K },
        (__, k) => (logAlpha[t]?.[k] ?? LOG_ZERO) + (logBeta[t]?.[k] ?? 0),
      );
      const z = logSumExpArr(row);
      return row.map((v) => Math.exp(v - z));
    });
  }

  /** Sample a sequence of states and observations. */
  sample(length: number): { states: number[]; obs: number[] } {
    this._checkFitted();
    const K = this.K;
    const states: number[] = [];
    const obs: number[] = [];

    // Sample initial state
    let cumProb = 0;
    const r0 = Math.random();
    let state = K - 1;
    for (let k = 0; k < K; k++) {
      cumProb += this._startProb[k] ?? 0;
      if (r0 < cumProb) {
        state = k;
        break;
      }
    }

    for (let t = 0; t < length; t++) {
      states.push(state);
      const mu = this._means[state] ?? 0;
      const sigma = Math.sqrt(this._covars[state] ?? 1);
      // Box-Muller for Gaussian sample
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-15))) * Math.cos(2 * Math.PI * u2);
      obs.push(mu + sigma * z);

      // Transition
      const row = this._transmat[state]!;
      let cum = 0;
      const rv = Math.random();
      let nextState = K - 1;
      for (let k = 0; k < K; k++) {
        cum += row[k] ?? 0;
        if (rv < cum) {
          nextState = k;
          break;
        }
      }
      state = nextState;
    }
    return { states, obs };
  }

  get startProb(): number[] {
    this._checkFitted();
    return [...this._startProb];
  }
  get transmat(): number[][] {
    this._checkFitted();
    return this._transmat.map((r) => [...r]);
  }
  get means(): number[] {
    this._checkFitted();
    return [...this._means];
  }
  get covars(): number[] {
    this._checkFitted();
    return [...this._covars];
  }

  private _checkFitted(): void {
    if (!this._fitted) {
      throw new Error("GaussianHMM is not fitted yet");
    }
  }
}

// ─── MultinomialHMM ───────────────────────────────────────────────────────────

/**
 * Hidden Markov Model with discrete (multinomial/categorical) emission distributions.
 *
 * Observations are non-negative integer symbol indices in [0, nFeatures).
 */
export class MultinomialHMM {
  private readonly K: number;
  private readonly nFeatures: number;
  private readonly nIter: number;
  private readonly tol: number;

  private _startProb: number[] = [];
  private _transmat: number[][] = [];
  private _emissionProb: number[][] = [];
  private _fitted = false;

  constructor(params: MultinomialHMMParams) {
    this.K = params.nComponents;
    this.nFeatures = params.nFeatures;
    this.nIter = params.nIter ?? 100;
    this.tol = params.tol ?? 1e-4;
  }

  /** Fit the HMM to a sequence of integer observations using Baum-Welch EM. */
  fit(obs: readonly number[]): MultinomialHMMFit {
    const T = obs.length;
    const K = this.K;
    const V = this.nFeatures;
    if (T < 2) {
      throw new Error("Need at least 2 observations");
    }

    // Uniform initialisation with small random perturbation
    const startProb = new Array<number>(K).fill(1 / K);
    const transmat: number[][] = Array.from({ length: K }, () =>
      Array.from({ length: K }, () => 1 / K + (Math.random() * 0.1 - 0.05) / K),
    );
    const emissionProb: number[][] = Array.from({ length: K }, () =>
      Array.from({ length: V }, () => 1 / V + (Math.random() * 0.1 - 0.05) / V),
    );
    // Normalise
    for (let k = 0; k < K; k++) {
      normalise(transmat[k]!);
      normalise(emissionProb[k]!);
    }

    let prevLogProb = Number.NEGATIVE_INFINITY;
    let nIterDone = 0;

    for (let iter = 0; iter < this.nIter; iter++) {
      // Log-emission: logEmit[t][k] = log P(obs[t] | z_t = k)
      const logEmit: number[][] = Array.from({ length: T }, (_, t) =>
        Array.from({ length: K }, (__, k) => safeLog(emissionProb[k]?.[obs[t] ?? 0] ?? 0)),
      );

      const logStartProb = startProb.map(safeLog);
      const logTransmat = transmat.map((row) => row.map(safeLog));

      const logAlpha = logForward(logStartProb, logTransmat, logEmit);
      const logBeta = logBackward(logTransmat, logEmit);

      const logProb = logSumExpArr(logAlpha[T - 1] ?? []);
      if (Math.abs(logProb - prevLogProb) < this.tol) {
        nIterDone = iter + 1;
        break;
      }
      prevLogProb = logProb;
      nIterDone = iter + 1;

      // γ_t(k)
      const logGamma: number[][] = Array.from({ length: T }, (_, t) => {
        const row = Array.from(
          { length: K },
          (__, k) => (logAlpha[t]?.[k] ?? LOG_ZERO) + (logBeta[t]?.[k] ?? 0),
        );
        const z = logSumExpArr(row);
        return row.map((v) => v - z);
      });

      // ξ sum
      const logXiSum: number[][] = Array.from({ length: K }, () =>
        new Array<number>(K).fill(LOG_ZERO),
      );
      for (let t = 0; t < T - 1; t++) {
        for (let i = 0; i < K; i++) {
          for (let j = 0; j < K; j++) {
            const v =
              (logAlpha[t]?.[i] ?? LOG_ZERO) +
              (logTransmat[i]?.[j] ?? LOG_ZERO) +
              (logEmit[t + 1]?.[j] ?? LOG_ZERO) +
              (logBeta[t + 1]?.[j] ?? 0) -
              logProb;
            logXiSum[i]![j] = logSumExp(logXiSum[i]?.[j] ?? LOG_ZERO, v);
          }
        }
      }

      // M-step: startProb
      for (let k = 0; k < K; k++) {
        startProb[k] = Math.exp(logGamma[0]?.[k] ?? LOG_ZERO);
      }
      normalise(startProb);

      // transmat
      for (let i = 0; i < K; i++) {
        for (let j = 0; j < K; j++) {
          transmat[i]![j] = Math.exp(logXiSum[i]?.[j] ?? LOG_ZERO);
        }
        normalise(transmat[i]!);
      }

      // emissionProb
      for (let k = 0; k < K; k++) {
        for (let v = 0; v < V; v++) {
          emissionProb[k]![v] = 0;
        }
        for (let t = 0; t < T; t++) {
          const sym = obs[t] ?? 0;
          emissionProb[k]![sym] =
            (emissionProb[k]?.[sym] ?? 0) + Math.exp(logGamma[t]?.[k] ?? LOG_ZERO);
        }
        normalise(emissionProb[k]!);
      }
    }

    this._startProb = [...startProb];
    this._transmat = transmat.map((row) => [...row]);
    this._emissionProb = emissionProb.map((row) => [...row]);
    this._fitted = true;

    return {
      startProb: [...startProb],
      transmat: transmat.map((row) => [...row]),
      emissionProb: emissionProb.map((row) => [...row]),
      logProb: prevLogProb,
      nIterDone,
    };
  }

  /** Decode the most-likely state sequence. */
  predict(obs: readonly number[]): number[] {
    this._checkFitted();
    const K = this.K;
    const logEmit = obs.map((sym) =>
      Array.from({ length: K }, (_, k) => safeLog(this._emissionProb[k]?.[sym] ?? 0)),
    );
    return viterbi(
      this._startProb.map(safeLog),
      this._transmat.map((row) => row.map(safeLog)),
      logEmit,
    );
  }

  /** Compute log-probability of the observation sequence. */
  score(obs: readonly number[]): number {
    this._checkFitted();
    const K = this.K;
    const logEmit = obs.map((sym) =>
      Array.from({ length: K }, (_, k) => safeLog(this._emissionProb[k]?.[sym] ?? 0)),
    );
    const logAlpha = logForward(
      this._startProb.map(safeLog),
      this._transmat.map((row) => row.map(safeLog)),
      logEmit,
    );
    return logSumExpArr(logAlpha.at(-1) ?? []);
  }

  get startProb(): number[] {
    this._checkFitted();
    return [...this._startProb];
  }
  get transmat(): number[][] {
    this._checkFitted();
    return this._transmat.map((r) => [...r]);
  }
  get emissionProb(): number[][] {
    this._checkFitted();
    return this._emissionProb.map((r) => [...r]);
  }

  private _checkFitted(): void {
    if (!this._fitted) {
      throw new Error("MultinomialHMM is not fitted yet");
    }
  }
}

// ─── Standalone functions ──────────────────────────────────────────────────────

/**
 * Convenience function: fit a GaussianHMM and return the fitted model.
 *
 * @example
 * ```ts
 * const model = fitGaussianHMM([0.1, 0.2, 2.1, 2.3, 0.05, 2.5], 2);
 * ```
 */
export function fitGaussianHMM(
  obs: readonly number[],
  nComponents: number,
  nIter = 100,
): GaussianHMM {
  const model = new GaussianHMM({ nComponents, nIter });
  model.fit(obs);
  return model;
}

/**
 * Convenience function: Viterbi decoding with explicit parameters (no fitting).
 *
 * @param startProb   - Initial state probabilities (length K).
 * @param transmat    - Transition matrix (K × K).
 * @param emissionProb - Emission probabilities (K × V).
 * @param obs         - Integer observation sequence.
 * @returns Most-likely state sequence.
 */
export function hmmViterbi(
  startProb: readonly number[],
  transmat: readonly (readonly number[])[],
  emissionProb: readonly (readonly number[])[],
  obs: readonly number[],
): number[] {
  const K = startProb.length;
  const logEmit = obs.map((sym) =>
    Array.from({ length: K }, (_, k) => safeLog(emissionProb[k]?.[sym] ?? 0)),
  );
  return viterbi(
    startProb.map(safeLog),
    transmat.map((row) => [...row].map(safeLog)),
    logEmit,
  );
}
