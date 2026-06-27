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
} from "./accelerated.ts";
