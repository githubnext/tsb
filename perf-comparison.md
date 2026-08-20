# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-20T19:11:07Z |
| Iteration Count | 474 |
| Best Metric | 814 |
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

### Iteration 474 — 2026-08-20T19:11:07Z — [Run](https://github.com/githubnext/tsb/actions/runs/32406958975)

- **Status**: ✅ Accepted
- **Change**: Added `bench_js_divergence` — jsDivergence, jsDistance, crossEntropy, conditionalEntropy (N=1000) vs numpy equivalents
- **Metric**: 814 (previous best: 813, delta: +1)
- **Commit**: 1306df54

### Iteration 473 — 2026-08-20T02:10:00Z — [Run](https://github.com/githubnext/tsb/actions/runs/32372895465)

- **Status**: ✅ Accepted
- **Change**: Added `bench_sort_index_series` — sortIndexSeries (ascending/descending, numeric and string index, 100k rows) vs pandas Series.sort_index()
- **Metric**: 813 (previous best: 812, delta: +1)
- **Commit**: c70d0c3

### Iters 469–472 — ✅ 809→812: bench_wasm_accelerated, bench_compare_dataframe, bench_nunique, bench_wasm_natsort

### Iters 466–468 — ✅ 806→808: bench_information_divergence, bench_kde (pure-numpy), bench_value_predicates

### Iters 457–465 — ✅ 797→805: bench_resample_agg_fn, bench_style, bench_regression, bench_pca_transform, bench_str_title, bench_merge_asof_forward, bench_fwf, bench_tseries_offsets, bench_elem_ops

### Iters 291–456 — ✅ 503→796: holiday_calendar, join, api_types, read_sql, to_sql, cut_qcut, eval_query, index_setops, masked_array, numeric_extended, datetime_tz, hdf, parquet, polyval, stata, SparseArray, IntegerArray, applymap, string_accessor, many IO/stats/ml benchmarks.
