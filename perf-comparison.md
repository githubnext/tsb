# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-12T07:23:25Z |
| Iteration Count | 456 |
| Best Metric | 796 |
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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked.

## 📊 Iteration History

### Iteration 456 — 2026-08-12T07:23:25Z — [Run](https://github.com/githubnext/tsb/actions/runs/31573572340)

- **Status**: ✅ Accepted
- **Change**: Added `bench_cut_qcut.ts/.py` — fixed-bin cut and quantile-based qcut on 100k-row data, 50 iters
- **Metric**: 796 (previous best: 795, delta: +1)
- **Commit**: 47467e8
- **Notes**: `cut_qcut` was unbenchmarked; both TS and Python use identical 100k sinusoidal dataset with 10 bins.

### Iteration 455 — 2026-08-11T19:18:41Z — [Run](https://github.com/githubnext/tsb/actions/runs/31526954579)

- **Status**: ✅ Accepted
- **Change**: Added `bench_resample_label_closed.ts/.py` — SeriesResampler with explicit `label` options (label="right" and label="left") on a 50k-row hourly series, 30 iters
- **Metric**: 795 (previous best: 794, delta: +1)
- **Commit**: dfb1903
- **Notes**: Tests the non-default label path where keyToLabel must convert group keys (e.g. label="right" on hourly frequency whose default is "left").

### Iteration 454 — 2026-08-11T08:05:00Z — [Run](https://github.com/githubnext/tsb/actions/runs/31468446578)

- **Status**: ✅ Accepted
- **Change**: Added `bench_eval_query_functions.ts/.py` — queryDataFrame/evalDataFrame with built-in functions: abs(), round(), lower(), isnull(), and `in` membership operator on a 50k-row DataFrame, 20 iters
- **Metric**: 794 (previous best: 793, delta: +1)
- **Commit**: 7b54cd6
- **Notes**: Tests a distinct code path in the expression evaluator not covered by the existing bench_eval_query benchmark (which only used comparison and arithmetic operators).

### Iteration 453 — 2026-08-10T19:17:26Z — [Run](https://github.com/githubnext/tsb/actions/runs/31423078837)

- **Status**: ✅ Accepted
- **Change**: Added `bench_index_setops.ts/.py` — Index.union/intersection/difference on two 10k-element integer indexes (50% overlap), 50 iters
- **Metric**: 793 (previous best: 792, delta: +1)
- **Commit**: a13b8e3

### Iters 447–453 — ✅ 787→793: holiday_calendar, join, api_types, read_sql_table, read_sql, to_sql, index_setops

### Iters 440–446 — ✅ 778→787: masked_array, chi2/kstest, numeric_extended, sort_index_columns, datetime_tz, hdf, parquet

### Iters 428–439 — ✅ 766→778: polyval, holiday observances, stata, SparseArray, IntegerArray, applymap, string_accessor, clip_with_bounds, swaplevel_df, information_advanced, format_table

### Iters 291–427 — ✅ 503→765: normalizedMI, entropy, gaussianKDE, array types, IO benchmarks, bootstrap, OLS, hypothesis_tests, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, pipe_apply, XML, flags, case_when, and many more.
