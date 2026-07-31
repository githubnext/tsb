/**
 * Consistency Models: fast single-step generative models.
 *
 * Implements the Consistency Model framework (Song et al., 2023) including:
 * the consistency function, consistency training loss, and
 * few-step sampling procedures.
 *
 * @module
 */

/** Consistency model configuration. */
export interface ConsistencyConfig {
  /** Total training time horizon T. */
  T: number;
  /** Initial discretization timestep (epsilon). */
  epsilon: number;
  /** Number of discretization steps N. */
  N: number;
  /** EMA decay rate for teacher model. */
  emaDecay: number;
  /** Karras noise schedule rho. */
  rho: number;
  /** Loss weighting parameter mu. */
  mu: number;
}

/** Default consistency model configuration. */
export const DEFAULT_CONSISTENCY_CONFIG: ConsistencyConfig = {
  T: 80,
  epsilon: 0.002,
  N: 150,
  emaDecay: 0.99,
  rho: 7,
  mu: 0.95,
};

/** Karras et al. noise schedule: sigma_i for step i in [0, N]. */
export function karrasNoiseLevels(config: ConsistencyConfig): Float64Array {
  const { T, epsilon, N, rho } = config;
  const levels = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const frac = i / N;
    levels[i] =
      (epsilon ** (1 / rho) + frac * (T ** (1 / rho) - epsilon ** (1 / rho))) ** rho;
  }
  return levels;
}

/** Skip function c_skip(sigma): scaling for input. */
export function cSkip(sigma: number, sigmaData: number = 0.5): number {
  return sigmaData * sigmaData / (sigma * sigma + sigmaData * sigmaData);
}

/** Output function c_out(sigma): scaling for network output. */
export function cOut(sigma: number, sigmaData: number = 0.5): number {
  return (sigma * sigmaData) / Math.sqrt(sigma * sigma + sigmaData * sigmaData);
}

/** Input scaling c_in(sigma). */
export function cIn(sigma: number, sigmaData: number = 0.5): number {
  return 1 / Math.sqrt(sigma * sigma + sigmaData * sigmaData);
}

/** Noise conditioning c_noise(sigma): log encoding. */
export function cNoise(sigma: number): number {
  return Math.log(sigma) / 4;
}

/**
 * Consistency function: maps any (x_t, t) to a consistent estimate of x_0.
 * Uses the preconditioning scheme from Karras et al.
 *
 * @param xt - Noisy sample at noise level sigma
 * @param sigma - Current noise level
 * @param fTheta - Network output F_theta(c_in * x, c_noise)
 * @param sigmaData - Data standard deviation
 */
export function consistencyFunction(
  xt: Float64Array,
  sigma: number,
  fTheta: Float64Array,
  sigmaData: number = 0.5,
): Float64Array {
  const skip = cSkip(sigma, sigmaData);
  const out = cOut(sigma, sigmaData);
  const result = new Float64Array(xt.length);
  for (let i = 0; i < xt.length; i++) {
    result[i] = skip * (xt[i] ?? 0) + out * (fTheta[i] ?? 0);
  }
  return result;
}

/** Compute preconditioning-scaled input for the network. */
export function preconditionInput(x: Float64Array, sigma: number, sigmaData: number = 0.5): Float64Array {
  const scale = cIn(sigma, sigmaData);
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = scale * (x[i] ?? 0);
  return out;
}

/** Pseudo-Huber loss (smooth L1-like). */
export function pseudoHuberLoss(a: Float64Array, b: Float64Array, c: number = 0.00054): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    total += Math.sqrt(d * d + c * c) - c;
  }
  return total / a.length;
}

/**
 * Consistency Training (CT) loss for a single sample pair.
 *
 * @param studentOutput - Consistency function output at t_{n+1}
 * @param teacherOutput - EMA consistency function output at t_n (stop gradient)
 * @param sigmaN - Noise level at step n
 * @param sigmaNp1 - Noise level at step n+1
 */
export function consistencyTrainingLoss(
  studentOutput: Float64Array,
  teacherOutput: Float64Array,
  sigmaN: number,
  sigmaNp1: number,
): number {
  const weight = 1 / Math.max(sigmaNp1 - sigmaN, 1e-8);
  return weight * pseudoHuberLoss(studentOutput, teacherOutput);
}

/** Add noise to a sample: x_t = x_0 + sigma * epsilon. */
export function addGaussianNoise(
  x0: Float64Array,
  sigma: number,
  noise: Float64Array,
): Float64Array {
  const out = new Float64Array(x0.length);
  for (let i = 0; i < x0.length; i++) {
    out[i] = (x0[i] ?? 0) + sigma * (noise[i] ?? 0);
  }
  return out;
}

/** Single-step consistency model sampling from noise. */
export function consistencySampleOneStep(
  noise: Float64Array,
  T: number,
  consistencyFn: (x: Float64Array, sigma: number) => Float64Array,
): Float64Array {
  return consistencyFn(noise, T);
}

/** Multi-step consistency model sampling (improves quality). */
export function consistencySampleMultiStep(
  noise: Float64Array,
  sigmaLevels: number[],
  consistencyFn: (x: Float64Array, sigma: number) => Float64Array,
  noiseFn: (shape: number) => Float64Array,
): Float64Array {
  if (sigmaLevels.length === 0) return noise;
  let x = consistencyFn(noise, sigmaLevels[0] ?? 1);
  for (let i = 1; i < sigmaLevels.length; i++) {
    const sigma = sigmaLevels[i] ?? 0;
    if (sigma <= 0) break;
    // Add noise and re-denoise
    const eps = noiseFn(x.length);
    const xNoisy = addGaussianNoise(x, sigma, eps);
    x = consistencyFn(xNoisy, sigma);
  }
  return x;
}

/** Update EMA teacher model weights. */
export function updateEMAWeights(
  teacherWeights: Float64Array,
  studentWeights: Float64Array,
  decay: number,
): Float64Array {
  const out = new Float64Array(teacherWeights.length);
  for (let i = 0; i < teacherWeights.length; i++) {
    out[i] = decay * (teacherWeights[i] ?? 0) + (1 - decay) * (studentWeights[i] ?? 0);
  }
  return out;
}

/** Compute adaptive EMA decay for consistency distillation. */
export function adaptiveEMADecay(iteration: number, mu0: number = 0.95, s0: number = 10): number {
  return Math.exp(s0 * Math.log(mu0) / Math.max(iteration, 1));
}
