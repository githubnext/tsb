# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-30T19:45:00Z |
| Iteration Count | 382 |
| Best Metric | 727 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #361 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

**Goal**: Benchmark every tsb function vs pandas equivalent.
**Metric**: benchmarked_functions (higher is better) · **PR**: #361 · **Issue**: #221

---

## 🎯 Current Priorities

*(No specific priorities set — exploring freely.)*

---

## 📚 Lessons Learned

- Import: `../../src/index.ts`. groupby AggName: sum/mean/min/max/count/std/first/last/size.
- mergeAsof: sorted DFs required. corrWith: df first arg. Python: real triple-quotes only.
- Resample: "H","D","MS","QS","YS". Series: `new Series({data,index})`. metric=min(TS,PY).
- Testing utils (assertSeriesEqual/assertFrameEqual/assertIndexEqual) are exported from src/index.ts.
- Hypothesis tests (ttestInd/pearsonr/spearmanr) map to scipy.stats.ttest_ind/pearsonr/spearmanr; N=10k, ITERATIONS=20.
- 4 pre-existing TS benchmarks had wrong function names (dataFrameWhere→whereDataFrame, dataFrameMask→maskDataFrame, seriesMask→maskSeries, seriesWhere→whereSeries) and wrong import paths; fixed in iter 382.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks; join/crossJoin with overlapping columns using suffixes.
- Remaining unbenchmarked stats modules: bootstrap, case_when, kde, multivariate, regression, contingency.

---

## 📊 Iteration History

### Iter 382 — 2026-06-30 — [Run §28470160041](https://github.com/githubnext/tsb/actions/runs/28470160041)
✅ +1 pair → 727: hypothesis_tests (ttestInd/pearsonr/spearmanr vs scipy.stats) · commit 4517e56; also fixed 4 pre-existing benchmarks with wrong function names

### Iter 381 — 2026-06-30 — [Run §28414067931](https://github.com/githubnext/tsb/actions/runs/28414067931)
✅ +1 pair → 726: information (entropy/klDivergence/jsDivergence/crossEntropy vs scipy.stats.entropy) · commit 3dbac8f

### Iter 380 — 2026-06-29 — [Run §28378441925](https://github.com/githubnext/tsb/actions/runs/28378441925)
✅ +1 pair → 725: assert_equal (assertSeriesEqual/assertFrameEqual/assertIndexEqual vs pd.testing) · commit 3d8392a

### Iter 379 — 2026-06-29 — [Run §28343148408](https://github.com/githubnext/tsb/actions/runs/28343148408)
✅ +1 pair → 724: add_sub_mul_div (seriesAdd/Sub/Mul/Div with scalar & Series operands) · commit 92f482a

### Iter 378 — 2026-06-28 — [Run §28315875254](https://github.com/githubnext/tsb/actions/runs/28315875254)
✅ +3 pairs → 723: merge_ordered_ffill, merge_ordered_by, grouper_class · commit b5584cf

### Iters 291–377 — ✅ 503→720 (summarized):
291–339: IO/reshape/window/stats/string/datetime coverage. 340–362: sample/pivot/rolling/rank/clip/diff/replace/mask/sort/pct_change. 363–377: merge_asof, cross_join, join_all, shift, sort, at/iat, convert_dtypes, styler, resample, iterrows, groupby_many_groups, concat_many, str_replace_regex (+more).
