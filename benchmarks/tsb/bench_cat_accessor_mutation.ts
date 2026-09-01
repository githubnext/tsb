/**
 * Benchmark: CategoricalAccessor mutation methods — removeCategories,
 * renameCategories, setCategories, reorderCategories, asOrdered, asUnordered.
 *
 * These cover the subset of cat accessor methods not benchmarked in bench_cat_accessor.ts.
 *
 * Mirrors pandas.Categorical / Series.cat:
 *   - removeCategories   → series.cat.remove_categories()
 *   - renameCategories   → series.cat.rename_categories()
 *   - setCategories      → series.cat.set_categories()
 *   - reorderCategories  → series.cat.reorder_categories()
 *   - asOrdered          → series.cat.as_ordered()
 *   - asUnordered        → series.cat.as_unordered()
 *
 * Outputs JSON: {"function": "cat_accessor_mutation", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, CategoricalAccessor } from "../../src/index.js";

const N = 50_000;
const CATS = ["alpha", "beta", "gamma", "delta", "epsilon"] as const;
const data: string[] = Array.from({ length: N }, (_, i) => CATS[i % CATS.length]);
const s = new Series({ data });

const WARMUP = 5;
const ITERATIONS = 50;

function run(): void {
  const acc = new CategoricalAccessor(s);

  // removeCategories — remove a category not present in data (safe)
  acc.removeCategories([]);

  // renameCategories — rename via mapping
  acc.renameCategories({ alpha: "a", beta: "b", gamma: "c", delta: "d", epsilon: "e" });

  // setCategories — replace the category list (superset to avoid data loss)
  acc.setCategories(["alpha", "beta", "gamma", "delta", "epsilon", "zeta"], false);

  // reorderCategories — same set, different order
  acc.reorderCategories(["epsilon", "delta", "gamma", "beta", "alpha"]);

  // asOrdered / asUnordered — flip ordered flag
  acc.asOrdered();
  acc.asUnordered();
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "cat_accessor_mutation",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
