/**
 * Rust/WASM module loader for the tsb acceleration layer.
 *
 * The WASM module is an optional dependency: if the built artefact is not
 * present (e.g. before `bun run wasm:build`), every public function falls
 * back gracefully to `null`.
 *
 * Usage:
 * ```ts
 * const wasm = await loadWasm();
 * if (wasm !== null) {
 *   const idx = wasm.searchsorted_f64(arr, value, false);
 * }
 * ```
 */

import type { TsbWasmModule } from "./types.ts";

// ─── type guards ──────────────────────────────────────────────────────────────

/**
 * Check that `obj` exposes a callable property named `key`.
 *
 * Avoids `as` casts by using `Reflect.get` after the `typeof`/null guard,
 * which narrows `unknown` → `object` so the call is type-safe.
 */
function hasFn(obj: unknown, key: string): boolean {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const val: unknown = Reflect.get(obj, key);
  return typeof val === "function";
}

/** Narrow `mod` to {@link TsbWasmModule} by verifying all exported functions. */
function isTsbWasmModule(mod: unknown): mod is TsbWasmModule {
  return (
    hasFn(mod, "searchsorted_f64") &&
    hasFn(mod, "searchsorted_many_f64") &&
    hasFn(mod, "argsort_f64") &&
    hasFn(mod, "searchsorted_str") &&
    hasFn(mod, "searchsorted_many_str") &&
    hasFn(mod, "argsort_str") &&
    hasFn(mod, "nat_compare") &&
    hasFn(mod, "nat_sorted") &&
    hasFn(mod, "nat_argsort")
  );
}

// ─── module cache ─────────────────────────────────────────────────────────────

let _cached: TsbWasmModule | null | undefined;

/**
 * Load and return the tsb Rust/WASM module.
 *
 * Returns `null` if the WASM artefact has not been built yet (i.e. before
 * `bun run wasm:build`) or if the runtime environment cannot load it.
 *
 * The result is cached: subsequent calls are synchronous after the first.
 */
export async function loadWasm(): Promise<TsbWasmModule | null> {
  if (_cached !== undefined) {
    return _cached;
  }

  try {
    // Use createRequire to load the CommonJS nodejs-target wasm-pack output.
    const { createRequire } = await import("node:module");
    const _require = createRequire(import.meta.url);
    const mod: unknown = _require("../../rust/pkg/tsb_wasm.js");
    _cached = isTsbWasmModule(mod) ? mod : null;
  } catch {
    _cached = null;
  }
  return _cached;
}

/**
 * Return the cached WASM module without loading, or `null` if not yet loaded
 * or unavailable. Useful in synchronous contexts after `loadWasm()` has
 * already been awaited.
 */
export function getWasm(): TsbWasmModule | null {
  return _cached ?? null;
}
