/**
 * information — Information theory functions.
 *
 * Mirrors `scipy.stats.entropy` and related information theory utilities.
 * Implemented from scratch with no external dependencies.
 *
 * Implemented functions:
 * - {@link entropy}                — Shannon entropy / KL divergence
 * - {@link klDivergence}           — Kullback-Leibler divergence D_KL(p‖q)
 * - {@link jsDivergence}           — Jensen-Shannon divergence JSD(p‖q)
 * - {@link jsDistance}             — Jensen-Shannon distance √JSD(p‖q)
 * - {@link crossEntropy}           — Cross-entropy H(p, q)
 * - {@link jointEntropy}           — Joint entropy H(X, Y) from observations
 * - {@link conditionalEntropy}     — Conditional entropy H(X|Y) from observations
 * - {@link mutualInformation}      — Mutual information I(X;Y) from observations
 * - {@link normalizedMI}           — Normalized mutual information NMI(X;Y)
 * - {@link variationOfInformation} — Variation of information VI(X,Y)
 * - {@link renyiEntropy}           — Rényi entropy H_α(X)
 * - {@link tsallisEntropy}         — Tsallis entropy S_q(X)
 *
 * @example
 * ```ts
 * import { entropy, mutualInformation } from "tsb";
 *
 * // Shannon entropy of a fair coin (in bits)
 * entropy([0.5, 0.5], undefined, 2);   // 1.0
 *
 * // Mutual information from paired observations
 * const obs = [["a","x"],["a","y"],["b","x"],["b","y"]] as const;
 * mutualInformation(obs, 2);           // 0.0 (X and Y are independent)
 * ```
 *
 * @module
 */

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * A discrete probability mass function (PMF): an array of non-negative weights.
 * The values need not sum to 1 — they will be normalised internally.
 */
export type PMF = readonly number[];

/**
 * How to normalise mutual information in {@link normalizedMI}.
 *
 * | Method         | Formula                                    |
 * |----------------|--------------------------------------------|
 * | `"arithmetic"` | 2·I(X;Y) / (H(X) + H(Y))                  |
 * | `"geometric"`  | I(X;Y) / √(H(X)·H(Y))                     |
 * | `"min"`        | I(X;Y) / min(H(X), H(Y))                  |
 * | `"max"`        | I(X;Y) / max(H(X), H(Y))                  |
 */
export type NMIMethod = "arithmetic" | "geometric" | "min" | "max";

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Logarithm base-`base` of `x`. If `base` is undefined, returns the natural log. */
function logBase(x: number, base: number | undefined): number {
  if (base === undefined) {
    return Math.log(x);
  }
  return Math.log(x) / Math.log(base);
}

/**
 * Normalise a PMF: filter zeros and divide by the total.
 * Returns an empty array if the total is zero.
 */
function normalisePMF(pk: PMF): number[] {
  const total = pk.reduce((s, v) => s + v, 0);
  if (total <= 0) {
    return [];
  }
  return pk.filter((v) => v > 0).map((v) => v / total);
}

/**
 * Build marginal and joint count maps from an array of observation pairs.
 *
 * Uses `String()` keys to avoid `as` casts on generics while preserving
 * value-equality semantics for common primitive types.
 */
function buildJointCounts<T, U>(
  xy: readonly (readonly [T, U])[],
): {
  xCounts: Map<string, number>;
  yCounts: Map<string, number>;
  jointCounts: Map<string, number>;
  n: number;
} {
  const xCounts = new Map<string, number>();
  const yCounts = new Map<string, number>();
  const jointCounts = new Map<string, number>();
  const n = xy.length;

  for (const pair of xy) {
    const xKey = String(pair[0]);
    const yKey = String(pair[1]);
    const jKey = `${xKey}\0${yKey}`;
    xCounts.set(xKey, (xCounts.get(xKey) ?? 0) + 1);
    yCounts.set(yKey, (yCounts.get(yKey) ?? 0) + 1);
    jointCounts.set(jKey, (jointCounts.get(jKey) ?? 0) + 1);
  }

  return { xCounts, yCounts, jointCounts, n };
}

/** Shannon entropy from a frequency-count Map with total `n`. */
function entropyFromCounts(counts: Map<string, number>, n: number, base: number | undefined): number {
  let h = 0;
  for (const count of counts.values()) {
    const p = count / n;
    h -= p * logBase(p, base);
  }
  return h;
}

// ─── PMF-based functions ──────────────────────────────────────────────────────

