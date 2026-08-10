# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-10T19:17:26Z |
| Iteration Count | 453 |
| Best Metric | 793 |
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

### Iteration 453 — 2026-08-10T19:17:26Z — [Run](https://github.com/githubnext/tsb/actions/runs/31423078837)

- **Status**: ✅ Accepted
- **Change**: Added `bench_index_setops.ts/.py` — Index.union/intersection/difference on two 10k-element integer indexes (50% overlap), 50 iters
- **Metric**: 793 (previous best: 792, delta: +1)
- **Commit**: a13b8e3

### Iteration 452 — 2026-08-10T07:23:56Z — [Run](https://github.com/githubnext/tsb/actions/runs/31365513170)

- **Status**: ✅ Accepted
- **Change**: Added `bench_to_sql.ts/.py` — `toSql`/`DataFrame.to_sql` write benchmark, 10k-row DataFrame with mock insert adapter, 30 iters
- **Metric**: 792 (previous best: 791, delta: +1)
- **Commit**: efe5493

### Iteration 451 — 2026-08-09T19:10:43Z — [Run](https://github.com/githubnext/tsb/actions/runs/31330835165)

- **Status**: ✅ Accepted
- **Change**: Added `bench_read_sql.ts/.py` — `readSql` auto-dispatch, 10k-row mock adapter, 30 iters
- **Metric**: 791 (previous best: 790, delta: +1)
- **Commit**: d72d405

### Iters 447–450 — ✅ 787→790: holiday_calendar, join, api_types, read_sql_table

### Iters 440–446 — ✅ 778→787: masked_array, chi2/kstest, numeric_extended, sort_index_columns, datetime_tz, hdf, parquet

### Iters 428–439 — ✅ 766→778: polyval, holiday observances, stata, SparseArray, IntegerArray, applymap, string_accessor, clip_with_bounds, swaplevel_df, information_advanced, format_table

### Iters 291–427 — ✅ 503→765: normalizedMI, entropy, gaussianKDE, array types, IO benchmarks, bootstrap, OLS, hypothesis_tests, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, pipe_apply, XML, flags, case_when, and many more.
