/**
 * Benchmark: kstest + jarqueBera — Kolmogorov-Smirnov test and Jarque-Bera normality test.
 * Mirrors scipy.stats.kstest and scipy.stats.jarque_bera.
 * Dataset: 1,000 samples; 200 measured iterations.
 * Outputs JSON: {"function": "kstest_jarquebera", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { kstest, jarqueBera } from "../../src/index.ts";

const WARMUP = 10;
const ITERATIONS = 200;
const N = 1_000;

// Generate pseudo-random normal-ish data using LCG
function makeData(n: number, seed: number): number[] {
  const arr: number[] = [];
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 1664525 + 1013904223) & 0xffffffff;
    arr.push(((x >>> 0) / 0x100000000) * 6 - 3); // uniform in [-3, 3]
  }
  return arr;
}

const data = makeData(N, 42);

// Standard normal CDF approximation (Abramowitz & Stegun)
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x) * poly;
  return x >= 0 ? p : 1 - p;
}

for (let i = 0; i < WARMUP; i++) {
  kstest(data, normalCdf);
  jarqueBera(data);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  kstest(data, normalCdf);
  jarqueBera(data);
}
const total_ms = performance.now() - t0;
const mean_ms = total_ms / ITERATIONS;

console.log(JSON.stringify({ function: "kstest_jarquebera", mean_ms, iterations: ITERATIONS, total_ms }));
