# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-06T13:27:32Z |
| Iteration Count | 445 |
| Best Metric | 785 |
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
- Python benchmarks for hypothesis tests (kstest, chi2_contingency) need scipy — available in CI via `pip install scipy`.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked.

## 📊 Iteration History

### Iteration 445 — 2026-08-06T13:27:32Z — [Run](https://github.com/githubnext/tsb/actions/runs/31105723794)

- **Status**: ✅ Accepted
- **Change**: Added `bench_hdf.ts/.py` — `toHdf`/`readHdf` round-trip on 5k-row DataFrame (int+float+string columns), 20 iters
- **Metric**: 785 (previous best: 784, delta: +1)
- **Commit**: 8ba6bb0
- **Notes**: Covers the HDF5 I/O code path; Python equivalent uses `df.to_hdf` / `pd.read_hdf` with a temp file.

### Iteration 444 — 2026-08-06T01:25:14Z — [Run](https://github.com/githubnext/tsb/actions/runs/31062534316)

- **Status**: ✅ Accepted
- **Change**: Added `bench_datetime_tz.ts/.py` — `tz_localize` (naive→tz-aware) + `tz_convert` (tz→tz) on 10k-element DatetimeIndex, 3 ops/iter, 50 iters
- **Metric**: 784 (previous best: 783, delta: +1)
- **Commit**: 3fd006a
- **Notes**: Covers the timezone-aware DatetimeIndex code path; pandas equivalent uses `DatetimeIndex.tz_localize` / `tz_convert`.

### Iteration 443 — 2026-08-05T13:28:08Z — [Run](https://github.com/githubnext/tsb/actions/runs/31010097715)

- **Status**: ✅ Accepted
- **Change**: Added `bench_sort_index_columns.ts/.py` — `sortIndexDataFrame` with `axis=1` (sort column labels), 50-col 100k-row DataFrame, ascending+descending, 30 iters
- **Metric**: 783 (previous best: 782, delta: +1)
- **Commit**: 806b80b
- **Notes**: Exercises the axis=1 code path of sortIndexDataFrame (column-label sort), distinct from the existing row-index sort benchmarks. Clear pandas equivalent via `df.sort_index(axis=1)`.

### Iters 440–442 — ✅ 778→782: masked_array/frequencies, chi2_contingency/kstest_jarquebera, numeric_extended (digitize/histogram/linspace/arange/zscore/minmax/percentile)

### Iters 435–439 — ✅ 773→778: string_accessor, clip_with_bounds, swaplevel_df, information_advanced, format_table

### Iters 432–434 — ✅ 770→772: SparseArray, IntegerArray, applymap

### Iters 428–431 — ✅ 766→769: polyval, holiday observances, information_extended, stata round-trip.

### Iters 291–427 — ✅ 503→765: normalizedMI, entropy, gaussianKDE, array types, IO benchmarks, bootstrap, OLS, hypothesis_tests, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, pipe_apply, XML, flags, case_when, and many more.
