/**
 * Benchmark: readFwf — read fixed-width formatted text into a DataFrame.
 * Outputs JSON: {"function": "fwf", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { readFwf } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50;

// Build a fixed-width text with 5 columns, 1000 rows
// Columns: id(6), name(12), age(4), score(8), city(12)
function buildFwf(rows: number): string {
  const header = "id    name        age score   city        ";
  const lines: string[] = [header];
  const names = ["Alice ", "Bob   ", "Carol ", "Dave  ", "Eve   "];
  const cities = ["NYC      ", "LA       ", "Chicago  ", "Houston  ", "Seattle  "];
  for (let i = 0; i < rows; i++) {
    const id = String(i + 1).padStart(5, " ") + " ";
    const name = (names[i % 5] ?? "Alice ").padEnd(12, " ");
    const age = String(20 + (i % 50)).padStart(3, " ") + " ";
    const score = String((i % 100) / 10).padEnd(8, " ");
    const city = (cities[i % 5] ?? "NYC      ").padEnd(12, " ");
    lines.push(id + name + age + score + city);
  }
  return lines.join("\n");
}

const fwfText = buildFwf(1000);
const colspecs: [number, number][] = [[0, 6], [6, 18], [18, 22], [22, 30], [30, 42]];

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  readFwf(fwfText);
  readFwf(fwfText, { colspecs });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();

  // Auto-infer column widths
  readFwf(fwfText);
  // Explicit colspecs
  readFwf(fwfText, { colspecs });

  times.push(performance.now() - t0);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "fwf",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
