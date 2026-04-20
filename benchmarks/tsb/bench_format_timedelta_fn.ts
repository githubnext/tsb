/**
 * Benchmark: formatTimedelta / parseFrac — Timedelta string formatting and fraction parsing.
 * Mirrors pandas Timedelta.__str__() and parsing helpers.
 * Outputs JSON: {"function": "format_timedelta_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Timedelta, formatTimedelta, parseFrac } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

const tds = [
  new Timedelta(1, "days"),
  new Timedelta(3661, "seconds"),
  new Timedelta(90061001, "milliseconds"),
  new Timedelta(0, "seconds"),
  new Timedelta(-86400, "seconds"),
];

const fracs = ["1/2", "3/4", "0.333", "100", "1.5"];

for (let i = 0; i < WARMUP; i++) {
  for (const td of tds) formatTimedelta(td);
  for (const f of fracs) parseFrac(f);
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (let j = 0; j < 1000; j++) {
    for (const td of tds) formatTimedelta(td);
    for (const f of fracs) parseFrac(f);
  }
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "format_timedelta_fn",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
