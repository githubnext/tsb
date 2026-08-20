/**
 * DDIM (Denoising Diffusion Implicit Models) sampler.
 *
 * Implements the deterministic DDIM sampling procedure from Song et al. (2020).
 * Supports both DDIM (η=0, deterministic) and DDPM (η=1, stochastic) sampling.
 *
 * @module
 */

/** Noise schedule type. */
export type NoiseSchedule = "linear" | "cosine" | "sqrt";

/** DDIM sampler configuration. */
export interface DDIMConfig {
  /** Total number of diffusion timesteps used during training. */
  numTrainTimesteps: number;
  /** Noise schedule type. */
  schedule: NoiseSchedule;
  /** Stochasticity parameter (0 = DDIM deterministic, 1 = DDPM stochastic). */
  eta: number;
  /** Beta start for linear schedule. */
  betaStart: number;
  /** Beta end for linear schedule. */
  betaEnd: number;
}

/** Precomputed noise schedule values. */
export interface NoiseScheduleValues {
  /** Betas at each timestep. */
  betas: Float64Array;
  /** Alphas (1 - beta). */
  alphas: Float64Array;
  /** Cumulative product of alphas. */
  alphasCumprod: Float64Array;
  /** Square root of alphasCumprod. */
  sqrtAlphasCumprod: Float64Array;
  /** Square root of (1 - alphasCumprod). */
  sqrtOneMinusAlphasCumprod: Float64Array;
}

/** Compute noise schedule from config. */
export function computeNoiseSchedule(config: DDIMConfig): NoiseScheduleValues {
  const T = config.numTrainTimesteps;
  const betas = new Float64Array(T);
  const alphas = new Float64Array(T);
  const alphasCumprod = new Float64Array(T);
  const sqrtAlphasCumprod = new Float64Array(T);
  const sqrtOneMinusAlphasCumprod = new Float64Array(T);

  if (config.schedule === "linear") {
    const step = (config.betaEnd - config.betaStart) / (T - 1);
    for (let t = 0; t < T; t++) {
      betas[t] = config.betaStart + t * step;
    }
  } else if (config.schedule === "cosine") {
    const s = 0.008;
    const f0 = Math.cos(((0 / T + s) / (1 + s)) * (Math.PI / 2)) ** 2;
    for (let t = 0; t < T; t++) {
      const ft = Math.cos((((t + 1) / T + s) / (1 + s)) * (Math.PI / 2)) ** 2;
      betas[t] = Math.min(1 - ft / f0, 0.999);
    }
  } else {
    // sqrt schedule
    for (let t = 0; t < T; t++) {
      const frac = t / (T - 1);
      betas[t] = config.betaStart + (config.betaEnd - config.betaStart) * Math.sqrt(frac);
    }
  }

  let cumprod = 1.0;
  for (let t = 0; t < T; t++) {
    alphas[t] = 1 - (betas[t] ?? 0);
    cumprod *= alphas[t] ?? 1;
    alphasCumprod[t] = cumprod;
    sqrtAlphasCumprod[t] = Math.sqrt(cumprod);
    sqrtOneMinusAlphasCumprod[t] = Math.sqrt(1 - cumprod);
  }

  return { betas, alphas, alphasCumprod, sqrtAlphasCumprod, sqrtOneMinusAlphasCumprod };
}

/** Add noise to a sample at a given timestep. */
export function addNoise(
  sample: Float64Array,
  noise: Float64Array,
  timestep: number,
  schedule: NoiseScheduleValues,
): Float64Array {
  const sqrtAcp = schedule.sqrtAlphasCumprod[timestep] ?? 0;
  const sqrtOm = schedule.sqrtOneMinusAlphasCumprod[timestep] ?? 0;
  const noisy = new Float64Array(sample.length);
  for (let i = 0; i < sample.length; i++) {
    noisy[i] = sqrtAcp * (sample[i] ?? 0) + sqrtOm * (noise[i] ?? 0);
  }
  return noisy;
}

/** DDIM step: predict x0 from noisy xt and noise prediction. */
export function ddimStep(
  xt: Float64Array,
  noisePred: Float64Array,
  tPrev: number,
  tCurr: number,
  schedule: NoiseScheduleValues,
  eta: number,
): Float64Array {
  const acpCurr = schedule.alphasCumprod[tCurr] ?? 0;
  const acpPrev = tPrev >= 0 ? (schedule.alphasCumprod[tPrev] ?? 0) : 1.0;
  const sqrtAcpCurr = Math.sqrt(acpCurr);
  const sqrtOneMinusAcpCurr = Math.sqrt(1 - acpCurr);
  const sqrtAcpPrev = Math.sqrt(acpPrev);

  const sigmaT =
    eta *
    Math.sqrt(((1 - acpPrev) / (1 - acpCurr)) * (1 - acpCurr / acpPrev));

  const result = new Float64Array(xt.length);
  for (let i = 0; i < xt.length; i++) {
    const xi = xt[i] ?? 0;
    const ni = noisePred[i] ?? 0;
    // Predict x0
    const x0Pred = (xi - sqrtOneMinusAcpCurr * ni) / (sqrtAcpCurr || 1e-8);
    // Direction pointing to xt
    const dirXt = Math.sqrt(Math.max(0, 1 - acpPrev - sigmaT * sigmaT)) * ni;
    result[i] = sqrtAcpPrev * x0Pred + dirXt;
  }
  return result;
}

/** Generate a sequence of timesteps for DDIM inference. */
export function ddimTimesteps(
  numTrainTimesteps: number,
  numInferenceSteps: number,
): number[] {
  const step = Math.floor(numTrainTimesteps / numInferenceSteps);
  const timesteps: number[] = [];
  for (let i = numInferenceSteps - 1; i >= 0; i--) {
    timesteps.push(i * step);
  }
  return timesteps;
}

/** Compute signal-to-noise ratio at timestep t. */
export function snrAtTimestep(t: number, schedule: NoiseScheduleValues): number {
  const acp = schedule.alphasCumprod[t] ?? 0;
  return acp / (1 - acp + 1e-8);
}
