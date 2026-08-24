/**
 * Public API for the tsb Rust/WASM acceleration layer.
 *
 * Import from this module (not from sub-files) for stable public symbols.
 */

export type { TsbWasmModule } from "./types.ts";
export {
  getWasm,
  loadWasm,
  searchsortedAccelerated,
  searchsortedManyAccelerated,
  argsortScalarsAccelerated,
  natCompareAccelerated,
  natSortedAccelerated,
  natArgSortAccelerated,
  sumF64Accelerated,
  meanF64Accelerated,
  minF64Accelerated,
  maxF64Accelerated,
  varF64Accelerated,
  stdF64Accelerated,
  medianF64Accelerated,
  rollingSumF64Accelerated,
  rollingMeanF64Accelerated,
  rollingMinF64Accelerated,
  rollingMaxF64Accelerated,
  rollingVarF64Accelerated,
  rollingStdF64Accelerated,
  rollingMedianF64Accelerated,
  expandingSumF64Accelerated,
  expandingMeanF64Accelerated,
  expandingMinF64Accelerated,
  expandingMaxF64Accelerated,
  expandingVarF64Accelerated,
  expandingStdF64Accelerated,
  expandingMedianF64Accelerated,
} from "./accelerated.ts";
