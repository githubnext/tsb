# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-04T19:34:45Z |
| Iteration Count | 342 |
| Best Metric | 675 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #328 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: #328

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: Always `../../src/index.ts` for all benchmark files (recent style; older files use `.js`).
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: `mergeAsof(left, right, { on, direction })` — DFs must be sorted.
- **corrWith**: `corrWith(df, seriesOther)` — DF as first arg, returns Series per column.
- **bun in sandbox**: `bun` may not be available in the sandbox — TS validation is skipped locally; CI gate on GitHub Actions validates TS benchmarks.
- **Python docstring escaping**: Python benchmark files with escaped quotes (`\"\"\"`) instead of real triple-quotes will fail `py_compile` and block the entire evaluation. Fix any such files immediately.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- More string_accessor variants: startswith, endswith
- Option-variant benchmarks (axis/limit/method parameters)
- Period.contains / Period.diff variants not yet benchmarked

---

## 📊 Iteration History

### Iteration 342 — 2026-06-04T19:34:45Z — [Run](https://github.com/githubnext/tsb/actions/runs/26974794187)

- **Status**: ✅ Accepted
- **Change**: Added 2 benchmark pairs: `to_json_denormalize` (toJsonDenormalize/toJsonRecords/toJsonSplit/toJsonIndex), `cut_bins_to_frame` (cutBinsToFrame/cutBinCounts/binEdges)
- **Metric**: 675 (previous best: 674, delta: +1)
- **Commit**: 46d46aa

### Iters 321–341 — ✅ | 665→674: readHtml, options_ops, to_json_denormalize, pd_api, elem_ops, clip_with_bounds, format_table, numeric_extended, join/joinAll/crossJoin, sort_ops, cut_bins, resample, merge_ordered, na_ops, rename_ops, math_ops, value_counts, notna_boolean, window_extended, abs_round, autocorr, extensions, window_indexers, pd_errors.

### Iters 1–320 — ✅ | Metrics 0→665: Built out full benchmark suite.
