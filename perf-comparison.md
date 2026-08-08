# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-08-08T19:09:46Z |
| Iteration Count | 449 |
| Best Metric | 789 |
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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked.

## 📊 Iteration History

### Iteration 449 — 2026-08-08T19:09:46Z — [Run](https://github.com/githubnext/tsb/actions/runs/31273616761)

- **Status**: ✅ Accepted
- **Change**: Added `bench_api_types.ts/.py` — `api.types` predicates (isScalar, isListLike, isNumericDtype, isIntegerDtype, isBoolDtype, isCategoricalDtype, etc.) on 7 values + 8 dtypes, 30 iters
- **Metric**: 789 (previous best: 788, delta: +1)
- **Commit**: ed749f3
- **Notes**: Covers the `pd_api` module (`src/core/pd_api.ts`) which had no benchmark yet; pandas equivalent uses `pd.api.types.*` predicates.

### Iteration 448 — 2026-08-08T07:16:13Z — [Run](https://github.com/githubnext/tsb/actions/runs/31245670724)

- **Status**: ✅ Accepted
- **Change**: Added `bench_read_sql_table.ts/.py` — `readSqlTable` on 10k-row mock adapter (3 columns), 30 iters; Python uses `pd.read_sql_query("SELECT * FROM sensors", sqlite_conn)`
- **Metric**: 788 (previous best: 787, delta: +1)
- **Commit**: 15edd35
- **Notes**: Covers the `readSqlTable` code path (table-name validation via `listTables()` + SELECT dispatch); distinct from the existing `bench_sql.ts` which covers `readSqlQuery`/`toSql`.

### Iteration 447 — 2026-08-07T19:16:32Z — [Run](https://github.com/githubnext/tsb/actions/runs/31210523668)

- **Status**: ✅ Accepted
- **Change**: Added `bench_holiday_calendar.ts/.py` — `AbstractHolidayCalendar`, `Holiday`, `register_calendar`, `get_calendar`; custom 5-rule calendar, 20-year holiday generation, 50 iters
- **Metric**: 787 (previous best: 786, delta: +1)
- **Commit**: 5ca3980
- **Notes**: Covers the custom holiday calendar API path; pandas equivalent uses `pandas.tseries.holiday.AbstractHolidayCalendar`, `Holiday`, and `register`.

### Iters 440–447 — ✅ 778→787: masked_array, chi2/kstest, numeric_extended, sort_index_columns, datetime_tz, hdf, parquet, holiday_calendar

### Iters 428–439 — ✅ 766→778: polyval, holiday observances, stata, SparseArray, IntegerArray, applymap, string_accessor, clip_with_bounds, swaplevel_df, information_advanced, format_table

### Iters 291–427 — ✅ 503→765: normalizedMI, entropy, gaussianKDE, array types, IO benchmarks, bootstrap, OLS, hypothesis_tests, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, pipe_apply, XML, flags, case_when, and many more.
