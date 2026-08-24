# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-24T07:18:42Z |
| Iteration Count | 481 |
| Best Metric | 821 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #435 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |



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

### Iteration 481 — 2026-08-24T07:18:42Z — [Run](https://github.com/githubnext/tsb/actions/runs/32700718376)

- **Status**: ✅ Accepted
- **Change**: Added `bench_timedelta_array_arithmetic` — TimedeltaArray.add/sub/mul (both array and scalar operands) plus extended component accessors: .minutes, .milliseconds, .totalMilliseconds, .totalHours, .totalDays
- **Metric**: 821 (previous best: 820, delta: +1)
- **Commit**: a6aea3b5

### Iteration 480 — 2026-08-23T19:03:29Z — [Run](https://github.com/githubnext/tsb/actions/runs/32659855303)

- **Status**: ✅ Accepted
- **Change**: Added `bench_datetime_array_advanced` — hour, minute, second, millisecond, dayofweek, dayofyear, quarter, min, max on 100k-element DatetimeArray with ~10% nulls
- **Metric**: 820 (previous best: 819, delta: +1)
- **Commit**: 6e6f7726

### Iteration 479 — 2026-08-23T07:10:41Z — [Run](https://github.com/githubnext/tsb/actions/runs/32624724971)

- **Status**: ✅ Accepted
- **Change**: Added `bench_to_offset_infer_freq` — `toOffset` (14 freq aliases) and `inferFreq` (daily + month-end series) from `src/tseries/frequencies.ts`
- **Metric**: 819 (previous best: 818, delta: +1)
- **Commit**: ea2e5165

### Iteration 478 — 2026-08-22T19:03:49Z — [Run](https://github.com/githubnext/tsb/actions/runs/32592447666)

- **Status**: ✅ Accepted
- **Change**: Added `bench_cross_joint_entropy` — crossEntropy, jointEntropy, conditionalEntropy from `src/stats/information.ts`
- **Metric**: 818 (previous best: 817, delta: +1)
- **Commit**: c46fbfab

### Iteration 477 — 2026-08-22T07:09:47Z — [Run](https://github.com/githubnext/tsb/actions/runs/32558735667)

- **Status**: ✅ Accepted
- **Change**: Added `bench_holiday_weekday_offset` — Holiday with MO/TH/FR weekday offset constructors, floating holidays (3rd Monday Jan, 4th Thursday Nov, etc.) over 10-year range
- **Metric**: 817 (previous best: 816, delta: +1)
- **Commit**: a73895bb

### Iteration 476 — 2026-08-21T19:09:01Z — [Run](https://github.com/githubnext/tsb/actions/runs/32516695675)

- **Status**: ✅ Accepted
- **Change**: Added `bench_series_between_fn` — seriesBetween standalone function with all 4 inclusive modes (both/left/right/neither) on 100k numeric Series vs pandas Series.between(inclusive=...)
- **Metric**: 816 (previous best: 815, delta: +1)
- **Commit**: cf899e3a

### Iters 473–475 — ✅ 813→815: bench_sort_index_series, bench_js_divergence, bench_renyi_tsallis_vi

### Iters 469–472 — ✅ 809→812: bench_wasm_accelerated, bench_compare_dataframe, bench_nunique, bench_wasm_natsort

### Iters 466–468 — ✅ 806→808: bench_information_divergence, bench_kde (pure-numpy), bench_value_predicates

### Iters 457–465 — ✅ 797→805: bench_resample_agg_fn, bench_style, bench_regression, bench_pca_transform, bench_str_title, bench_merge_asof_forward, bench_fwf, bench_tseries_offsets, bench_elem_ops

### Iters 291–456 — ✅ 503→796: holiday_calendar, join, api_types, read_sql, to_sql, cut_qcut, eval_query, index_setops, masked_array, numeric_extended, datetime_tz, hdf, parquet, polyval, stata, SparseArray, IntegerArray, applymap, string_accessor, many IO/stats/ml benchmarks.
