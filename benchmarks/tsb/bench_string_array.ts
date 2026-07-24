/**
 * Benchmark: StringArray — nullable string extension array operations.
 * N=100_000 elements with ~10% nulls. Tests from/upper/lower/strip/contains/len/fillna.
 */
import { arrays } from "../../src/index.js";

const N = 100_000;
const WARMUP = 3;
const ITERATIONS = 50;

const WORDS = ["hello", "world", "  foo  ", "bar", "baz", "  qux  ", "quux", "corge", "grault", "garply"];

const raw: (string | null)[] = Array.from({ length: N }, (_, i) =>
  i % 10 === 0 ? null : WORDS[i % WORDS.length],
);

function run(): void {
  const a = arrays.StringArray.from(raw);
  a.upper();
  a.lower();
  a.strip();
  a.contains("oo");
  a.len();
  a.fillna("NA");
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "string_array",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
