/**
 * contingency — association and effect-size measures for contingency tables.
 *
 * Mirrors `scipy.stats.contingency.*`:
 * - {@link expectedFreq}  — expected cell frequencies under independence
 * - {@link relativeRisk}  — relative risk (risk ratio) with confidence interval
 * - {@link oddsRatio}     — odds ratio with confidence interval
 * - {@link association}   — strength of association (Cramér's V, phi, C, T)
 *
 * @module
 */

import { chi2Contingency } from "./hypothesis_tests.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** A 2-D contingency table: rows × columns of non-negative integer counts. */
export type ContingencyTable = readonly (readonly number[])[];

/**
 * Association measure method for {@link association}.
 *
 * | Method          | Formula                          | Notes            |
 * |-----------------|----------------------------------|------------------|
 * | `"cramer"`      | √(χ²/n / min(r−1,c−1))           | 0..1, default    |
 * | `"phi"`         | √(χ²/n)                          | 2×2 only         |
 * | `"contingency"` | √(χ²/(χ²+n))                     | Pearson's C      |
 * | `"tschuprow"`   | √(χ²/(n·√((r−1)(c−1))))          | best for squares |
 */
export type AssociationMethod = "cramer" | "phi" | "contingency" | "tschuprow";

/** Confidence interval bounds. */
export interface ConfidenceInterval {
  /** Lower bound of the confidence interval. */
  readonly low: number;
  /** Upper bound of the confidence interval. */
  readonly high: number;
}

/**
 * Result of {@link relativeRisk}.
 *
 * Mirrors `scipy.stats.contingency.RelativeRisk`.
 */
export interface RelativeRiskResult {
  /**
   * Relative risk (risk ratio): risk in row 0 / risk in row 1.
   * `RR = (a / (a+b)) / (c / (c+d))` for a 2×2 table `[[a,b],[c,d]]`.
   */
  readonly relativeRisk: number;
  /**
   * Returns a confidence interval for the relative risk.
   *
   * Uses the log-normal method:
   * `CI = RR × exp(± z × SE(ln RR))` where
   * `SE(ln RR) = √(b/(a(a+b)) + d/(c(c+d)))`.
   *
   * Returns `{ low: NaN, high: NaN }` when `a = 0` or `c = 0`.
   *
   * @param confidenceLevel  Coverage probability in (0, 1). Default `0.95`.
   */
  readonly confidenceInterval: (confidenceLevel?: number) => ConfidenceInterval;
}

/**
 * Result of {@link oddsRatio}.
 *
 * Mirrors `scipy.stats.contingency.OddsRatio`.
 */
