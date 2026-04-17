/**
 * Benchmark: jsonNormalize with recordPath, meta fields, and nested data.
 * Outputs JSON: {"function": "json_normalize_meta", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { jsonNormalize } from "../../src/index.ts";

const SIZE = 2_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Nested records with meta fields
const records = Array.from({ length: SIZE }, (_, i) => ({
  id: i,
  dept: `dept_${i % 10}`,
  location: { city: `city_${i % 20}`, country: "US" },
  employees: Array.from({ length: 3 }, (_, j) => ({
    name: `emp_${i}_${j}`,
    salary: (i * 3 + j) * 1000,
    active: j % 2 === 0,
  })),
}));

for (let i = 0; i < WARMUP; i++) {
  // Normalize with recordPath into employees array, keeping dept and location as meta
  jsonNormalize(records, {
    recordPath: "employees",
    meta: ["id", "dept"],
    metaPrefix: "company_",
  });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  jsonNormalize(records, {
    recordPath: "employees",
    meta: ["id", "dept"],
    metaPrefix: "company_",
  });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "json_normalize_meta",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
