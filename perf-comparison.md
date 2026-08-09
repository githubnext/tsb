# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-09T19:10:43Z |
| Iteration Count | 451 |
| Best Metric | 791 |
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

- Import `../../src/index.js`. groupby AggNames: sum/mean/min/max/count/std/first/last/size. metric=min(TS,PY).
- Pages workflow: pandas+numpy only (no scipy). Use pure-numpy for KDE, linregress, etc.
- SparseArray: `src/core/sparse.ts`. readExcel/xlsxSheetNames NOT in src/index.ts.
- OLS: `new OLS().fit(X_2d, y)` from `src/stats/regression.ts`.
- IO round-trips (parquet/feather/hdf/stata): BytesIO/Uint8Array buffer pattern; `toStata`→`readStata` for Stata .dta files.
- pandas TimedeltaArray: has `.days`/`.seconds`/`.total_seconds()` but NOT `.hours`. Use `~arr.isna()` for notna.
- `tabulate` (required by pandas `to_markdown`) must be installed; Python benchmark auto-installs it via subprocess if missing.
- holiday observance fns: `pandas.tseries.holiday` has `nearest_workday`, `next_monday`, `next_monday_or_tuesday`, `previous_friday`, `previous_workday`, `sunday_to_monday`.
- Python benchmarks for hypothesis tests (kstest, chi2_contingency) need scipy — available in CI via `pip install scipy`.
- `join` (index-based): `join(left, right, { how: "left" })` from `src/merge/join.ts`; matches `df.join(other, how="left")` in pandas.
- `readSql` dispatches: if input looks like SQL query → `readSqlQuery`; otherwise → `readSqlTable`. Python equivalent: `pd.read_sql()` with sqlite3 connection handles both cases.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked.

## 📊 Iteration History

### Iteration 451 — 2026-08-09T19:10:43Z — [Run](https://github.com/githubnext/tsb/actions/runs/31330835165)

- **Status**: ✅ Accepted
- **Change**: Added `bench_read_sql.ts/.py` — `readSql` auto-dispatch (query path + table path), 10k-row mock adapter, 30 iters
- **Metric**: 791 (previous best: 790, delta: +1)
- **Commit**: d72d405
- **Notes**: Covers the `readSql` dispatch function in `src/io/sql.ts`; pandas equivalent uses `pd.read_sql()` with an in-memory SQLite connection.

### Iters 447–450 — ✅ 787→790: holiday_calendar, join, api_types, read_sql_table

### Iters 440–446 — ✅ 778→787: masked_array, chi2/kstest, numeric_extended, sort_index_columns, datetime_tz, hdf, parquet

### Iters 428–439 — ✅ 766→778: polyval, holiday observances, stata, SparseArray, IntegerArray, applymap, string_accessor, clip_with_bounds, swaplevel_df, information_advanced, format_table

### Iters 291–427 — ✅ 503→765: normalizedMI, entropy, gaussianKDE, array types, IO benchmarks, bootstrap, OLS, hypothesis_tests, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, pipe_apply, XML, flags, case_when, and many more.
