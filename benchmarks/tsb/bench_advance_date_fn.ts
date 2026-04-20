/**
 * Benchmark: advanceDate / parseFreq — advance a Date by a parsed frequency and parse freq strings.
 * Mirrors pandas DateOffset arithmetic and freq parsing.
 * Outputs JSON: {"function": "advance_date_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { advanceDate, parseFreq } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

const d = new Date("2020-01-15");
const freqs = ["D", "2D", "h", "3h", "MS", "ME", "W", "B"];
const parsedFreqs = freqs.map((f) => parseFreq(f));

for (let i = 0; i < WARMUP; i++) {
  for (const pf of parsedFreqs) advanceDate(d, pf);
  for (const f of freqs) parseFreq(f);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (let j = 0; j < 1000; j++) {
    for (const pf of parsedFreqs) advanceDate(d, pf);
    for (const f of freqs) parseFreq(f);
  }
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "advance_date_fn",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
