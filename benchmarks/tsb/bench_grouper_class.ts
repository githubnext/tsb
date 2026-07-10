/**
 * Benchmark: Grouper class — construction, predicates, and isGrouper on 50k iterations.
 * Outputs JSON: {"function": "grouper_class", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Grouper, isGrouper } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 50_000;

function runGroupers(): void {
  const g1 = new Grouper({ key: "col_a" });
  const g2 = new Grouper({ key: "date", sort: true });
  const g3 = new Grouper({ key: "category", dropna: false });

  isGrouper(g1);
  isGrouper(g2);
  isGrouper(g3);
  isGrouper("not_a_grouper");
  isGrouper(42);

  g1.isKeyGrouper();
  g2.isKeyGrouper();
  g3.isKeyGrouper();
  g1.isLevelGrouper();

  g1.toString();
  g2.toString();
  g3.toString();
}

for (let i = 0; i < WARMUP; i++) runGroupers();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) runGroupers();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "grouper_class",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
