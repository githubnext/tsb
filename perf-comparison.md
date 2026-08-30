# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-30T06:57:39Z |
| Iteration Count | 493 |
| Best Metric | 833 |
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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked (format_ops, etc.).

## 📊 Iteration History

### Iteration 493 — 2026-08-30T06:57:39Z — [Run](https://github.com/githubnext/tsb/actions/runs/33297998405)

- **Status**: ✅ Accepted
- **Change**: Added `bench_sparse_array_advanced` — SparseArray.fromSparse, withFillValue, at(), SparseDtype on 100k 2%-density sparse array
- **Metric**: 833 (previous best: 832, delta: +1)
- **Commit**: bbd59e8b
- **Notes**: SparseArray.fromSparse (COO constructor), withFillValue (fill sentinel change), element-level at() access, and SparseDtype construction + .equals() had no dedicated benchmark pair; mirrors pd.arrays.SparseArray COO construction, fill_value change, and pd.SparseDtype.

### Iteration 492 — 2026-08-29T13:35:00Z — [Run](https://github.com/githubnext/tsb/actions/runs/33285207528)

- **Status**: ✅ Accepted
- **Change**: Added `bench_datetime_index_min_max` — DatetimeIndex.min(), max(), at(), toArray(), toTimestamps() on 10k-element index
- **Metric**: 832 (previous best: 831, delta: +1)
- **Commit**: dce1128e
- **Notes**: Regular DatetimeIndex min/max/at/toArray/toTimestamps methods had no dedicated benchmark (TZDatetimeIndex was covered by bench_tz_datetime_index_extra). Mirrors pandas DatetimeIndex.min(), max(), index access, to_pydatetime(), asi8.

### Iteration 491 — 2026-08-29T12:58:19Z — [Run](https://github.com/githubnext/tsb/actions/runs/33253694015)

- **Status**: ✅ Accepted
- **Change**: Added `bench_wasm_rolling_sum_mean` — rollingSumF64Accelerated, rollingMeanF64Accelerated, expandingSumF64Accelerated, expandingMeanF64Accelerated
- **Metric**: 831 (previous best: 830, delta: +1)
- **Commit**: 5d7effde

### Iters 490–492 — ✅ 830→832: series_rename_ops, datetime_index_min_max, wasm_rolling_sum_mean

### Iters 482–487 — ✅ 821→827: wasm_agg_ops, wasm_rolling_stats, to_dict_series_orient, register_option, multi_index_to_list, string_array_str_ops

### Iters 476–481 — ✅ 815→821: bench_series_between, bench_sort_index, bench_js_divergence, bench_renyi_tsallis, bench_wasm_accelerated_ext, bench_holiday_offset, bench_datetime_array_advanced, bench_timedelta_array_arithmetic

### Iters 291–475 — ✅ 503→815: holiday_calendar, join, api_types, read_sql, to_sql, cut_qcut, eval_query, index_setops, masked_array, numeric_extended, datetime_tz, hdf, parquet, polyval, stata, SparseArray, IntegerArray, applymap, string_accessor, many IO/stats/ml benchmarks.
