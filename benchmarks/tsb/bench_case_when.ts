/**
 * Benchmark: caseWhen — conditional value selection on 100k-element Series
 */
import { Series, caseWhen } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data = Float64Array.from({ length: ROWS }, (_, i) => i % 100);
const s = new Series(data);
const cond1 = s.map((v) => (v as number) < 25);
const cond2 = s.map((v) => (v as number) < 50);
const cond3 = s.map((v) => (v as number) < 75);

const caselist: [Series, string][] = [
  [cond1 as Series, "low"],
  [cond2 as Series, "medium-low"],
  [cond3 as Series, "medium-high"],
];

for (let i = 0; i < WARMUP; i++) {
  caseWhen(s, caselist);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  caseWhen(s, caselist);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "case_when",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
