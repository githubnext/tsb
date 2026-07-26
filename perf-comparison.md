# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-26T13:22:52Z |
| Iteration Count | 424 |
| Best Metric | 762 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #435 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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
- pandas TimedeltaArray: has `.days`/`.seconds`/`.total_seconds()` but NOT `.hours`/`.notna()`. Use `~arr.isna()` for notna. Use small nanosecond values to avoid overflow in `.sum()`.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- Explore remaining tsb functions not yet benchmarked.

## 📊 Iteration History

### Iteration 424 — 2026-07-26 13:22 UTC — [Run §30203838065](https://github.com/githubnext/tsb/actions/runs/30203838065)
✅ +1 → 762: mode benchmark (100k-element Series, 10 distinct values, 10 iters): modeSeries. Python: pd.Series.mode().

### Iteration 423 — 2026-07-26 01:55 UTC — [Run §30182788398](https://github.com/githubnext/tsb/actions/runs/30182788398)
✅ +1 → 761: gaussianKDE benchmark (10k bimodal data, 200 eval points, 20 iters): evaluate + integrate. Python: pure-numpy Silverman-bandwidth KDE (no scipy).

### Iteration 422 — 2026-07-25 13:23 UTC — [Run §30159549081](https://github.com/githubnext/tsb/actions/runs/30159549081)
✅ +1 → 760: TimedeltaArray benchmark (100k elements, ~10% nulls, 50 iters): from/days/hours/totalSeconds/isna/notna/sum/min/max/fillna. Python: pd.array(dtype='timedelta64[ns]').

### Iteration 421 — 2026-07-25 01:28 UTC — [Run §30138360760](https://github.com/githubnext/tsb/actions/runs/30138360760)
✅ +1 → 759: DatetimeArray benchmark (100k elements, ~10% nulls, 50 iters): from/year/month/day/isna/notna/fillna. Python: pd.array(dtype='datetime64[ns]').

### Iteration 420 — 2026-07-24 13:24 UTC — [Run §30096576504](https://github.com/githubnext/tsb/actions/runs/30096576504)
✅ +1 → 758: StringArray benchmark (100k elements, ~10% nulls, 50 iters): from/upper/lower/strip/contains/len/fillna. Python: pd.array(dtype='string').

### Iteration 419 — 2026-07-24 01:25 UTC — [Run §30058807058](https://github.com/githubnext/tsb/actions/runs/30058807058)
✅ +1 → 757: BooleanArray benchmark (100k elements, ~10% nulls, 50 iters): from/any/all/sum/and/or/not/fillna. Python: pd.array(dtype='boolean').

### Iteration 412 — 2026-07-20 13:31 UTC — [Run §29746441004](https://github.com/githubnext/tsb/actions/runs/29746441004)
✅ +1 → 750: readParquet/toParquet benchmark (10k rows × 3 cols, Parquet round-trip, 20 iters).
### Iters 291–411 — ✅ 503→749: bootstrap, OLS, hypothesis_tests, entropy, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, IntegerArray, FloatingArray, pipe_apply, readXml/toXml, flags+options, case_when, IO ops, and many more.
