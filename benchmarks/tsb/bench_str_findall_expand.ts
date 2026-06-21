/**
 * Benchmark: strFindallExpand on a 5k-element string Series.
 *
 * Mirrors pandas Series.str.extract() with named capture groups.
 * Each string has the form "name42 score88 level3" so the regex
 * captures three named groups: word, number, and level.
 */
import { Series, strFindallExpand } from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

const N = 5_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data: Scalar[] = Array.from(
  { length: N },
  (_, i) => (i % 20 === 0 ? null : `user${i} score${(i * 7) % 100} level${(i % 5) + 1}`),
);
const s = new Series<Scalar>({ data });

// Named capture-group pattern: extract word, score, and level
const pat = /(?<word>[a-z]+)(?<num>\d+)\s+score(?<score>\d+)\s+level(?<level>\d+)/;

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  strFindallExpand(s, pat);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  strFindallExpand(s, pat);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "str_findall_expand",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
