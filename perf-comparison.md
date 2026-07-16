# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-16T13:25:39Z |
| Iteration Count | 404 |
| Best Metric | 742 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |
| PR | #423 |

**Goal**: Benchmark every tsb function vs pandas equivalent. **Metric**: benchmarked_functions (higher is better)

## 🎯 Current Priorities

*(No specific priorities — exploring freely.)*

## 📚 Lessons Learned

- Import `../../src/index.js`. groupby AggNames: sum/mean/min/max/count/std/first/last/size. Python: real triple-quotes. metric=min(TS,PY).
- Pages workflow: pandas+numpy only (no scipy). Use pure-numpy for linregress, gaussianKDE, etc.
- safeoutputs push: checkout origin/autoloop/perf-comparison directly (no rebase); add new files only → small bundle (~3KB/pair). Post-rebase squash causes large diffs → push failure. State metric can diverge; always use `ls benchmarks/tsb/*.ts | wc -l`.
- SparseArray: `src/core/sparse.ts`. readExcel/xlsxSheetNames NOT in src/index.ts.
- OLS: `new OLS().fit(X_2d, y)` from `src/stats/regression.ts`. Python: `np.linalg.lstsq(X_design, y, rcond=None)`.
- hypothesis_tests: use pure-numpy equivalents (no scipy); benchmark suite covers ttest1samp/ttestInd/ttestRel/fOneway/pearsonr/spearmanr/mannWhitneyU in one pair.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- `flags+options` ✅ done, `case_when` ✅ done, `readSas`, `USFederalHolidayCalendar`, readFwf, readStata, readParquet, readFeather, readHdf, toExcel.

## 📊 Iteration History

### Iter 404 — 2026-07-16 — [Run §29501918594](https://github.com/githubnext/tsb/actions/runs/29501918594)
✅ +1 → 742: case_when benchmark (N=100k, 20 iters): caseWhen with 3-condition caselist (low/medium-low/medium-high buckets) on Series vs pandas Series.case_when equivalent.

### Iter 403 — 2026-07-16 — [Run §29463961249](https://github.com/githubnext/tsb/actions/runs/29463961249)
✅ +1 → 741: flags+options benchmark (N=10k, 20 iters): getFlags/allowsDuplicateLabels get+set on Series & DataFrame; getOption/setOption/resetOption for display keys; options proxy read vs pandas flags/pd.get_option/pd.options equivalents.

### Iter 402 — 2026-07-15 — [Run §29418859475](https://github.com/githubnext/tsb/actions/runs/29418859475)
✅ +1 → 740: readXml/toXml benchmark.

### Iter 401 — 2026-07-15 — [Run §29381454981](https://github.com/githubnext/tsb/actions/runs/29381454981)
✅ +1 → 739: pipe_apply benchmark.

### Iter 400 — 2026-07-14 — [Run §29336152876](https://github.com/githubnext/tsb/actions/runs/29336152876)
✅ +1 → 738: FloatingArray benchmark.

### Iter 399 — 2026-07-14 — [Run §29298380978](https://github.com/githubnext/tsb/actions/runs/29298380978)
✅ +1 → 737: IntegerArray benchmark.

### Iter 398 — 2026-07-13 — [Run §29254325811](https://github.com/githubnext/tsb/actions/runs/29254325811)
✅ +1 → 736: multivariate benchmark.

### Iters 391–403 — ✅ 728→741:
bootstrap, OLS regression, hypothesis_tests, entropy/klDivergence, mutualInformation/normalizedMI, lreshape, linregress/polyfit, contingency tables, multivariate/PCA/mahalanobis, IntegerArray, FloatingArray, pipe_apply, readXml/toXml, flags+options.

### Iters 291–390 — ✅ 503→727:
IO/reshape/window/stats/string/datetime/sample/pivot/rolling/rank/clip/diff/replace/mask/sort/pct_change/merge_asof/cross_join/join_all/shift/at_iat/convert_dtypes/styler/resample/iterrows/groupby_many/concat_many/str_replace_regex/merge_ordered_ffill/grouper/SparseArray/gaussianKDE.

