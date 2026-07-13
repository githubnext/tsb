# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-13T01:27:00Z |
| Iteration Count | 397 |
| Best Metric | 735 |
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

- `entropy`/`klDivergence` ✅ done, `mutualInformation`/`normalizedMI` ✅ done, `lreshape` ✅ done, `linregress`/`polyfit_polyval` ✅ done, `readSas`, `USFederalHolidayCalendar`, IntegerArray/FloatingArray, readXml/toXml, readFwf, readStata, readParquet, readFeather, readHdf, toExcel.

## 📊 Iteration History

### Iter 397 — 2026-07-13 — [Run §29217286269](https://github.com/githubnext/tsb/actions/runs/29217286269)
✅ +1 → 735: contingency benchmark (4×4 and 2×2 tables, 50 iters): expectedFreq, relativeRisk, oddsRatio, association(cramer). Python: pure-numpy equivalents.

### Iter 396 — 2026-07-12 — [Run §29194216373](https://github.com/githubnext/tsb/actions/runs/29194216373)
✅ +2 → 734: lreshape benchmark (10k rows, 4 value cols, 50 iters) + linregress/polyfit benchmark (10k pts, 20 iters). Python: pd.lreshape + np.polyfit/pure-numpy linregress.

### Iter 395 — 2026-07-12 — [Run §29175171519](https://github.com/githubnext/tsb/actions/runs/29175171519)
✅ +1 → 732: mutualInformation/normalizedMI benchmark (N=1000 paired obs, 10 categories, 50 iters). TS: `mutualInformation(pairs)` + `normalizedMI(pairs, "arithmetic")`. Python: pure-numpy equivalents.

### Iter 394 — 2026-07-11 — [Run §29154137340](https://github.com/githubnext/tsb/actions/runs/29154137340)
✅ +1 → 731: entropy/klDivergence benchmark (N=100 PMF, 50 iters). TS: `entropy(p)` + `klDivergence(p,q)`. Python: pure-numpy equivalents.

### Iter 393 — 2026-07-11 — [Run §29134514272](https://github.com/githubnext/tsb/actions/runs/29134514272)
✅ +1 → 730: hypothesis_tests benchmark (N=1000, 20 iters) covering ttest1samp, ttestInd, ttestRel, fOneway, pearsonr, spearmanr, mannWhitneyU. Python: pure-numpy equivalents.

### Iter 391 — 2026-07-10 — [Run §29062236162](https://github.com/githubnext/tsb/actions/runs/29062236162)
✅ +1 → 728: bootstrap CI benchmark (1k elements, 500 resamples, percentile method). TS: `bootstrap1(arr, mean, {n:500, method:"percentile"})`. Python: pure-numpy percentile bootstrap.

### Iter 390 — 2026-07-09 — [Run §29003458535](https://github.com/githubnext/tsb/actions/runs/29003458535)
✅ +1 → 727: OLS multiple regression (10k rows×5 predictors, 20 iters). TS: `new OLS().fit(X,y)`. Python: `np.linalg.lstsq`. Actual branch was 726 (iter 389 claimed 729 but files were never pushed). Metric corrected 729→727.

### Iters 291–389 — ✅ 503→726:
IO/reshape/window/stats/string/datetime/sample/pivot/rolling/rank/clip/diff/replace/mask/sort/pct_change/merge_asof/cross_join/join_all/shift/at_iat/convert_dtypes/styler/resample/iterrows/groupby_many/concat_many/str_replace_regex/merge_ordered_ffill/grouper/SparseArray. (Some push failures in 386-389 — lreshape/linregress/polyfit not pushed.)

