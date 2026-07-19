# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-19T01:26:00Z |
| Iteration Count | 409 |
| Best Metric | 747 |
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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- `USFederalHolidayCalendar`, readParquet, readFeather, readHdf.

## 📊 Iteration History

### Iteration 409 — 2026-07-19 — [Run §29668492326](https://github.com/githubnext/tsb/actions/runs/29668492326)
✅ +1 → 747: readStata benchmark (10k rows, int32/float64/string cols, toStata round-trip, 20 iters).
### Iteration 408 — 2026-07-18 — [Run §29645946373](https://github.com/githubnext/tsb/actions/runs/29645946373)
✅ +1 → 746: readFwf benchmark (10k rows × 4 cols fixed-width, 10 iters, explicit colspecs).
### Iteration 407 — 2026-07-18 — [Run §29625071540](https://github.com/githubnext/tsb/actions/runs/29625071540)
✅ +1 → 745: toExcel benchmark (5k-row DataFrame, 20 iters, in-memory XLSX serialization).
### Iteration 406 — 2026-07-17 — [Run §29583613301](https://github.com/githubnext/tsb/actions/runs/29583613301)
✅ +1 → 744: readSas benchmark (XPORT v5, 3 numeric+1 char, IBM 370 float encoder).
### Iter 405 — ✅ +1→743: readSqlQuery+toSql benchmark.
### Iters 291–404 — ✅ 503→742: bootstrap, OLS, hypothesis_tests, entropy, mutualInfo, lreshape, linregress/polyfit, contingency, multivariate/PCA, IntegerArray, FloatingArray, pipe_apply, readXml/toXml, flags+options, case_when, and many more IO/reshape/window/stats/string/datetime operations.
