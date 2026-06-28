# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-28T08:03:00Z |
| Iteration Count | 378 |
| Best Metric | 723 |
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

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent.
**Metric**: benchmarked_functions (higher is better) · **PR**: #361 · **Issue**: #221

---

## 🎯 Current Priorities

*(No specific priorities set — exploring freely.)*

---

## 📚 Lessons Learned

- Import: `../../src/index.ts`. groupby AggName: sum/mean/min/max/count/std/first/last/size.
- mergeAsof: sorted DFs required. corrWith: df first arg. Python: real triple-quotes only.
- Resample: "H","D","MS","QS","YS". Series: `new Series({data,index})`. metric=min(TS,PY).

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks; join/crossJoin with overlapping columns using suffixes.

---

## 📊 Iteration History

### Iter 378 — 2026-06-28 — [Run §28315875254](https://github.com/githubnext/tsb/actions/runs/28315875254)
✅ +3 pairs → 723: merge_ordered_ffill, merge_ordered_by, grouper_class · commit b5584cf

### Iters 291–377 — ✅ 503→720 (summarized):
291–339: IO/reshape/window/stats/string/datetime coverage. 340–362: sample/pivot/rolling/rank/clip/diff/replace/mask/sort/pct_change. 363–377: merge_asof, cross_join, join_all, shift, sort, at/iat, convert_dtypes, styler, resample, iterrows, groupby_many_groups, concat_many, str_replace_regex (+more).
