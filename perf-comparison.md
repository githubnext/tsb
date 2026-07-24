# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-24T01:25:44Z |
| Iteration Count | 419 |
| Best Metric | 757 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #423 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

**Goal**: Benchmark every tsb function vs pandas equivalent. **Metric**: benchmarked_functions (higher is better)

## 🎯 Current Priorities

*(No specific priorities — exploring freely.)*

## 📚 Lessons Learned

- Import `../../src/index.js`. groupby AggNames: sum/mean/min/max/count/std/first/last/size. metric=min(TS,PY).
- Pages workflow: pandas+numpy only (no scipy). Use pure-numpy for gaussianKDE, linregress, etc.
- safeoutputs push: checkout origin/autoloop/perf-comparison directly (no rebase); new files only → small bundle. State metric can diverge; use `ls benchmarks/tsb/*.ts | wc -l`.
- SparseArray: `src/core/sparse.ts`. readExcel/xlsxSheetNames NOT in src/index.ts.
- OLS: `new OLS().fit(X_2d, y)` from `src/stats/regression.ts`.
- hypothesis_tests: pure-numpy; covers ttest1samp/ttestInd/ttestRel/fOneway/pearsonr/spearmanr/mannWhitneyU.
- SQL: MockConnection `insert(tableName, rows, columns, ifExists)`. Python: `sqlite3.connect(":memory:")`.
- IO round-trips (parquet/feather/hdf): BytesIO/Uint8Array buffer pattern. pyarrow/tables: syntax-check only.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- `USFederalHolidayCalendar`. ✅ done in iter 415
- `QuarterEnd/QuarterBegin/BMonthEnd/BMonthBegin/BYearEnd/BYearBegin`: tseries/offsets classes need `d + offset` pattern in pandas (not `offset.apply()`). ✅ done in iter 416
- `firstValidIndex`/`lastValidIndex`. ✅ done in iter 418
- `BooleanArray` extension array (arrays/): benchmarked in iter 419. DatetimeArray/StringArray/TimedeltaArray are next.

## 📊 Iteration History

### Iteration 419 — 2026-07-24 01:25 UTC — [Run §30058807058](https://github.com/githubnext/tsb/actions/runs/30058807058)
✅ +1 → 757: BooleanArray benchmark (100k elements, ~10% nulls, 50 iters): from/any/all/sum/and/or/not/fillna. Python: pd.array(dtype='boolean').

### Iteration 418 — 2026-07-23 13:25 UTC — [Run §30010910150](https://github.com/githubnext/tsb/actions/runs/30010910150)
✅ +1 → 756: firstValidIndex/lastValidIndex benchmark (100k-row Series, NaN at start/end/scattered, 500 iters). Python: Series.first_valid_index()/last_valid_index().
### Iteration 417 — 2026-07-23 01:25 UTC — [Run §29971651261](https://github.com/githubnext/tsb/actions/runs/29971651261)
✅ +1 → 755: inferFreq benchmark (6 frequency types: ms/s/min/h/D/W, 200 dates each, 500 iters). Python: pandas.tseries.frequencies.infer_freq.
### Iteration 416 — 2026-07-22 13:25 UTC — [Run §29923579451](https://github.com/githubnext/tsb/actions/runs/29923579451)
✅ +1 → 754: QuarterEnd/QuarterBegin/BMonthEnd/BMonthBegin/BYearEnd/BYearBegin offsets benchmark (5k dates, 50 iters). Python: pandas.tseries.offsets.
### Iteration 415 — 2026-07-22 01:25 UTC — [Run §29882922346](https://github.com/githubnext/tsb/actions/runs/29882922346)
✅ +1 → 753: USFederalHolidayCalendar.holidays() benchmark (10-year range 2000–2009, 20 iters). Python: pandas.tseries.holiday.USFederalHolidayCalendar.
### Iteration 414 — 2026-07-21 13:25 UTC — [Run §29834097853](https://github.com/githubnext/tsb/actions/runs/29834097853)
✅ +1 → 752: categorical_ops benchmarks (catFromCodes, catSortByFreq, catFreqTable, catCrossTab vs pandas Categorical.from_codes, value_counts, crosstab). 100k rows, 5 categories.
### Iteration 413 — 2026-07-21 01:25 UTC — [Run §29792948080](https://github.com/githubnext/tsb/actions/runs/29792948080)
✅ +1 → 751: readHdf/toHdf benchmark (10k rows × 3 cols, HDF5 round-trip, 20 iters).
### Iteration 412 — 2026-07-20 13:31 UTC — [Run §29746441004](https://github.com/githubnext/tsb/actions/runs/29746441004)
✅ +1 → 750: readParquet/toParquet benchmark (10k rows × 3 cols, Parquet round-trip, 20 iters).
### Iters 291–411 — ✅ 503→749: bootstrap, OLS, hypothesis_tests, entropy, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, IntegerArray, FloatingArray, pipe_apply, readXml/toXml, flags+options, case_when, IO ops, and many more.
