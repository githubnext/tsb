# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration.*

| Field | Value |
|-------|-------|
| Last Run | 2026-07-07T19:29:35Z |
| Iteration Count | 389 |
| Best Metric | 729 |
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

**Goal**: Benchmark every tsb function vs pandas equivalent.
**Metric**: benchmarked_functions (higher is better) · **PR**: #361 · **Issue**: #221

---

## 🎯 Current Priorities

*(No specific priorities set — exploring freely.)*

---

## 📚 Lessons Learned

- Import `../../src/index.js`. groupby AggNames: sum/mean/min/max/count/std/first/last/size. Python: real triple-quotes (not escaped). metric=min(TS,PY).
- Pages workflow installs pandas+numpy only (no scipy). Use pure-numpy for Python benchmarks (linregress, gaussianKDE, etc.).
- safeoutputs push: checkout origin/autoloop/perf-comparison directly (no rebase) then add new files — keeps bundle small (~17KB). Post-rebase squash causes large diffs → push failure. State metric can diverge from actual branch count; always use `ls benchmarks/tsb/*.ts | wc -l`.
- bench_str_extract_all.py / bench_str_extract_groups.py have escaped triple-quotes after every rebase — fix them.
- SparseArray: `src/core/sparse.ts` → fromDense/toDense/sum/mean/add/mul/fillna. Python: `pd.arrays.SparseArray(data, fill_value=0)`.
- readExcel/xlsxSheetNames NOT in src/index.ts (node:zlib excluded) — must inline STORED-only ZIP reader.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Next: `OLS`, `bootstrap`, `entropy`/`klDivergence`, `lreshape` (lost in rebase), `readSas`, `USFederalHolidayCalendar`, IntegerArray/FloatingArray, IO: readXml/toXml, readFwf, readStata, readParquet, readFeather, readHdf, toExcel.

---

## 📊 Iteration History

### Iter 389 — 2026-07-07 — [Run §28892761999](https://github.com/githubnext/tsb/actions/runs/28892761999)
✅ +3 pairs → 729: linregress (10k pts/50 iters), polyfit_polyval (deg-3/10k pts/30 iters), gaussian_kde (1k pts/200 eval/20 iters); all Python use pure-numpy. bun unavailable in sandbox; count 726→729 by file count. Push via 17KB safeoutputs bundle.

### Iters 386–388 — ⚠️ push failed (726→728 in state but branch stayed at 726):
386: lreshape. 387: linregress. 388: linregress+polyfit_polyval. All accepted in state but safeoutputs push failed (large post-rebase squash). Actual branch at 726 going into iter 389.

### Iters 378–385 — ✅ 720→726:
378: +3 (merge_ordered_ffill/by, grouper_class). 379: +1 (add_sub_mul_div). 380: +1 (assert_equal). 381–384: stats benchmarks. 385: +1 SparseArray + fixed 2 py files.

### Iters 291–377 — ✅ 503→720:
291–339: IO/reshape/window/stats/string/datetime. 340–362: sample/pivot/rolling/rank/clip/diff/replace/mask/sort/pct_change. 363–377: merge_asof, cross_join, join_all, shift, sort, at/iat, convert_dtypes, styler, resample, iterrows, groupby_many_groups, concat_many, str_replace_regex.
