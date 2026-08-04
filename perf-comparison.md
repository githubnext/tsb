# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-04T01:25:57Z |
| Iteration Count | 440 |
| Best Metric | 780 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #435 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent. **Metric**: benchmarked_functions (higher is better)
**Goal**: Benchmark every tsb function vs pandas equivalent. **Metric**: benchmarked_functions (higher is better)

## 🎯 Current Priorities

*(No specific priorities — exploring freely.)*

## 📚 Lessons Learned

- Import `../../src/index.js`. groupby AggNames: sum/mean/min/max/count/std/first/last/size. metric=min(TS,PY).
- Pages workflow: pandas+numpy only (no scipy). Use pure-numpy for KDE, linregress, etc.
- SparseArray: `src/core/sparse.ts`. readExcel/xlsxSheetNames NOT in src/index.ts.
- OLS: `new OLS().fit(X_2d, y)` from `src/stats/regression.ts`.
- IO round-trips (parquet/feather/hdf/stata): BytesIO/Uint8Array buffer pattern; `toStata`→`readStata` for Stata .dta files.
- pandas TimedeltaArray: has `.days`/`.seconds`/`.total_seconds()` but NOT `.hours`. Use `~arr.isna()` for notna.
- `tabulate` (required by pandas `to_markdown`) must be installed; Python benchmark auto-installs it via subprocess if missing.
- holiday observance fns: `pandas.tseries.holiday` has `nearest_workday`, `next_monday`, `next_monday_or_tuesday`, `previous_friday`, `previous_workday`, `sunday_to_monday`.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked.

## 📊 Iteration History

### Iteration 440 — 2026-08-04T01:25:57Z — [Run](https://github.com/githubnext/tsb/actions/runs/30868541111)

- **Status**: ✅ Accepted
- **Change**: Add masked_array (MaskedArray base ops) and frequencies (toOffset/inferFreq) benchmarks
- **Metric**: 780 (previous best: 778, delta: +2)
- **Commit**: 2863f1f
- **Notes**: MaskedArray benchmark uses IntegerArray as concrete subclass; frequencies benchmark tests parsing 13 freq strings plus inferFreq on 365-day array.

### Iters 435–439 — ✅ 773→778: string_accessor, clip_with_bounds, swaplevel_df, information_advanced, format_table

### Iters 432–434 — ✅ 770→772: SparseArray, IntegerArray, applymap

### Iters 428–431 — ✅ 766→769: polyval, holiday observances, information_extended, stata round-trip.

### Iters 419–427 — ✅ 757→765: normalizedMI, jointEntropy/conditionalEntropy/VOI, renyiEntropy/tsallisEntropy/jsDivergence, mode, gaussianKDE, TimedeltaArray, DatetimeArray, StringArray, BooleanArray.

### Iters 412–418 — ✅ 750→756: readParquet/toParquet and various array/IO benchmarks.

### Iters 291–411 — ✅ 503→749: bootstrap, OLS, hypothesis_tests, entropy, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, IntegerArray, FloatingArray, pipe_apply, XML, flags, case_when, and many more.
