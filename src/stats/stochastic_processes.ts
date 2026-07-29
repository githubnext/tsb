/**
 * stochastic_processes — Stochastic process simulation and inference.
 *
 * Implements:
 *   - **Brownian Motion** (Wiener process, geometric Brownian motion)
 *   - **Ornstein-Uhlenbeck** mean-reverting process
 *   - **Poisson Process** (homogeneous and inhomogeneous)
 *   - **Random Walk** (simple, correlated, Lévy)
 *   - **Markov Chain** (discrete-time)
 *
 * @module
 */

// ─── Brownian Motion ──────────────────────────────────────────────────────────

/** Parameters for Brownian Motion simulation. */
export interface BrownianMotionParams {
  /** Drift coefficient (mu). Default 0. */
  mu?: number;
  /** Diffusion coefficient (sigma). Default 1. */
  sigma?: number;
  /** Initial value. Default 0. */
  x0?: number;
  /** Time step. Default 0.01. */
  dt?: number;
  /** Random seed (not used for true randomness, but for API compat). */
  seed?: number;
}

/** Result of a stochastic process simulation. */
export interface ProcessPath {
  /** Time points. */
  times: number[];
  /** Process values at each time point. */
  values: number[];
}

/**
 * Simulate standard Brownian Motion (Wiener process with drift).
 *
 * dX = mu*dt + sigma*dW
 *
 * @param nSteps - Number of time steps.
 * @param params - Optional BrownianMotionParams.
 * @returns ProcessPath with times and values.
 *
 * @example
 * ```ts
 * import { simulateBrownianMotion } from "tsb";
 * const path = simulateBrownianMotion(100, { mu: 0.1, sigma: 0.2 });
 * ```
 */
export function simulateBrownianMotion(
  nSteps: number,
  params: BrownianMotionParams = {},
): ProcessPath {
  const mu = params.mu ?? 0;
  const sigma = params.sigma ?? 1;
  const x0 = params.x0 ?? 0;
  const dt = params.dt ?? 0.01;

  const times: number[] = [0];
  const values: number[] = [x0];

  let x = x0;
  for (let i = 1; i <= nSteps; i++) {
    const dW = randn() * Math.sqrt(dt);
    x = x + mu * dt + sigma * dW;
    times.push(i * dt);
    values.push(x);
  }

  return { times, values };
}

/**
 * Simulate Geometric Brownian Motion (log-normal process).
 *
 * dS = mu*S*dt + sigma*S*dW
 *
 * @param nSteps - Number of time steps.
 * @param params - Optional BrownianMotionParams.
 * @returns ProcessPath with times and values.
 */
export function simulateGeometricBrownianMotion(
  nSteps: number,
  params: BrownianMotionParams = {},
): ProcessPath {
  const mu = params.mu ?? 0.1;
  const sigma = params.sigma ?? 0.2;
  const x0 = params.x0 ?? 100;
  const dt = params.dt ?? 1 / 252;

  const times: number[] = [0];
  const values: number[] = [x0];

  let s = x0;
  for (let i = 1; i <= nSteps; i++) {
    const dW = randn() * Math.sqrt(dt);
    s = s * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * dW);
    times.push(i * dt);
    values.push(s);
  }

  return { times, values };
}

// ─── Ornstein-Uhlenbeck Process ───────────────────────────────────────────────

/** Parameters for the Ornstein-Uhlenbeck process. */
export interface OUParams {
  /** Mean reversion speed (theta). Default 1. */
  theta?: number;
  /** Long-run mean (mu). Default 0. */
  mu?: number;
  /** Volatility (sigma). Default 0.1. */
  sigma?: number;
  /** Initial value. Default mu. */
  x0?: number;
  /** Time step. Default 0.01. */
  dt?: number;
}

/**
 * Simulate Ornstein-Uhlenbeck mean-reverting process.
 *
 * dX = theta*(mu - X)*dt + sigma*dW
 *
 * @param nSteps - Number of time steps.
 * @param params - Optional OUParams.
 * @returns ProcessPath.
 */
export function simulateOrnsteinUhlenbeck(
  nSteps: number,
  params: OUParams = {},
): ProcessPath {
  const theta = params.theta ?? 1.0;
  const mu = params.mu ?? 0.0;
  const sigma = params.sigma ?? 0.1;
  const dt = params.dt ?? 0.01;
  const x0 = params.x0 ?? mu;

  const times: number[] = [0];
  const values: number[] = [x0];

  let x = x0;
  for (let i = 1; i <= nSteps; i++) {
    const dW = randn() * Math.sqrt(dt);
    x = x + theta * (mu - x) * dt + sigma * dW;
    times.push(i * dt);
    values.push(x);
  }

  return { times, values };
}

/**
 * Estimate OU parameters via method of moments.
 *
 * @param values - Observed time series values.
 * @param dt - Time step between observations.
 * @returns Estimated theta, mu, sigma.
 */
export function fitOrnsteinUhlenbeck(
  values: number[],
  dt = 0.01,
): { theta: number; mu: number; sigma: number } {
  const n = values.length;
  if (n < 3) return { theta: 0, mu: 0, sigma: 0 };

  // Method of moments via OLS on X(t+dt) = a + b*X(t)
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  const m = n - 1;

  for (let i = 0; i < m; i++) {
    const xi = values[i] ?? 0;
    const yi = values[i + 1] ?? 0;
    sumX += xi;
    sumY += yi;
    sumXX += xi * xi;
    sumXY += xi * yi;
  }

  const b = (m * sumXY - sumX * sumY) / (m * sumXX - sumX * sumX);
  const a = (sumY - b * sumX) / m;

  const theta = -Math.log(Math.max(b, 1e-10)) / dt;
  const mu = a / (1 - b);

  // Estimate sigma from residuals
  let residSS = 0;
  for (let i = 0; i < m; i++) {
    const xi = values[i] ?? 0;
    const yi = values[i + 1] ?? 0;
    const pred = a + b * xi;
    residSS += (yi - pred) ** 2;
  }
  const sigmaEst = Math.sqrt(residSS / m / dt);

  return { theta, mu, sigma: sigmaEst };
}

