/**
 * Benchmark: mergeOrdered with left_by grouping — two 3k-row DataFrames, 10 groups.
 * Outputs JSON: {"function": "merge_ordered_by", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, mergeOrdered } from "../../src/index.ts";

const N = 3_000;
const GROUPS = 10;
const PER_GROUP = N / GROUPS;
const WARMUP = 2;
const ITERATIONS = 8;

// Build sorted data by (grp, t)
const grpLeft: string[] = [];
const tLeft: number[] = [];
const v1: number[] = [];
for (let g = 0; g < GROUPS; g++) {
  for (let j = 0; j < PER_GROUP; j++) {
    grpLeft.push(`g${g}`);
    tLeft.push(j * 2);
    v1.push(g * PER_GROUP + j);
  }
}

const grpRight: string[] = [];
const tRight: number[] = [];
const v2: number[] = [];
for (let g = 0; g < GROUPS; g++) {
  for (let j = 0; j < PER_GROUP; j++) {
    grpRight.push(`g${g}`);
    tRight.push(j * 3);
    v2.push(g * PER_GROUP + j);
  }
}

const df1 = DataFrame.fromColumns({ grp: grpLeft, t: tLeft, val1: v1 });
const df2 = DataFrame.fromColumns({ grp: grpRight, t: tRight, val2: v2 });

for (let i = 0; i < WARMUP; i++) {
  mergeOrdered(df1, df2, { on: "t", left_by: "grp", right_by: "grp" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mergeOrdered(df1, df2, { on: "t", left_by: "grp", right_by: "grp" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "merge_ordered_by",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
