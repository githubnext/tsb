# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-14T01:24:55Z |
| Iteration Count | 399 |
| Best Metric | 737 |
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

- `entropy`/`klDivergence` ✅ done, `mutualInformation`/`normalizedMI` ✅ done, `lreshape` ✅ done, `linregress`/`polyfit_polyval` ✅ done, `contingency` ✅ done, `multivariate` ✅ done, `IntegerArray/FloatingArray` ✅ done, `readSas`, `USFederalHolidayCalendar`, readXml/toXml, readFwf, readStata, readParquet, readFeather, readHdf, toExcel.

## 📊 Iteration History

### Iter 399 — 2026-07-14 — [Run §29298380978](https://github.com/githubnext/tsb/actions/runs/29298380978)
✅ +1 → 737: IntegerArray benchmark (N=100k, ~10% nulls, 20 iters): from/sum/mean/min/max/add/fillna vs pandas IntegerArray (Int32 dtype).

### Iter 398 — 2026-07-13 — [Run §29254325811](https://github.com/githubnext/tsb/actions/runs/29254325811)
✅ +1 → 736: multivariate benchmark (N=500×5, 20 iters): mahalanobis distance, covMatrix, PCA (3 components via SVD). Python: pure-numpy equivalents.

### Iter 397 — 2026-07-13 — [Run §29217286269](https://github.com/githubnext/tsb/actions/runs/29217286269)
✅ +1 → 735: contingency benchmark (4×4 and 2×2 tables, 50 iters): expectedFreq, relativeRisk, oddsRatio, association(cramer). Python: pure-numpy equivalents.

### Iters 390–397 — ✅ 727→735:
bootstrap, OLS regression, hypothesis_tests, entropy/klDivergence, mutualInformation/normalizedMI, lreshape, linregress/polyfit, contingency tables (expectedFreq/relativeRisk/oddsRatio/association).

### Iters 291–389 — ✅ 503→726:
IO/reshape/window/stats/string/datetime/sample/pivot/rolling/rank/clip/diff/replace/mask/sort/pct_change/merge_asof/cross_join/join_all/shift/at_iat/convert_dtypes/styler/resample/iterrows/groupby_many/concat_many/str_replace_regex/merge_ordered_ffill/grouper/SparseArray/gaussianKDE.

