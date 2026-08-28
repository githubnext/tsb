/**
 * Benchmark: StringArray.cat() — element-wise string concatenation with separator.
 * N=100_000 nullable strings (~10% nulls) in each of two StringArrays;
 * cat() joins them pairwise with a separator character.
 *
 * Mirrors pandas Series.str.cat(other, sep="-") on two 100k-element string Series.
 *
 * Outputs JSON: {"function": "string_array_cat", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { arrays } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 50;

const WORDS_A = ["hello", "world", "foo", "bar", "baz", "qux", "quux", "corge", "grault", "garply"];
const WORDS_B = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa"];

const rawA: (string | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : WORDS_A[i % WORDS_A.length],
);
const rawB: (string | null)[] = Array.from({ length: N }, (_, i) =>
  i % 7 === 0 ? null : WORDS_B[i % WORDS_B.length],
);

const a = arrays.StringArray.from(rawA);
const b = arrays.StringArray.from(rawB);

function run(): void {
  a.cat("-", b);
}

for (let i = 0; i < WARMUP; i++) run();

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "string_array_cat",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
