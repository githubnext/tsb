/*!
 * tsb-wasm: Rust/WASM acceleration layer for tsb.
 *
 * Exposes pure-computation helpers that are otherwise implemented in TypeScript
 * in `src/core/`.  Every exported function has a TypeScript counterpart that
 * is used as the fallback when the WASM module is unavailable.
 */

mod natsort;
mod searchsorted;

pub use natsort::*;
pub use searchsorted::*;
