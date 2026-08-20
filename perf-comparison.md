# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-20T01:22:47Z |
| Iteration Count | 472 |
| Best Metric | 812 |
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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked (format_ops, etc.).

## 📊 Iteration History

### Iteration 472 — 2026-08-20T01:22:47Z — [Run](https://github.com/githubnext/tsb/actions/runs/32320623603)

- **Status**: ✅ Accepted
- **Change**: Added `bench_wasm_natsort` — natCompareAccelerated/natSortedAccelerated/natArgSortAccelerated from `src/wasm/index.ts` vs Python natsort package (with fallback to manual key)
- **Metric**: 812 (previous best: 811, delta: +1)
- **Commit**: 917daff

### Iteration 471 — 2026-08-19T13:14:31Z — [Run](https://github.com/githubnext/tsb/actions/runs/32256666621)

- **Status**: ✅ Accepted
- **Change**: Added `bench_nunique` — nuniqueSeries/nuniqueDataFrame (numeric + string Series, 4-col DataFrame, 100k rows, 1000 distinct values, 50 iters) vs pandas Series.nunique()/DataFrame.nunique()
- **Metric**: 811 (previous best: 810, delta: +1)
- **Commit**: aa5bd50

### Iteration 470 — 2026-08-19T01:22:35Z — [Run](https://github.com/githubnext/tsb/actions/runs/32204535885)

- **Status**: ✅ Accepted
- **Change**: Added `bench_compare_dataframe` — dataFrameEq/Ne/Lt/Gt/Le/Ge vs scalar and DataFrame (10k rows, 4 cols, 100 iters)
- **Metric**: 810 (previous best: 809, delta: +1)
- **Commit**: d81c690

### Iteration 469 — 2026-08-18T13:14:06Z — [Run](https://github.com/githubnext/tsb/actions/runs/32140867086)

- **Status**: ✅ Accepted
- **Change**: Added `bench_wasm_accelerated` (searchsortedAccelerated, searchsortedManyAccelerated, argsortScalarsAccelerated from `src/wasm/index.ts` vs numpy)
- **Metric**: 809 (previous best: 808, delta: +1)
- **Commit**: d543b0c

### Iters 466–468 — ✅ 806→808: bench_information_divergence, bench_kde (pure-numpy), bench_value_predicates

### Iters 457–465 — ✅ 797→805: bench_resample_agg_fn, bench_style, bench_regression, bench_pca_transform, bench_str_title, bench_merge_asof_forward, bench_fwf, bench_tseries_offsets, bench_elem_ops

### Iters 291–456 — ✅ 503→796: holiday_calendar, join, api_types, read_sql, to_sql, cut_qcut, eval_query, index_setops, masked_array, numeric_extended, datetime_tz, hdf, parquet, polyval, stata, SparseArray, IntegerArray, applymap, string_accessor, many IO/stats/ml benchmarks.
