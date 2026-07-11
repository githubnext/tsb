import { ttest1samp, ttestInd, ttestRel, fOneway, pearsonr, spearmanr, mannWhitneyU } from "../../src/index.js";

const WARMUP = 3;
const ITERS = 20;
const N = 1000;

// Seeded deterministic data
function makeData(n: number, seed: number): number[] {
  const arr: number[] = [];
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 1664525 + 1013904223) & 0xffffffff;
    arr.push((x >>> 0) / 0x100000000);
  }
  return arr;
}

const a = makeData(N, 42).map((v) => v * 4 + 2);
const b = makeData(N, 99).map((v) => v * 4 + 2.5);

function bench(): void {
  let total = 0;
  for (let i = 0; i < WARMUP + ITERS; i++) {
    const t0 = performance.now();
    ttest1samp(a, 2.5);
    ttestInd(a, b);
    ttestRel(a, b);
    fOneway([a, b]);
    pearsonr(a, b);
    spearmanr(a, b);
    mannWhitneyU(a, b);
    const elapsed = performance.now() - t0;
    if (i >= WARMUP) total += elapsed;
  }
  const mean_ms = total / ITERS;
  console.log(
    JSON.stringify({ function: "hypothesis_tests", mean_ms, iterations: ITERS, total_ms: total }),
  );
}

bench();
