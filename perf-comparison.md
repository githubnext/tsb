# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-26T07:13:49Z |
| Iteration Count | 485 |
| Best Metric | 825 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #461 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |



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

### Iteration 485 — 2026-08-26T07:13:49Z — [Run](https://github.com/githubnext/tsb/actions/runs/32941495823)

- **Status**: ✅ Accepted
- **Change**: Added `bench_register_option` — benchmarks `registerOption` with and without validator, plus get/set/reset on custom keys; mirrors pandas `pd.core.config.register_option`
- **Metric**: 825 (previous best: 824, delta: +1)
- **Commit**: c0902886
- **Notes**: `registerOption` was the only export from `src/core/options.ts` not yet benchmarked; all other options functions (getOption/setOption/resetOption/describeOption/optionContext) already had coverage.

### Iteration 484 — 2026-08-25T19:10:15Z — [Run](https://github.com/githubnext/tsb/actions/runs/32887698741)

- **Status**: ✅ Accepted
- **Change**: Added `bench_to_dict_series_orient` — benchmarks `toDictOriented(df, "series")` (converts DataFrame columns to Series objects), mirroring pandas `df.to_dict(orient="series")`
- **Metric**: 824 (previous best: 823, delta: +1)
- **Commit**: 6808d338
- **Notes**: The "series" orient for toDictOriented was the only variant not yet benchmarked; existing bench_to_dict_oriented_all only covered "records", "list", and "split" orients.

### Iteration 483 — 2026-08-25T07:13:27Z — [Run](https://github.com/githubnext/tsb/actions/runs/32820317584)

- **Status**: ✅ Accepted
- **Change**: Added `bench_wasm_rolling_stats` — remaining WASM rolling/expanding stats (min/max/var/std/median) not covered by bench_wasm_agg_ops
- **Metric**: 823 (previous best: 822, delta: +1)
- **Commit**: 11976600
- **Notes**: bench_wasm_agg_ops only covered rollingSum/rollingMean/expandingSum/expandingMean; this adds rollingMin/Max/Var/Std/Median and expandingMin/Max/Var/Std/Median for complete WASM rolling/expanding coverage.

### Iteration 482 — 2026-08-24T19:10:19Z — [Run](https://github.com/githubnext/tsb/actions/runs/32766310388)

- **Status**: ✅ Accepted
- **Change**: Added `bench_wasm_agg_ops` — WASM-accelerated aggregate ops (sum/mean/min/max/var/std/median + rolling/expanding) vs numpy equivalents
- **Metric**: 822 (previous best: 821, delta: +1)
- **Commit**: 8bc64d05
- **Notes**: The WASM aggregate dispatch wrappers (sumF64Accelerated, meanF64Accelerated, etc.) and rolling/expanding variants were not yet benchmarked; only searchsorted/argsort/natsort WASM functions had coverage.

### Iters 476–481 — ✅ 815→821: bench_series_between, bench_sort_index, bench_js_divergence, bench_renyi_tsallis, bench_wasm_accelerated_ext, bench_holiday_offset, bench_datetime_array_advanced, bench_timedelta_array_arithmetic

### Iters 291–475 — ✅ 503→815: holiday_calendar, join, api_types, read_sql, to_sql, cut_qcut, eval_query, index_setops, masked_array, numeric_extended, datetime_tz, hdf, parquet, polyval, stata, SparseArray, IntegerArray, applymap, string_accessor, many IO/stats/ml benchmarks.