/**
 * Shannon entropy H(p) — or, when `qk` is supplied, KL divergence D_KL(p‖q).
 *
 * Mirrors `scipy.stats.entropy(pk, qk=None, base=None)`.
 *
 * - If only `pk` is given: H(p) = −∑ pᵢ log pᵢ.
 * - If `qk` is also given: D_KL(p‖q) = ∑ pᵢ log(pᵢ / qᵢ).
 *
 * Both distributions are normalised before computation.
 * The 0 log 0 = 0 convention is applied (zero entries are skipped).
 * If pᵢ > 0 and qᵢ = 0, the divergence is +∞.
 *
 * @param pk Probability weights (normalised internally).
 * @param qk Optional second distribution; if given, computes KL divergence.
 * @param base Logarithm base. Default is `undefined` (nats). Use `2` for bits, `10` for dits.
 * @returns Entropy ≥ 0, or KL divergence ≥ 0.
 */
export function entropy(pk: PMF, qk?: PMF, base?: number): number {
  const pNorm = normalisePMF(pk);
  if (pNorm.length === 0) {
    return 0;
  }

  if (qk === undefined) {
    // Shannon entropy: H(p) = −∑ pᵢ log pᵢ
    return pNorm.reduce((h, pi) => h - pi * logBase(pi, base), 0);
  }

  // KL divergence: D_KL(p‖q) = ∑ pᵢ log(pᵢ / qᵢ)
  const qTotal = qk.reduce((s, v) => s + v, 0);
  if (qTotal <= 0) {
    throw new RangeError("qk must contain at least one positive entry");
  }
  const pTotal = pk.reduce((s, v) => s + v, 0);

  let kl = 0;
  const len = Math.max(pk.length, qk.length);
  for (let i = 0; i < len; i++) {
    const pi = ((pk[i] ?? 0) / pTotal);
    if (pi <= 0) {
      continue;
    }
    const qi = (qk[i] ?? 0) / qTotal;
    if (qi <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    kl += pi * logBase(pi / qi, base);
  }
  return kl;
}

/**
 * Kullback-Leibler divergence D_KL(p‖q).
 *
 * Equivalent to `entropy(pk, qk, base)` — provided as a named convenience.
 *
 * @param pk Reference distribution P.
 * @param qk Approximation distribution Q.
 * @param base Logarithm base (default: natural log).
 * @returns D_KL(p‖q) ≥ 0. Returns +∞ if any qᵢ = 0 where pᵢ > 0.
 */
export function klDivergence(pk: PMF, qk: PMF, base?: number): number {
  return entropy(pk, qk, base);
}

/**
 * Jensen-Shannon divergence JSD(p‖q).
 *
 * Defined as JSD(p‖q) = ½ D_KL(p‖m) + ½ D_KL(q‖m) where m = (p + q) / 2.
 *
 * JSD is always finite (0 ≤ JSD ≤ log(2) in nats).
 *
 * @param pk First distribution.
 * @param qk Second distribution.
 * @param base Logarithm base (default: natural log).
 * @returns JSD ∈ [0, log(2)] for natural logs, [0, 1] for base-2.
 */
export function jsDivergence(pk: PMF, qk: PMF, base?: number): number {
  const pTotal = pk.reduce((s, v) => s + v, 0);
  const qTotal = qk.reduce((s, v) => s + v, 0);
  if (pTotal <= 0 || qTotal <= 0) {
    return 0;
  }

  const len = Math.max(pk.length, qk.length);
  let jsd = 0;

  for (let i = 0; i < len; i++) {
    const pi = (pk[i] ?? 0) / pTotal;
    const qi = (qk[i] ?? 0) / qTotal;
    const mi = 0.5 * (pi + qi);
    if (mi <= 0) {
      continue;
    }
    if (pi > 0) {
      jsd += 0.5 * pi * logBase(pi / mi, base);
    }
    if (qi > 0) {
      jsd += 0.5 * qi * logBase(qi / mi, base);
    }
  }
  return Math.max(0, jsd);
}

/**
 * Jensen-Shannon distance — the square root of {@link jsDivergence}.
 *
 * Satisfies the triangle inequality and is a proper metric.
 *
 * @param pk First distribution.
 * @param qk Second distribution.
 * @param base Logarithm base (default: natural log).
 * @returns JS distance ∈ [0, 1] for base-2.
 */
export function jsDistance(pk: PMF, qk: PMF, base?: number): number {
  return Math.sqrt(jsDivergence(pk, qk, base));
}

/**
 * Cross-entropy H(p, q) = −∑ pᵢ log qᵢ.
 *
 * Related to KL divergence: H(p, q) = H(p) + D_KL(p‖q).
 *
 * @param pk True distribution P.
 * @param qk Predicted distribution Q.
 * @param base Logarithm base (default: natural log).
 * @returns Cross-entropy ≥ H(p). Returns +∞ if any qᵢ = 0 where pᵢ > 0.
 */
export function crossEntropy(pk: PMF, qk: PMF, base?: number): number {
  const pTotal = pk.reduce((s, v) => s + v, 0);
  const qTotal = qk.reduce((s, v) => s + v, 0);
  if (pTotal <= 0) {
    return 0;
  }
  if (qTotal <= 0) {
    throw new RangeError("qk must contain at least one positive entry");
  }

  let ce = 0;
  const len = Math.max(pk.length, qk.length);
  for (let i = 0; i < len; i++) {
    const pi = (pk[i] ?? 0) / pTotal;
    if (pi <= 0) {
      continue;
    }
    const qi = (qk[i] ?? 0) / qTotal;
    if (qi <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    ce -= pi * logBase(qi, base);
  }
  return ce;
}

/**
 * Rényi entropy H_α(X).
 *
 * H_α(X) = (1 / (1 − α)) · log(∑ pᵢ^α)
 *
 * Special cases:
 * - α → 0: max-entropy = log |support|
 * - α → 1: Shannon entropy (computed as the limit)
 * - α = 2: collision entropy = −log(∑ pᵢ²)
 * - α → ∞: min-entropy = −log(max pᵢ)
 *
 * @param pk Probability weights (normalised internally).
 * @param alpha Order α (must be ≥ 0, ≠ 1).
 * @param base Logarithm base (default: natural log).
 * @returns Rényi entropy ≥ 0.
 */
export function renyiEntropy(pk: PMF, alpha: number, base?: number): number {
  if (alpha < 0) {
    throw new RangeError("alpha must be non-negative");
  }
  const p = normalisePMF(pk);
  if (p.length === 0) {
    return 0;
  }

  // Limit α → 1: Shannon entropy
  if (Math.abs(alpha - 1) < 1e-10) {
    return p.reduce((h, pi) => h - pi * logBase(pi, base), 0);
  }

  // Limit α → 0: log of support size
  if (alpha < 1e-10) {
    return logBase(p.length, base);
  }

  // Limit α → ∞: min-entropy = −log(max pᵢ)
  if (alpha > 1e15) {
    const maxP = p.reduce((m, v) => Math.max(m, v), 0);
    return -logBase(maxP, base);
  }

  const sumPow = p.reduce((s, pi) => s + pi ** alpha, 0);
  return logBase(sumPow, base) / (1 - alpha);
}

/**
 * Tsallis entropy S_q(X).
 *
 * S_q(X) = (1 / (q − 1)) · (1 − ∑ pᵢ^q)
 *
 * Limit q → 1: Shannon entropy (computed as the limit).
 *
 * @param pk Probability weights (normalised internally).
 * @param q Tsallis parameter q (must be > 0, ≠ 1).
 * @param base Logarithm base for the q → 1 Shannon limit (default: natural log).
 * @returns Tsallis entropy ≥ 0.
 */
export function tsallisEntropy(pk: PMF, q: number, base?: number): number {
  if (q <= 0) {
    throw new RangeError("q must be positive");
  }
  const p = normalisePMF(pk);
  if (p.length === 0) {
    return 0;
  }

  // Limit q → 1: Shannon entropy
  if (Math.abs(q - 1) < 1e-10) {
    return p.reduce((h, pi) => h - pi * logBase(pi, base), 0);
  }

  const sumPow = p.reduce((s, pi) => s + pi ** q, 0);
  return (1 - sumPow) / (q - 1);
}

// ─── Observation-based functions ──────────────────────────────────────────────

/**
 * Joint entropy H(X, Y) from paired observations.
 *
 * H(X, Y) = −∑_{x,y} p(x,y) log p(x,y)
 *
 * @param xy Array of [x, y] observation pairs.
 * @param base Logarithm base (default: natural log).
 * @returns Joint entropy ≥ max(H(X), H(Y)).
 */
export function jointEntropy<T, U>(xy: readonly (readonly [T, U])[], base?: number): number {
  if (xy.length === 0) {
    return 0;
  }
  const { jointCounts, n } = buildJointCounts(xy);
  return entropyFromCounts(jointCounts, n, base);
}

/**
 * Conditional entropy H(X|Y) from paired observations.
 *
 * H(X|Y) = H(X, Y) − H(Y)
 *
 * @param xy Array of [x, y] observation pairs.
 * @param base Logarithm base (default: natural log).
 * @returns Conditional entropy ≥ 0.
 */
export function conditionalEntropy<T, U>(
  xy: readonly (readonly [T, U])[],
  base?: number,
): number {
  if (xy.length === 0) {
    return 0;
  }
  const { yCounts, jointCounts, n } = buildJointCounts(xy);
  const hXY = entropyFromCounts(jointCounts, n, base);
  const hY = entropyFromCounts(yCounts, n, base);
  return Math.max(0, hXY - hY);
}

/**
 * Mutual information I(X;Y) from paired observations.
 *
 * I(X;Y) = H(X) + H(Y) − H(X, Y) = H(X) − H(X|Y)
 *
 * @param xy Array of [x, y] observation pairs.
 * @param base Logarithm base (default: natural log).
 * @returns Mutual information ≥ 0.
 */
export function mutualInformation<T, U>(
  xy: readonly (readonly [T, U])[],
  base?: number,
): number {
  if (xy.length === 0) {
    return 0;
  }
  const { xCounts, yCounts, jointCounts, n } = buildJointCounts(xy);
  const hX = entropyFromCounts(xCounts, n, base);
  const hY = entropyFromCounts(yCounts, n, base);
  const hXY = entropyFromCounts(jointCounts, n, base);
  return Math.max(0, hX + hY - hXY);
}

/**
 * Normalized mutual information NMI(X;Y).
 *
 * Scales I(X;Y) to the range [0, 1].
 *
 * @param xy Array of [x, y] observation pairs.
 * @param method Normalization method (default: `"arithmetic"`).
 *   - `"arithmetic"`: 2·I(X;Y) / (H(X) + H(Y))
 *   - `"geometric"`:  I(X;Y) / √(H(X)·H(Y))
 *   - `"min"`:        I(X;Y) / min(H(X), H(Y))
 *   - `"max"`:        I(X;Y) / max(H(X), H(Y))
 * @param base Logarithm base (default: natural log).
 * @returns NMI ∈ [0, 1].
 */
export function normalizedMI<T, U>(
  xy: readonly (readonly [T, U])[],
  method: NMIMethod = "arithmetic",
  base?: number,
): number {
  if (xy.length === 0) {
    return 0;
  }
  const { xCounts, yCounts, jointCounts, n } = buildJointCounts(xy);
  const hX = entropyFromCounts(xCounts, n, base);
  const hY = entropyFromCounts(yCounts, n, base);
  const hXY = entropyFromCounts(jointCounts, n, base);
  const mi = Math.max(0, hX + hY - hXY);

  let denom: number;
  switch (method) {
    case "arithmetic": {
      denom = 0.5 * (hX + hY);
      break;
    }
    case "geometric": {
      denom = Math.sqrt(hX * hY);
      break;
    }
    case "min": {
      denom = Math.min(hX, hY);
      break;
    }
    case "max": {
      denom = Math.max(hX, hY);
      break;
    }
  }

  if (denom <= 0) {
    return 0;
  }
  return Math.min(1, mi / denom);
}

/**
 * Variation of information VI(X, Y).
 *
 * VI(X, Y) = H(X|Y) + H(Y|X) = H(X) + H(Y) − 2·I(X;Y)
 *
 * A metric on the space of partitions. VI = 0 iff X = Y (a.s.).
 *
 * @param xy Array of [x, y] observation pairs.
 * @param base Logarithm base (default: natural log).
 * @returns VI ≥ 0.
 */
export function variationOfInformation<T, U>(
  xy: readonly (readonly [T, U])[],
  base?: number,
): number {
  if (xy.length === 0) {
    return 0;
  }
  const { xCounts, yCounts, jointCounts, n } = buildJointCounts(xy);
  const hX = entropyFromCounts(xCounts, n, base);
  const hY = entropyFromCounts(yCounts, n, base);
  const hXY = entropyFromCounts(jointCounts, n, base);
  const mi = Math.max(0, hX + hY - hXY);
  return Math.max(0, hX + hY - 2 * mi);
}
