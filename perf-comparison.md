# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-21T01:25:07Z |
| Iteration Count | 413 |
| Best Metric | 751 |
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

- `USFederalHolidayCalendar`.

## 📊 Iteration History

### Iteration 413 — 2026-07-21 01:25 UTC — [Run §29792948080](https://github.com/githubnext/tsb/actions/runs/29792948080)
✅ +1 → 751: readHdf/toHdf benchmark (10k rows × 3 cols, HDF5 round-trip, 20 iters). Python uses `to_hdf`/`read_hdf` with `tables` backend.
### Iteration 412 — 2026-07-20 13:31 UTC — [Run §29746441004](https://github.com/githubnext/tsb/actions/runs/29746441004)
✅ +1 → 750: readParquet/toParquet benchmark (10k rows × 3 cols, Parquet round-trip, 20 iters).
### Iters 291–411 — ✅ 503→749: bootstrap, OLS, hypothesis_tests, entropy, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, IntegerArray, FloatingArray, pipe_apply, readXml/toXml, flags+options, case_when, IO ops (readSqlQuery, readSas, toExcel, readFwf, readStata, readFeather, readTable), and many more.