export interface OddsRatioResult {
  /**
   * Sample odds ratio: `(a × d) / (b × c)` for a 2×2 table `[[a,b],[c,d]]`.
   *
   * Returns `Infinity` when `b = 0` or `c = 0` (with `a, d > 0`).
   * Returns `NaN` when the ratio is `0/0`.
   */
  readonly statistic: number;
  /**
   * Returns a confidence interval for the odds ratio.
   *
   * Uses the Woolf (log-normal) method:
   * `CI = exp(ln(OR) ± z × √(1/a + 1/b + 1/c + 1/d))`.
   *
   * Returns `{ low: NaN, high: NaN }` when any cell is zero.
   *
   * @param confidenceLevel  Coverage probability in (0, 1). Default `0.95`.
   */
  readonly confidenceInterval: (confidenceLevel?: number) => ConfidenceInterval;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/**
 * Standard-normal quantile function (inverse CDF).
 *
 * Uses Peter Acklam's rational-approximation algorithm, accurate to ~1.15e-9.
 */
function normalQuantile(p: number): number {
  if (p <= 0) {
    return Number.NEGATIVE_INFINITY;
  }
  if (p >= 1) {
    return Number.POSITIVE_INFINITY;
  }
  // Rational approximation coefficients (Acklam 2003)
  const a0 = -3.969683028665376e1;
  const a1 = 2.209460984245205e2;
  const a2 = -2.759285104469687e2;
  const a3 = 1.38357751867269e2;
  const a4 = -3.066479806614716e1;
  const a5 = 2.506628277459239;
  const b0 = -5.447609879822406e1;
  const b1 = 1.615858368580409e2;
  const b2 = -1.556989798598866e2;
  const b3 = 6.680131188771972e1;
  const b4 = -1.328068155288572e1;
  const c0 = -7.784894002430293e-3;
  const c1 = -3.223964580411365e-1;
  const c2 = -2.400758277161838;
  const c3 = -2.549732539343734;
  const c4 = 4.374664141464968;
  const c5 = 2.938163982698783;
  const d0 = 7.784695709041462e-3;
  const d1 = 3.224671290700398e-1;
  const d2 = 2.445134137142996;
  const d3 = 3.754408661907416;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (pLow <= p && p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    const num = (((((a0 * r + a1) * r + a2) * r + a3) * r + a4) * r + a5) * q;
    const den = ((((b0 * r + b1) * r + b2) * r + b3) * r + b4) * r + 1;
    return num / den;
  }
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    const num = ((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5;
    const den = (((d0 * q + d1) * q + d2) * q + d3) * q + 1;
    return num / den;
  }
  // pHigh < p < 1
  const q = Math.sqrt(-2 * Math.log(1 - p));
  const num = ((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5;
  const den = (((d0 * q + d1) * q + d2) * q + d3) * q + 1;
  return -(num / den);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Expected cell frequencies under the null hypothesis of independence.
 *
 * For each cell `(i, j)`:
 * ```
 * E[i,j] = rowTotal[i] × colTotal[j] / grandTotal
 * ```
 * Mirrors `scipy.stats.contingency.expected_freq(observed)`.
 *
 * @param observed  2-D array of observed cell counts (all non-negative).
 * @returns         Same shape as `observed` with expected frequencies.
 *
 * @example
 * ```ts
 * expectedFreq([[10, 10], [15, 15], [5, 10]]);
 * // → [[6.67, 13.33], [10.0, 20.0], [3.33, 6.67]]  (approx)
 * ```
 */
export function expectedFreq(observed: ContingencyTable): readonly (readonly number[])[] {
  const rows = observed.length;
  if (rows === 0) {
    return [];
  }
  const cols = (observed[0] as readonly number[]).length;
  if (cols === 0) {
    return Array.from({ length: rows }, () => []);
  }
  const rowTotals = observed.map((row) => row.reduce((s, v) => s + v, 0));
  const colTotals: number[] = Array.from({ length: cols }, (_, c) => {
    let s = 0;
    for (let r = 0; r < rows; r++) {
      s += (observed[r] as readonly number[])[c] as number;
    }
    return s;
  });
  const grand = rowTotals.reduce((s, v) => s + v, 0);
  if (grand === 0) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  }
  return Array.from({ length: rows }, (_, r) =>
    Array.from(
      { length: cols },
      (__, c) => ((rowTotals[r] as number) * (colTotals[c] as number)) / grand,
    ),
  );
}

/**
 * Relative risk (risk ratio) for a 2×2 contingency table.
 *
 * For a table `[[a, b], [c, d]]`:
 * - Risk in row 0: `p₁ = a / (a + b)`
 * - Risk in row 1: `p₂ = c / (c + d)`
 * - Relative risk: `RR = p₁ / p₂`
 *
 * Confidence interval uses the log-normal method:
 * `SE(ln RR) = √(b/(a(a+b)) + d/(c(c+d)))`
 *
 * Mirrors `scipy.stats.contingency.relative_risk(...)`.
 *
 * @param observed  A 2×2 contingency table `[[a, b], [c, d]]`.
 * @throws {RangeError}  If the table is not 2×2.
 *
 * @example
 * ```ts
 * const r = relativeRisk([[90, 9910], [30, 9970]]);
 * console.log(r.relativeRisk.toFixed(3));   // "3.015"
 * const ci = r.confidenceInterval(0.95);
 * console.log(ci.low.toFixed(2), ci.high.toFixed(2));
 * ```
 */
export function relativeRisk(observed: ContingencyTable): RelativeRiskResult {
  if (observed.length !== 2) {
    throw new RangeError("relativeRisk requires a 2×2 contingency table");
  }
  const row0 = observed[0] as readonly number[];
  const row1 = observed[1] as readonly number[];
  if (row0.length !== 2 || row1.length !== 2) {
    throw new RangeError("relativeRisk requires a 2×2 contingency table");
  }
  const a = row0[0] as number;
  const b = row0[1] as number;
  const c = row1[0] as number;
  const d = row1[1] as number;
  const n1 = a + b;
  const n2 = c + d;
  const p1 = n1 > 0 ? a / n1 : Number.NaN;
  const p2 = n2 > 0 ? c / n2 : Number.NaN;
  // Compute RR without division-by-zero
  let rr: number;
  if (p2 > 0) {
    rr = p1 / p2;
  } else {
    rr = p1 === 0 ? 1 : Number.POSITIVE_INFINITY;
  }
  return {
    relativeRisk: rr,
    confidenceInterval: (confidenceLevel = 0.95): ConfidenceInterval => {
      const alpha = 1 - confidenceLevel;
      const z = normalQuantile(1 - alpha / 2);
      if (!(a > 0) || !(c > 0) || !(n1 > 0) || !(n2 > 0)) {
        return { low: Number.NaN, high: Number.NaN };
      }
      const seLnRR = Math.sqrt(b / (a * n1) + d / (c * n2));
      const lnRR = Math.log(rr);
      return {
        low: Math.exp(lnRR - z * seLnRR),
        high: Math.exp(lnRR + z * seLnRR),
      };
    },
  };
}

/**
 * Odds ratio for a 2×2 contingency table.
 *
 * For a table `[[a, b], [c, d]]`:
 * ```
 * OR = (a × d) / (b × c)
 * ```
 * Confidence interval via the Woolf (log-normal) method:
 * ```
 * CI = exp(ln(OR) ± z × √(1/a + 1/b + 1/c + 1/d))
 * ```
 * Mirrors `scipy.stats.contingency.odds_ratio(...)`.
 *
 * @param observed  A 2×2 contingency table `[[a, b], [c, d]]`.
 * @throws {RangeError}  If the table is not 2×2.
 *
 * @example
 * ```ts
 * const or = oddsRatio([[2, 10], [3, 20]]);
 * console.log(or.statistic.toFixed(4));   // "1.3333"
 * const ci = or.confidenceInterval(0.95);
 * console.log(ci.low.toFixed(4), ci.high.toFixed(4));
 * ```
 */
export function oddsRatio(observed: ContingencyTable): OddsRatioResult {
  if (observed.length !== 2) {
    throw new RangeError("oddsRatio requires a 2×2 contingency table");
  }
  const row0 = observed[0] as readonly number[];
  const row1 = observed[1] as readonly number[];
  if (row0.length !== 2 || row1.length !== 2) {
    throw new RangeError("oddsRatio requires a 2×2 contingency table");
  }
  const a = row0[0] as number;
  const b = row0[1] as number;
  const c = row1[0] as number;
  const d = row1[1] as number;
  let stat: number;
  if (b === 0 || c === 0) {
    stat = a > 0 && d > 0 ? Number.POSITIVE_INFINITY : Number.NaN;
  } else {
    stat = (a * d) / (b * c);
  }
  return {
    statistic: stat,
    confidenceInterval: (confidenceLevel = 0.95): ConfidenceInterval => {
      const alpha = 1 - confidenceLevel;
      const z = normalQuantile(1 - alpha / 2);
      if (!(a > 0) || !(b > 0) || !(c > 0) || !(d > 0)) {
        return { low: Number.NaN, high: Number.NaN };
      }
      const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
      const lnOR = Math.log(stat);
      return {
        low: Math.exp(lnOR - z * se),
        high: Math.exp(lnOR + z * se),
      };
    },
  };
}

/**
 * Strength of association between row and column variables in a contingency table.
 *
 * Computed from the chi-square statistic χ² and table dimensions (r × c).
 *
 * | Method          | Formula                          | Range  |
 * |-----------------|----------------------------------|--------|
 * | `"cramer"`      | √(χ²/(n·min(r−1,c−1)))           | [0, 1] |
 * | `"phi"`         | √(χ²/n)                          | [0, ∞) |
 * | `"contingency"` | √(χ²/(χ²+n))                     | [0, 1) |
 * | `"tschuprow"`   | √(χ²/(n·√((r−1)(c−1))))          | [0, 1] |
 *
 * Mirrors `scipy.stats.contingency.association(observed, method=...)`.
 *
 * @param observed  2-D array of observed counts.
 * @param method    Association measure. Default `"cramer"`.
 * @returns         Association coefficient, or `NaN` for degenerate inputs.
 *
 * @example
 * ```ts
 * // Cramér's V for a 2×2 table
 * const v = association([[10, 2], [3, 8]]);
 *
 * // Phi coefficient (2×2 only)
 * const phi = association([[10, 2], [3, 8]], "phi");
 *
 * // Pearson's contingency coefficient
 * const cc = association([[10, 2, 5], [3, 8, 7]], "contingency");
 * ```
 */
export function association(
  observed: ContingencyTable,
  method: AssociationMethod = "cramer",
): number {
  const rows = observed.length;
  if (rows === 0) {
    return Number.NaN;
  }
  const cols = (observed[0] as readonly number[]).length;
  if (cols === 0) {
    return Number.NaN;
  }
  const result = chi2Contingency(observed);
  const chi2 = result.statistic;
  const n = observed.reduce((s, row) => s + row.reduce((rs, v) => rs + v, 0), 0);
  if (!(n > 0) || !Number.isFinite(chi2)) {
    return Number.NaN;
  }
  if (method === "phi") {
    return Math.sqrt(chi2 / n);
  }
  if (method === "contingency") {
    return Math.sqrt(chi2 / (chi2 + n));
  }
  if (method === "tschuprow") {
    const denom = Math.sqrt((rows - 1) * (cols - 1));
    return denom > 0 ? Math.sqrt(chi2 / (n * denom)) : Number.NaN;
  }
  // "cramer" (default)
  const minDim = Math.min(rows - 1, cols - 1);
  return minDim > 0 ? Math.sqrt(chi2 / (n * minDim)) : Number.NaN;
}
