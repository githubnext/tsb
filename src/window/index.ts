/**
 * window — module re-exports.
 *
 * Re-exports all public symbols from the window sub-modules.
 *
 * @module
 */

export { rolling, SeriesRolling, DataFrameRolling } from "./rolling.ts";
export type { RollingOptions } from "./rolling.ts";

export { expanding, SeriesExpanding, DataFrameExpanding } from "./expanding.ts";

export { ewm, SeriesEWM, DataFrameEWM } from "./ewm.ts";
export type { EWMOptions } from "./ewm.ts";

// ─── expanding corr/cov ───────────────────────────────────────────────────────
export { expandingCorr, expandingCov, expandingCorrDF, expandingCovDF } from "./expanding-corr.ts";
export type { ExpandingCovOptions } from "./expanding-corr.ts";
