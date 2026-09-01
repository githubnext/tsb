# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-09-01T07:03:02Z |
| Iteration Count | 497 |
| Best Metric | 837 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #461 |
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

- Import `../../src/index.js`. metric=min(TS,PY). groupby AggNames: sum/mean/min/max/count/std/first/last/size.
- Pages workflow: pandas+numpy only (no scipy). Use pure-numpy for KDE, linregress, etc.
- OLS: `new OLS().fit(X_2d, y)`. SparseArray: `src/core/sparse.ts`.
- IO round-trips: BytesIO/Uint8Array buffer pattern for parquet/feather/hdf/stata.
- pandas TimedeltaArray: has `.days`/`.seconds`/`.total_seconds()` but NOT `.hours`.
- `tabulate` must be installed for `to_markdown`; auto-install via subprocess if missing.
- hypothesis tests (kstest, chi2_contingency) need scipy — available in CI.
- `join`: `join(left, right, { how: "left" })` from `src/merge/join.ts`.
- `readSql` dispatches: query-like → `readSqlQuery`; table name → `readSqlTable`.
- Index.union/intersection/difference are distinct from symmetricDifference.
- WASM-accelerated functions (searchsortedAccelerated etc.) live in `src/wasm/index.ts`, not `src/index.ts` — import directly from `../../src/wasm/index.ts`.
- `nuniqueSeries`/`nuniqueDataFrame` import from `../../src/stats/index.js`.
- MO/TU/WE/TH/FR/SA/SU weekday offset constructors exported from `src/index.js`; Holiday offset param accepts WeekdayOffset directly.
- `toOffset` / `inferFreq` live in `src/tseries/frequencies.ts` — import from `../../src/index.js`.
- SparseArray.fromSparse(length, indices, values, fill) takes COO representation; SparseDtype(subtype, fill_value) mirrors pd.SparseDtype; pandas equivalent uses pd.arrays.SparseArray(dense, fill_value=...).
- Expanding wasm functions (expandingMin/Max/Var/Std/MedianF64Accelerated) take (data, minPeriods) — use SIZE=10k for median (O(n²) fallback).
- `stack(df)` / `df.stack()` and `series.unstack()` from `src/reshape/stack_unstack.ts`; pandas uses `future_stack=True` to avoid deprecation warning.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked (numeric_ops, where_mask, etc.).

## 📊 Iteration History

### Iteration 497 — 2026-09-01T07:03:02Z — [Run](https://github.com/githubnext/tsb/actions/runs/33480036252)

- **Status**: ✅ Accepted
- **Change**: Added `bench_cat_accessor_mutation` — CategoricalAccessor mutation methods (removeCategories, renameCategories, setCategories, reorderCategories, asOrdered, asUnordered)
- **Metric**: 837 (previous best: 836, delta: +1)
- **Commit**: ef191e61
- **Notes**: Covered the 6 mutation methods on CategoricalAccessor not benchmarked in bench_cat_accessor.ts. Both TS and Python use N=50k dataset with 5-category series.

### Iteration 496 — 2026-08-31T18:58:23Z — [Run](https://github.com/githubnext/tsb/actions/runs/33427668624)

- **Status**: ✅ Accepted
- **Change**: Added `bench_series_digitize_cv` — seriesDigitize and coefficientOfVariation on 100k-element Series
- **Metric**: 836 (previous best: 835, delta: +1)
- **Commit**: bd27092e

### Iteration 495 — 2026-08-31T07:09:02Z — [Run](https://github.com/githubnext/tsb/actions/runs/33366886818)

- **Status**: ✅ Accepted
- **Change**: Added `bench_stack_unstack` — DataFrame.stack() and Series.unstack() on 1000×5 DataFrame
- **Metric**: 835 (previous best: 834, delta: +1)
- **Commit**: 85b793ca

### Iteration 494 — 2026-08-30T18:57:42Z — [Run](https://github.com/githubnext/tsb/actions/runs/33329400368)

- **Status**: ✅ Accepted
- **Change**: Added `bench_wasm_expanding_stats` — expandingMin/Max/Var/Std/MedianF64Accelerated on 10k-element array
- **Metric**: 834 (previous best: 833, delta: +1)
- **Commit**: 98554366

### Iters 488–493 — ✅ 828→833: sparse_array_advanced, datetime_index_min_max, wasm_rolling_sum_mean, wasm_rolling_stats, wasm_agg_ops, string_array_cat

### Iters 482–487 — ✅ 821→827: to_dict_series_orient, register_option, multi_index_to_list, string_array_str_ops, series_rename_ops, ewm

### Iters 476–481 — ✅ 815→821: bench_series_between, bench_sort_index, bench_js_divergence, bench_renyi_tsallis, bench_wasm_accelerated_ext, bench_holiday_offset, bench_datetime_array_advanced, bench_timedelta_array_arithmetic

### Iters 291–475 — ✅ 503→815: holiday_calendar, join, api_types, read_sql, to_sql, cut_qcut, eval_query, index_setops, masked_array, numeric_extended, datetime_tz, hdf, parquet, polyval, stata, SparseArray, IntegerArray, applymap, string_accessor, many IO/stats/ml benchmarks.
