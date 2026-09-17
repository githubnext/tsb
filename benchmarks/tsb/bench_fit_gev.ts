import { fitGEV } from "../../src/index.js";

const N = 5000;
const WARMUP = 5;
const ITERS = 50;

// Deterministic pseudo-random block maxima (Gumbel-like), same generator used
// by the Python benchmark so both sides fit on identical data.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const maxima: number[] = Array.from({ length: N }, () => {
  const u = rand();
  return -Math.log(-Math.log(u === 0 ? 1e-12 : u));
});

for (let i = 0; i < WARMUP; i++) {
  fitGEV(maxima);
}

const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  fitGEV(maxima);
}
const total_ms = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "fit_gev",
    mean_ms: total_ms / ITERS,
    iterations: ITERS,
    total_ms,
  }),
);
