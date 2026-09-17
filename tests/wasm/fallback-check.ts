/**
 * Standalone fallback-verification script for issue #496.
 *
 * Run directly with `bun run tests/wasm/fallback-check.ts` (or spawned as a
 * fresh child process by `tests/wasm/fallback-isolated.test.ts`). This file
 * deliberately never calls `loadWasm()`, so `getWasm()` stays `null` for the
 * whole process lifetime and every `*Accelerated` call below is guaranteed to
 * execute the pure-TypeScript fallback path, not the Wasm-accelerated one.
 *
 * Exits with status 0 and prints "OK" on success, or throws/exits non-zero on
 * any assertion failure so the parent test can detect it.
 */

import {
  getWasm,
  rollingMaxF64Accelerated,
  rollingMedianF64Accelerated,
  rollingMinF64Accelerated,
} from "../../src/wasm/index.ts";

function assertDeepEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual, (_key, value) =>
    typeof value === "number" && !Number.isFinite(value) ? String(value) : value,
  );
  const e = JSON.stringify(expected, (_key, value) =>
    typeof value === "number" && !Number.isFinite(value) ? String(value) : value,
  );
  if (a !== e) {
    throw new Error(`${label}: expected ${e}, got ${a}`);
  }
}

// The Wasm module must not have been loaded yet in this fresh process.
if (getWasm() !== null) {
  throw new Error("wasm module was unexpectedly already loaded — fallback isolation broken");
}

const missingValueData = [Number.NaN, 1, Number.NaN, 3];

assertDeepEqual(
  rollingMedianF64Accelerated(missingValueData, 1, 0),
  [null, 1, null, 3],
  "rollingMedianF64Accelerated fallback",
);

assertDeepEqual(
  rollingMinF64Accelerated(missingValueData, 1, 0),
  [Number.POSITIVE_INFINITY, 1, Number.POSITIVE_INFINITY, 3],
  "rollingMinF64Accelerated fallback",
);

assertDeepEqual(
  rollingMaxF64Accelerated(missingValueData, 1, 0),
  [Number.NEGATIVE_INFINITY, 1, Number.NEGATIVE_INFINITY, 3],
  "rollingMaxF64Accelerated fallback",
);

const allNanData = [Number.NaN, Number.NaN, Number.NaN];
assertDeepEqual(
  rollingMinF64Accelerated(allNanData, 3, 1),
  [null, null, null],
  "rollingMinF64Accelerated fallback (positive minPeriods, insufficient)",
);
assertDeepEqual(
  rollingMaxF64Accelerated(allNanData, 3, 1),
  [null, null, null],
  "rollingMaxF64Accelerated fallback (positive minPeriods, insufficient)",
);

// The Wasm module must still be unloaded — none of the calls above should
// have triggered a load.
if (getWasm() !== null) {
  throw new Error("wasm module was loaded as a side effect of an accelerated call");
}

console.log("OK");
