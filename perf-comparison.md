# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-19T23:46:00Z |
| Iteration Count | 242 |
| Best Metric | 588 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #150 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | local-only, local-only, local-only, local-only, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: #150
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **New canonical baseline is 588** (iter 242, pushed to PR #150). Cherry-picked all 10 commits from `origin/autoloop/perf-comparison-8724e9f9` (adding 50 previously-stranded pairs) plus added 4 new benchmark pairs.
- **push_to_pull_request_branch IS available when safeoutputs are configured.** Iters 238-241 all failed locally; iter 242 succeeded.
- **CRITICAL**: Use `autoloop/perf-comparison` (PR #150). Metric = min(ts_bench_count, py_bench_count).
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- reindexSeries/reindexDataFrame support method: "ffill"|"bfill"|"nearest" with optional limit.
- shiftSeries/diffSeries are standalone exports.

---

## 🔭 Future Directions

- Continue adding benchmark pairs for remaining unbenchmarked functions (many still available).
- Look for functions in src/ not yet tested: more str* variants, more groupby/window variants, etc.

---

## 📊 Iteration History

### Iteration 242 — 2026-04-19 23:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24642049236)

- **Status**: ✅ Accepted | **Metric**: 588 (previous best: 534, delta: +54) | **Commit**: 8f477b6
- Cherry-picked 10 commits from `origin/autoloop/perf-comparison-8724e9f9` (+50 pairs) plus added 4 new: explode_series_fn, attrs_clear_copy_merge, attrs_crud, type_guards_batch. Successfully pushed to PR #150.

### Iters 231–241 — ⚠️/✅ mix | canonical metric 534→540; many local-only pushes failed due to safeoutputs unavailability.

### Iters 163–230 — ✅/⚠️ mix | metrics 508→534 on canonical branch. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline + all major functions benchmarked.