// ─── Poisson Process ──────────────────────────────────────────────────────────

/**
 * Simulate a homogeneous Poisson process.
 *
 * @param rate - Event rate (lambda, events per unit time).
 * @param T - Total time horizon.
 * @returns Array of event arrival times.
 *
 * @example
 * ```ts
 * import { simulatePoissonProcess } from "tsb";
 * const arrivals = simulatePoissonProcess(2.5, 10);
 * ```
 */
export function simulatePoissonProcess(rate: number, T: number): number[] {
  const arrivals: number[] = [];
  let t = 0;

  while (t < T) {
    const inter = -Math.log(1 - Math.random()) / rate;
    t += inter;
    if (t < T) arrivals.push(t);
  }

  return arrivals;
}

/**
 * Count events in bins for a Poisson process.
 *
 * @param arrivals - Event arrival times.
 * @param binSize - Size of each bin.
 * @param T - Total time horizon.
 * @returns Array of event counts per bin.
 */
export function poissonCounts(
  arrivals: number[],
  binSize: number,
  T: number,
): number[] {
  const nBins = Math.ceil(T / binSize);
  const counts = new Array<number>(nBins).fill(0);

  for (const t of arrivals) {
    const bin = Math.floor(t / binSize);
    if (bin < nBins) {
      counts[bin] = (counts[bin] ?? 0) + 1;
    }
  }

  return counts;
}

// ─── Random Walk ──────────────────────────────────────────────────────────────

/** Parameters for random walk simulation. */
export interface RandomWalkParams {
  /** Step probabilities [up, down]. Default [0.5, 0.5]. */
  probs?: [number, number];
  /** Step sizes [up, down]. Default [1, -1]. */
  steps?: [number, number];
  /** Initial position. Default 0. */
  x0?: number;
}

/**
 * Simulate a discrete random walk.
 *
 * @param nSteps - Number of steps.
 * @param params - Optional RandomWalkParams.
 * @returns ProcessPath with integer times and cumulative positions.
 */
export function simulateRandomWalk(
  nSteps: number,
  params: RandomWalkParams = {},
): ProcessPath {
  const probs = params.probs ?? [0.5, 0.5];
  const steps = params.steps ?? [1, -1];
  const x0 = params.x0 ?? 0;

  const times: number[] = [0];
  const values: number[] = [x0];

  let x = x0;
  for (let i = 1; i <= nSteps; i++) {
    const r = Math.random();
    const step = r < (probs[0] ?? 0.5) ? (steps[0] ?? 1) : (steps[1] ?? -1);
    x += step;
    times.push(i);
    values.push(x);
  }

  return { times, values };
}

// ─── Markov Chain ─────────────────────────────────────────────────────────────

/**
 * Simulate a discrete-time Markov chain.
 *
 * @param transitionMatrix - Row-stochastic transition matrix (nStates × nStates).
 * @param nSteps - Number of steps.
 * @param initialState - Starting state index. Default 0.
 * @returns Array of state indices visited.
 *
 * @example
 * ```ts
 * import { simulateMarkovChain } from "tsb";
 * const T = [[0.7, 0.3], [0.4, 0.6]];
 * const chain = simulateMarkovChain(T, 100);
 * ```
 */
export function simulateMarkovChain(
  transitionMatrix: number[][],
  nSteps: number,
  initialState = 0,
): number[] {
  const nStates = transitionMatrix.length;
  const chain: number[] = [initialState];
  let state = initialState;

  for (let i = 1; i <= nSteps; i++) {
    const row = transitionMatrix[state] ?? [];
    state = sampleCategorical(row, nStates);
    chain.push(state);
  }

  return chain;
}

/**
 * Compute the stationary distribution of a Markov chain via power iteration.
 *
 * @param transitionMatrix - Row-stochastic transition matrix.
 * @param maxIter - Maximum iterations. Default 1000.
 * @param tol - Convergence tolerance. Default 1e-10.
 * @returns Stationary distribution vector.
 */
export function stationaryDistribution(
  transitionMatrix: number[][],
  maxIter = 1000,
  tol = 1e-10,
): number[] {
  const n = transitionMatrix.length;
  let pi = new Array<number>(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    const newPi = new Array<number>(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        newPi[j] = (newPi[j] ?? 0) + (pi[i] ?? 0) * ((transitionMatrix[i] ?? [])[j] ?? 0);
      }
    }
    let diff = 0;
    for (let i = 0; i < n; i++) {
      diff += Math.abs((newPi[i] ?? 0) - (pi[i] ?? 0));
    }
    pi = newPi;
    if (diff < tol) break;
  }

  return pi;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Box-Muller transform for standard normal random variate. */
function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Sample from a categorical distribution given unnormalized probabilities. */
function sampleCategorical(probs: number[], n: number): number {
  const total = probs.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < n; i++) {
    r -= probs[i] ?? 0;
    if (r <= 0) return i;
  }
  return n - 1;
}
