/**
 * Benchmark: readJson with all orient options (records, split, columns, index, values).
 * Outputs JSON: {"function": "read_json_all_orients", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, readJson, toJson } from "../../src/index.ts";

const SIZE = 5_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  id: Array.from({ length: SIZE }, (_, i) => i),
  value: Array.from({ length: SIZE }, (_, i) => i * 1.1),
  label: Array.from({ length: SIZE }, (_, i) => `cat_${i % 10}`),
});

const recordsJson = toJson(df, { orient: "records" });
const splitJson = toJson(df, { orient: "split" });
const columnsJson = toJson(df, { orient: "columns" });
const valuesJson = toJson(df, { orient: "values" });
const indexJson = toJson(df, { orient: "index" });

for (let i = 0; i < WARMUP; i++) {
  readJson(recordsJson, { orient: "records" });
  readJson(splitJson, { orient: "split" });
  readJson(columnsJson, { orient: "columns" });
  readJson(valuesJson, { orient: "values" });
  readJson(indexJson, { orient: "index" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readJson(recordsJson, { orient: "records" });
  readJson(splitJson, { orient: "split" });
  readJson(columnsJson, { orient: "columns" });
  readJson(valuesJson, { orient: "values" });
  readJson(indexJson, { orient: "index" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "read_json_all_orients",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
