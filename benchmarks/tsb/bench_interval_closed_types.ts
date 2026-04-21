/**
 * Benchmark: Interval closed types — both, neither, left, right endpoint variants.
 * Tests closedLeft, closedRight, isOpen, isClosed, equals, and contains with all 4 closed types.
 * Outputs JSON: {"function": "interval_closed_types", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Interval } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 100;

const SIZE = 1_000;
const closedTypes = ["both", "neither", "left", "right"] as const;

const intervalSets = closedTypes.map((closed) =>
  Array.from({ length: SIZE / 4 }, (_, i) => new Interval(i, i + 1, closed)),
);
const all = intervalSets.flat();
const ref = new Interval(0, 1, "right");

for (let w = 0; w < WARMUP; w++) {
  for (const iv of all.slice(0, 50)) {
    void iv.closedLeft;
    void iv.closedRight;
    void iv.isOpen;
    void iv.isClosed;
    void iv.mid;
    iv.contains(iv.mid);
    iv.equals(ref);
  }
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  for (const iv of all) {
    void iv.closedLeft;
    void iv.closedRight;
    void iv.isOpen;
    void iv.isClosed;
    void iv.mid;
    iv.contains(iv.mid);
    iv.equals(ref);
  }
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "interval_closed_types",
    mean_ms: round3(total / ITERATIONS),
    iterations: ITERATIONS,
    total_ms: round3(total),
  }),
);

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
