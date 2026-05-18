/**
 * Benchmark: readHtml — parse HTML tables into DataFrames.
 * Outputs JSON: {"function": "read_html", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { readHtml } from "../../src/index.js";

const ROWS = 1_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Build a realistic HTML string with a 1000-row table.
function buildHtml(rows: number): string {
  const header = "<tr><th>id</th><th>name</th><th>value</th><th>score</th></tr>";
  const bodyRows: string[] = [];
  for (let i = 0; i < rows; i++) {
    bodyRows.push(
      `<tr><td>${i}</td><td>item_${i % 100}</td><td>${(i * 1.5).toFixed(2)}</td><td>${Math.sin(i * 0.01).toFixed(6)}</td></tr>`,
    );
  }
  return `<table><thead>${header}</thead><tbody>${bodyRows.join("")}</tbody></table>`;
}

const html = buildHtml(ROWS);

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  readHtml(html);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readHtml(html);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "read_html",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
