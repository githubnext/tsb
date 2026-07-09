# Autoloop: perf-comparison

🤖 *Maintained by Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-09T08:06:10Z |
| Iteration Count | 390 |
| Best Metric | 727 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #361 |
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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

## 🔭 Future Directions

- `bootstrap`, `entropy`/`klDivergence`, `lreshape`, `linregress`/`polyfit_polyval`/`gaussian_kde` (lost in push failures), `readSas`, `USFederalHolidayCalendar`, IntegerArray/FloatingArray, readXml/toXml, readFwf, readStata, readParquet, readFeather, readHdf, toExcel.

## 📊 Iteration History

### Iter 390 — 2026-07-09 — [Run §29003458535](https://github.com/githubnext/tsb/actions/runs/29003458535)
✅ +1 → 727: OLS multiple regression (10k rows×5 predictors, 20 iters). TS: `new OLS().fit(X,y)`. Python: `np.linalg.lstsq`. Actual branch was 726 (iter 389 claimed 729 but files were never pushed). Metric corrected 729→727.

### Iters 386–389 — ⚠️/✅ push issues (branch stayed at 726):
386-388: lreshape/linregress/polyfit — safeoutputs push failed (large post-rebase squash). 389: claimed +3 (729) via 17KB bundle but not actually on remote.

### Iters 378–385 — ✅ 720→726:
+3 (merge_ordered_ffill/by, grouper). +1 add_sub_mul_div. +1 assert_equal. stats benchmarks. +1 SparseArray.

### Iters 291–377 — ✅ 503→720:
IO/reshape/window/stats/string/datetime/sample/pivot/rolling/rank/clip/diff/replace/mask/sort/pct_change/merge_asof/cross_join/join_all/shift/at_iat/convert_dtypes/styler/resample/iterrows/groupby_many/concat_many/str_replace_regex.

