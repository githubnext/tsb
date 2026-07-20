# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-20T13:31:43Z |
| Iteration Count | 412 |
| Best Metric | 750 |
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

- Import `../../src/index.js`. groupby AggNames: sum/mean/min/max/count/std/first/last/size. Python: real triple-quotes. metric=min(TS,PY).
- Pages workflow: pandas+numpy only (no scipy). Use pure-numpy for linregress, gaussianKDE, etc.
- safeoutputs push: checkout origin/autoloop/perf-comparison directly (no rebase); add new files only → small bundle (~3KB/pair). Post-rebase squash causes large diffs → push failure. State metric can diverge; always use `ls benchmarks/tsb/*.ts | wc -l`.
- SparseArray: `src/core/sparse.ts`. readExcel/xlsxSheetNames NOT in src/index.ts.
- OLS: `new OLS().fit(X_2d, y)` from `src/stats/regression.ts`. Python: `np.linalg.lstsq(X_design, y, rcond=None)`.
- hypothesis_tests: use pure-numpy equivalents (no scipy); benchmark suite covers ttest1samp/ttestInd/ttestRel/fOneway/pearsonr/spearmanr/mannWhitneyU in one pair.
- SQL benchmark: use MockConnection with correct `insert(tableName, rows, columns, ifExists)` signature from `SqlConnection` interface. Python uses `sqlite3.connect(":memory:")` for realistic pandas equivalence.
- readParquet/toParquet: IO round-trip follows same pattern as feather (BytesIO buffer). pyarrow required for pandas side but only syntax-checked locally.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- `readHdf`/`toHdf`, `USFederalHolidayCalendar`.

## 📊 Iteration History

### Iteration 412 — 2026-07-20 13:31 UTC — [Run §29746441004](https://github.com/githubnext/tsb/actions/runs/29746441004)
✅ +1 → 750: readParquet/toParquet benchmark (10k rows × 3 cols, Parquet round-trip, 20 iters).
### Iters 405–411 — ✅ 743→749: readSqlQuery+toSql, readSas, toExcel, readFwf, readStata, readFeather, readTable.
### Iters 291–404 — ✅ 503→742: bootstrap, OLS, hypothesis_tests, entropy, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, IntegerArray, FloatingArray, pipe_apply, readXml/toXml, flags+options, case_when, and many more IO/reshape/window/stats/string/datetime operations.
