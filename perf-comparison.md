# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-29T12:58:19Z |
| Iteration Count | 491 |
| Best Metric | 831 |
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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked (format_ops, etc.).

## 📊 Iteration History

### Iteration 491 — 2026-08-29T12:58:19Z — [Run](https://github.com/githubnext/tsb/actions/runs/33253694015)

- **Status**: ✅ Accepted
- **Change**: Added `bench_wasm_rolling_sum_mean` — rollingSumF64Accelerated, rollingMeanF64Accelerated, expandingSumF64Accelerated, expandingMeanF64Accelerated on 100k float64 array
- **Metric**: 831 (previous best: 830, delta: +1)
- **Commit**: 5d7effde
- **Notes**: These 4 WASM-accelerated functions were the only remaining uncovered accelerated.ts exports; mirrors pandas Series.rolling(50).sum/mean and Series.expanding().sum/mean.

### Iteration 490 — 2026-08-29T01:05:43Z — [Run](https://github.com/githubnext/tsb/actions/runs/33225322029)

- **Status**: ✅ Accepted
- **Change**: Added `bench_series_rename_ops` — addPrefixSeries/addSuffixSeries/setAxisSeries/setAxisDataFrame/seriesToFrame on 100k-element inputs
- **Metric**: 830 (previous best: 829, delta: +1)
- **Commit**: fd0704ae
- **Notes**: These 5 exported functions from src/stats/rename_ops.ts had no dedicated benchmark pair; mirrors pandas Series.add_prefix/add_suffix/set_axis, DataFrame.set_axis, Series.to_frame.

### Iters 488–490 — ✅ 828→830: ewm, string_array_cat, series_rename_ops

### Iters 482–487 — ✅ 821→827: wasm_agg_ops, wasm_rolling_stats, to_dict_series_orient, register_option, multi_index_to_list, string_array_str_ops

### Iters 476–481 — ✅ 815→821: bench_series_between, bench_sort_index, bench_js_divergence, bench_renyi_tsallis, bench_wasm_accelerated_ext, bench_holiday_offset, bench_datetime_array_advanced, bench_timedelta_array_arithmetic

### Iters 291–475 — ✅ 503→815: holiday_calendar, join, api_types, read_sql, to_sql, cut_qcut, eval_query, index_setops, masked_array, numeric_extended, datetime_tz, hdf, parquet, polyval, stata, SparseArray, IntegerArray, applymap, string_accessor, many IO/stats/ml benchmarks.
