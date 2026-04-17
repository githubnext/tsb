import { Series, catUnionCategories, catIntersectCategories, catDiffCategories } from "tsb";
const N = 50_000;
const cats1 = ["A", "B", "C", "D"];
const cats2 = ["C", "D", "E", "F"];
const s1 = new Series(Array.from({ length: N }, (_, i) => cats1[i % cats1.length]));
const s2 = new Series(Array.from({ length: N }, (_, i) => cats2[i % cats2.length]));
const c1 = s1.cat;
const c2 = s2.cat;
const WARMUP = 3;
const ITERS = 20;
for (let i = 0; i < WARMUP; i++) {
  catUnionCategories(c1, c2);
  catIntersectCategories(c1, c2);
  catDiffCategories(c1, c2);
}
const t0 = performance.now();
for (let i = 0; i < ITERS; i++) {
  catUnionCategories(c1, c2);
  catIntersectCategories(c1, c2);
  catDiffCategories(c1, c2);
}
const total = performance.now() - t0;
console.log(JSON.stringify({ function: "cat_union_intersect_diff", mean_ms: total / ITERS, iterations: ITERS, total_ms: total }));
