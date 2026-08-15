# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-15T01:45:06Z |
| Iteration Count | 462 |
| Best Metric | 802 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #435 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked.

## 📊 Iteration History

### Iteration 462 — 2026-08-15T01:45:06Z — [Run](https://github.com/githubnext/tsb/actions/runs/31856202878)
- **Status**: ✅ Accepted | **Metric**: 802 (+1) | **Commit**: d19f908
- bench_merge_asof_forward: mergeAsof with direction="forward" (smallest right key >= left key) on 10k-row DataFrames; only backward direction was previously covered.

### Iteration 461 — 2026-08-14T13:22:15Z — [Run](https://github.com/githubnext/tsb/actions/runs/31804160800)
- **Status**: ✅ Accepted | **Metric**: 801 (+1) | **Commit**: 98dcf89
- bench_str_title: Series.str.title() titlecase conversion on 100k strings; pandas Series.str.title() equivalent.

### Iteration 460 — 2026-08-13T20:00:00Z — [Run](https://github.com/githubnext/tsb/actions/runs/31779566673)
- **Status**: ✅ Accepted | **Metric**: 800 (+1) | **Commit**: 9e0b94f
- bench_pca_transform: PCA.fitTransform, result.transform, result.inverseTransform on 1000×10→5 dataset; numpy SVD Python equivalent.

### Iteration 459 — 2026-08-13T19:19:42Z — [Run](https://github.com/githubnext/tsb/actions/runs/31734998176)
- **Status**: ✅ Accepted | **Metric**: 799 (+1) | **Commit**: b70653a
- bench_regression: linregress + OLS (lstsq) on 10k-row dataset; pure-numpy Python equivalent.

### Iteration 458 — 2026-08-13T07:23:54Z — [Run](https://github.com/githubnext/tsb/actions/runs/31677401936)
- **Status**: ✅ Accepted | **Metric**: 798 (+1) | **Commit**: 2fbbf0a
- bench_style: DataFrame Styler API (highlightMax, highlightMin, format, backgroundGradient → toHtml) on 200-row DataFrame.

### Iteration 457 — 2026-08-12T19:18:54Z — [Run](https://github.com/githubnext/tsb/actions/runs/31631782373)
- **Status**: ✅ Accepted | **Metric**: 797 (+1) | **Commit**: ff2a1b7
- bench_resample_agg_fn: SeriesResampler.agg() with custom functions on 50k-row data.

### Iters 453–456 — ✅ 793→796: bench_cut_qcut, bench_resample_label_closed, bench_eval_query_functions, bench_index_setops

### Iters 447–452 — ✅ 787→792: holiday_calendar, join, api_types, read_sql_table, read_sql, to_sql

### Iters 440–446 — ✅ 778→787: masked_array, chi2/kstest, numeric_extended, sort_index_columns, datetime_tz, hdf, parquet

### Iters 428–439 — ✅ 766→778: polyval, holiday observances, stata, SparseArray, IntegerArray, applymap, string_accessor, clip_with_bounds, swaplevel_df, information_advanced, format_table

### Iters 291–427 — ✅ 503→765: normalizedMI, entropy, gaussianKDE, array types, IO benchmarks, bootstrap, OLS, hypothesis_tests, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, pipe_apply, XML, flags, case_when, and many more.
