# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T11:52:10Z |
| Iteration Count | 284 |
| Best Metric | 638 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — (pending CI) |
| Issue | #131 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, error, accepted, accepted, error, error, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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

- **Iter 284**: Fast-forward canonical to main (633) + 5 new pairs (truncate_series, truncate_dataframe, xs_dataframe, update_series, str_findall). Canonical now at 638.
- **Iter 283**: Re-applied iter 282's changes. Fast-forward canonical branch to main (633) + 4 new option-variant pairs. Canonical at 637.
- **Key insight**: Iters 277-283 had wrong-branch push issues. Canonical `autoloop/perf-comparison` was at 508 until iter 283 fast-forwarded it to main.
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

- **Add more benchmarks** (637 pairs on canonical branch):
  1. Continue adding option-variant benchmarks for axis/limit/method parameters
  2. Check for any new src/ modules added to the tsb library
  3. Look at interpolate limitDirection variants, quantile skipna variants, etc.

---

## 📊 Iteration History

### Iteration 284 — 2026-04-23T11:52 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24833583304)

- **Status**: ✅ Accepted (PR pending CI)
- **Change**: Fast-forward canonical branch to main (633) + 5 new pairs (truncate_series, truncate_dataframe, xs_dataframe, update_series, str_findall)
- **Metric**: 638 (previous canonical: 633 from main, delta: +5)
- **Commit**: eb56027
- **Notes**: Added benchmarks for truncateSeries, truncateDataFrame, xsDataFrame, seriesUpdate, strFindall/strFindallCount — all previously unbenchmarked src/stats/ functions.

### Iteration 283 — 2026-04-23T05:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24819076022)

- **Status**: ✅ Accepted (PR pending CI)
- **Change**: Fast-forward canonical branch to main (633) + 4 new option-variant pairs (ffill_bfill_series_limit, ffill_bfill_df_limit, quantile_df_axis1, interpolate_df_axis1)
- **Metric**: 637 (previous canonical: 633 from main, delta: +4)
- **Commit**: 753483d
- **Notes**: Iter 282 claimed to add these same pairs but the push never landed on canonical. This iter confirms the branch is now at 637 with a fresh PR.

### Iteration 282 — 2026-04-22T22:17 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24805528063)

- **Status**: ✅ Accepted (PR pending CI)
- **Change**: Fast-forward canonical branch to main (633) + 4 new option-variant pairs (quantile_df_axis1, interpolate_df_axis1, ffill_bfill_df_limit, ffill_bfill_series_limit)
- **Metric**: 637 (previous canonical: 633 from main, delta: +4)
- **Commit**: 1585784
- **Notes**: Previous "best_metric: 639" was on wrong branches. Canonical was at 633 (main). Added 4 new option-variant pairs covering axis=1 and limit parameters.

### Iteration 281 — 2026-04-22T15:59 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24788564007)

- **Status**: ✅ Accepted (pending CI)
- **Change**: Merge main (633) + 6 new option-variant pairs
- **Metric**: 639 (claimed; push may not have landed)

### Iters 277–282 — ✅/⚠️ mix | metrics 382→637. Iters 277-281 had wrong-branch issues. Iter 282-283 fast-forwarded canonical to main (633) + option-variant pairs.

### Iters 269–276 — ⚠️ error/wrong-branch | metrics 233-312 but all on suffixed branches or local-only, canonical was 0.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
