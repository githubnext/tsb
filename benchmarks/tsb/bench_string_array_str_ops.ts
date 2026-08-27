/**
 * Benchmark: StringArray additional string operations —
 * lstrip, rstrip, startswith, endswith, replace, zfill
 * on a 100k-element nullable StringArray (~10 % nulls).
 *
 * These methods complement bench_string_array.ts (which covers
 * upper/lower/strip/contains/len/fillna) with the remaining
 * StringArray string utilities.
 *
 * Outputs JSON: {"function": "string_array_str_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { arrays } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 50;

const WORDS = ["  hello world  ", "  foo bar  ", "baz qux  ", "  quux", "corge", "grault  ", "garply"];

const raw: (string | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : WORDS[i % WORDS.length],
);

const a = arrays.StringArray.from(raw);

function run(): void {
  a.lstrip();
  a.rstrip();
  a.startswith("  he");
  a.endswith("ld  ");
  a.replace("hello", "hi");
  a.zfill(12);
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "string_array_str_ops",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
