# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-28T16:59:06Z |
| Iteration Count | 489 |
| Best Metric | 829 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #461 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |



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

### Iteration 489 — 2026-08-28T16:59:06Z — [Run](https://github.com/githubnext/tsb/actions/runs/33192323250)

- **Status**: ✅ Accepted
- **Change**: Added `bench_string_array_cat` — StringArray.cat(sep, other) element-wise string concatenation with separator on 100k nullable strings
- **Metric**: 829 (previous best: 828, delta: +1)
- **Commit**: 85dc9453
- **Notes**: StringArray.cat() was the only uncovered StringArray method; mirrors pandas Series.str.cat(other, sep="-") with na_rep=None.

### Iteration 488 — 2026-08-28T03:39:52Z — [Run](https://github.com/githubnext/tsb/actions/runs/33139413271)

- **Status**: ✅ Accepted
- **Change**: Added `bench_ewm` — EWM (Exponentially Weighted Moving) mean/std/var with span=20 on 100k-element Series
- **Metric**: 828 (previous best: 827, delta: +1)
- **Commit**: 56519d05
- **Notes**: ewm() is used heavily in time series analysis; benchmarks span/com/halflife decay modes through the standard mean/std/var aggregations.

### Iteration 487 — 2026-08-27T16:40:17Z — [Run](https://github.com/githubnext/tsb/actions/runs/33094086022)

- **Status**: ✅ Accepted
- **Change**: Added `bench_string_array_str_ops` — StringArray.lstrip/rstrip/startswith/endswith/replace/zfill on 100k nullable strings
- **Metric**: 827 (previous best: 826, delta: +1)
- **Commit**: fceac8ce
- **Notes**: Complements bench_string_array.ts (upper/lower/strip/contains/len/fillna) with the remaining 6 StringArray string methods.

### Iters 482–486 — ✅ 821→826: bench_wasm_agg_ops, bench_wasm_rolling_stats, bench_to_dict_series_orient, bench_register_option, bench_multi_index_to_list

### Iters 476–481 — ✅ 815→821: bench_series_between, bench_sort_index, bench_js_divergence, bench_renyi_tsallis, bench_wasm_accelerated_ext, bench_holiday_offset, bench_datetime_array_advanced, bench_timedelta_array_arithmetic

### Iters 291–475 — ✅ 503→815: holiday_calendar, join, api_types, read_sql, to_sql, cut_qcut, eval_query, index_setops, masked_array, numeric_extended, datetime_tz, hdf, parquet, polyval, stata, SparseArray, IntegerArray, applymap, string_accessor, many IO/stats/ml benchmarks.
