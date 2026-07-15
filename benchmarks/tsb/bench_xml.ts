/**
 * Benchmark: readXml / toXml — parse and serialize XML
 *
 * Creates a 1,000-row XML document, then benchmarks:
 *   - readXml (parse XML string → DataFrame)
 *   - toXml (DataFrame → XML string)
 */
import { readXml, toXml, DataFrame, Series } from "../../src/index.js";

const ROWS = 1_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build XML string with ROWS row elements
const lines: string[] = ['<?xml version="1.0"?>', "<data>"];
for (let i = 0; i < ROWS; i++) {
  lines.push(
    `  <row id="${i}" value="${(i * 1.1).toFixed(4)}" label="cat_${i % 50}" />`,
  );
}
lines.push("</data>");
const xmlString = lines.join("\n");

// Build a DataFrame for toXml benchmarks
const ids = Array.from({ length: ROWS }, (_, i) => i);
const values = Array.from({ length: ROWS }, (_, i) => i * 1.1);
const labels = Array.from({ length: ROWS }, (_, i) => `cat_${i % 50}`);
const df = new DataFrame({
  id: new Series(ids),
  value: new Series(values),
  label: new Series(labels),
});

// Warm up
for (let i = 0; i < WARMUP; i++) {
  readXml(xmlString);
  toXml(df);
}

// Benchmark readXml
const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readXml(xmlString);
}
const readTotal = performance.now() - t0;

// Benchmark toXml
const t1 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toXml(df);
}
const writeTotal = performance.now() - t1;

const total = readTotal + writeTotal;

console.log(
  JSON.stringify({
    function: "xml",
    mean_ms: total / (ITERATIONS * 2),
    iterations: ITERATIONS * 2,
    total_ms: total,
    read_mean_ms: readTotal / ITERATIONS,
    write_mean_ms: writeTotal / ITERATIONS,
  }),
);
