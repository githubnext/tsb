/**
 * Benchmark: frequencies — toOffset and inferFreq.
 * Tests parsing frequency strings and inferring frequency from date arrays.
 */
import { toOffset, inferFreq } from "../../src/index.js";

const WARMUP = 5;
const ITERATIONS = 50;

const FREQ_STRINGS = ["D", "h", "min", "s", "ME", "MS", "YE", "YS", "W", "3ME", "2h", "QE", "QS"];

// Build a regularly-spaced daily date array for inferFreq
const BASE = new Date(Date.UTC(2020, 0, 1));
const DAILY_DATES = Array.from({ length: 365 }, (_, i) => new Date(BASE.getTime() + i * 86_400_000));

function run() {
  for (const freq of FREQ_STRINGS) {
    toOffset(freq);
  }
  inferFreq(DAILY_DATES);
}

for (let i = 0; i < WARMUP; i++) {
  run();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  run();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "frequencies",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
