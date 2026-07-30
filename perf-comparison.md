# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-30T19:25:00Z |
| Iteration Count | 432 |
| Best Metric | 770 |
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
- polyval: Python equivalent is `numpy.polyval`; benchmark with degree-N polynomial at 100k points.
- holiday observance fns: `pandas.tseries.holiday` has `nearest_workday`, `next_monday`, `next_monday_or_tuesday`, `previous_friday`, `previous_workday`, `sunday_to_monday`.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked.

## 📊 Iteration History

### Iteration 432 — 2026-07-30 19:25 UTC — [Run §30574434717](https://github.com/githubnext/tsb/actions/runs/30574434717)
✅ +1 → 770: SparseArray arithmetic/utility ops benchmark (add, mul, fillna, slice, toCoo, std, min, max; 100k array, 5% density, 30 iters). Python: pd.arrays.SparseArray equivalents.

### Iters 428–431 — ✅ 766→769: polyval, holiday observances, information_extended, stata round-trip.

### Iters 419–427 — ✅ 757→765: normalizedMI, jointEntropy/conditionalEntropy/VOI, renyiEntropy/tsallisEntropy/jsDivergence, mode, gaussianKDE, TimedeltaArray, DatetimeArray, StringArray, BooleanArray.

### Iters 412–418 — ✅ 750→756: readParquet/toParquet and various array/IO benchmarks.

### Iters 291–411 — ✅ 503→749: bootstrap, OLS, hypothesis_tests, entropy, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, IntegerArray, FloatingArray, pipe_apply, XML, flags, case_when, and many more.
