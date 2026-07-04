# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-07-04T13:23:14Z |
| Iteration Count | 386 |
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
- 4 pre-existing TS benchmarks had wrong function names (dataFrameWhere→whereDataFrame, dataFrameMask→maskDataFrame, seriesMask→maskSeries, seriesWhere→whereSeries) — re-appeared on this branch after rebase; fixed again in iter 384.
- bench_read_excel.ts: `readExcel`/`xlsxSheetNames` are NOT in `src/index.ts` (node:zlib excluded). Must inline STORED-only ZIP/XLSX reader — see iter 384 implementation. Import only DataFrame/Series/Index/RangeIndex/Dtype.
- State's accepted iters can diverge from branch commits after rebase. Always use actual `ls benchmarks/tsb/*.ts | wc -l` as ground truth.
- bench_str_extract_all.py / bench_str_extract_groups.py had escaped triple-quote docstrings (`\"\"\"`) — re-appear after every rebase; fix to real triple-quotes on checkout. This is a persistent recurring issue.
- SparseArray/SparseDtype are in `src/core/sparse.ts`, exported as `SparseArray`/`SparseDtype` from `src/index.ts`. Key ops: `fromDense`, `toDense`, `sum`, `mean`, `add`, `mul`, `fillna`. Python equivalent: `pd.arrays.SparseArray(data, fill_value=0)` / `.to_dense()` / `.sum()` / `.mean()`.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks; join/crossJoin with overlapping columns using suffixes.
- Remaining unbenchmarked IO functions: `readXml`/`toXml`, `readFwf`, `readStata`/`toStata`, `readParquet`/`toParquet`, `readFeather`/`toFeather`, `readHdf`/`toHdf`, `toExcel`.
- `lreshape` is now benchmarked (iter 386).

---

## 📊 Iteration History

### Iter 386 — 2026-07-04 — [Run §28707518157](https://github.com/githubnext/tsb/actions/runs/28707518157)
✅ +1 pair → 727: lreshape (wide-to-long reshape via named column groups, 1k rows × 3 groups) · commit f57f8de

### Iter 385 — 2026-07-03 — [Run §28663472320](https://github.com/githubnext/tsb/actions/runs/28663472320)
✅ +1 pair → 726: SparseArray (fromDense/toDense/sum/mean) · fixed escaped triple-quotes in 2 py files · commit b4ab16a

### Iters 378–384 — ✅ 720→726 (summarized):
378: +3 (merge_ordered_ffill/by, grouper_class → 723). 379: +1 (add_sub_mul_div → 724). 380: +1 (assert_equal → 725). 381–384: fixed broken py files + added stats benchmarks (information/hypothesis_tests/regression/multivariate/contingency/bootstrap/case_when/kde) → but note: state 384 claimed 733 which diverged from branch actual count of 725.

### Iters 291–377 — ✅ 503→720 (summarized):
291–339: IO/reshape/window/stats/string/datetime. 340–362: sample/pivot/rolling/rank/clip/diff/replace/mask/sort/pct_change. 363–377: merge_asof, cross_join, join_all, shift, sort, at/iat, convert_dtypes, styler, resample, iterrows, groupby_many_groups, concat_many, str_replace_regex.
