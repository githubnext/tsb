# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T15:59:14Z |
| Iteration Count | 281 |
| Best Metric | 639 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — (pending) |
| Steering Issue | #131 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, error, accepted, accepted, error, error, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: — (pending)
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Iter 281**: Canonical branch was at 508 (iter 158). Fast-forward merged main (633) + 6 new option-API pairs = 639. Push pending via PR creation.
- **Iter 280**: Merge main (633 pairs) into canonical branch (was at 508) + 6 new pairs. Result: 639 on canonical branch.
- **Key insight**: Previous iters 277-279 updated state file best_metric (638) but committed to suffixed/wrong branches. The canonical `autoloop/perf-comparison` was still at 508.
- **Iter 279**: Merge main (+125 pairs) + 5 new pairs (diffSeries/shiftSeries options, dataFrameFfill axis=1, any/all skipna, nunique). Result: 638.
- **Iter 278**: Fixed 300+ API bugs (wrong names, method→standalone, rollingQuantile args, fromDictOriented). pgid kill. Result: 532.
- **subprocess timeout**: `Popen` + `start_new_session=True`, then `os.killpg(pgid, SIGKILL)`.
- **Import paths**: `../../src/index.ts` not `"tsb"`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **Standalones**: cummax/cummin/cumprod/cumsum/diff/explode/pct_change/seriesAbs/where/mask/sample/replace/astype/pivot.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 508 pairs. Use parallel Python runner.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input. Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- **Add more benchmarks** (639 pairs, canonical branch up to date):
  1. Continue adding benchmarks for new functions as tsb library grows
  2. Look for any remaining options-API variants not yet benchmarked
  3. Check for any new src/ modules added since iteration 280

---

## 📊 Iteration History

### Iteration 281 — 2026-04-22T15:59 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24788564007)

- **Status**: ✅ Accepted (pending CI)
- **Change**: Merge main (633 pairs) into canonical branch + 6 new option-variant pairs (any_all_axis1, nunique_axis1, diff_series_periods, shift_fillvalue, dataframe_diff_axis1, dataframe_shift_axis1)
- **Metric**: 639 (previous: 508 on canonical; after merge+new: 639)
- **Commit**: fcc5985

### Iteration 280 — 2026-04-22T08:37 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24768692351)

- **Status**: ✅ Accepted (push failed, canonical stayed at 508)
- **Change**: Merge main (633) + 6 new pairs (same strategy as iter 281 but push failed)
- **Metric**: 639 (claimed, but canonical was 508 after this run)

### Iter 277–280 — ✅/⚠️ mix | metrics 382→639 on canonical branch. Key: iters 277-279 committed to wrong/suffixed branches; iter 280 merged main (633) + 6 new on canonical; iter 281 merged main again (iter 158→633 on canonical) + 6 new option-API pairs.

### Iters 269–276 — ⚠️ error/wrong-branch | metrics 233-312 but all on suffixed branches or local-only, canonical was 0.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
