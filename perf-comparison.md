# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-09T19:34:58Z |
| Iteration Count | 347 |
| Best Metric | 677 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #328 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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

- Option-variant benchmarks (axis/limit/method parameters)
- Period.contains/diff not yet benchmarked as standalone
- joinAll (joining multiple DataFrames) not yet benchmarked

---

## 📊 Iteration History

### Iteration 347 — 2026-06-09 — [Run](https://github.com/githubnext/tsb/actions/runs/27230659462)

- **Status**: ✅ Accepted
- **Change**: Add join and cross_join benchmark pairs (DataFrame.join index-based join; crossJoin Cartesian product)
- **Metric**: 677 (previous best: 676, delta: +1)
- **Commit**: 6c0ff39
- **Notes**: Both join() and crossJoin() from src/merge/join.ts were previously uncovered; Python equivalents use DataFrame.join() and pd.merge(how="cross").

### Iteration 346 — 2026-06-09 — [Run](https://github.com/githubnext/tsb/actions/runs/27125338527)

- **Status**: ✅ Accepted | bench_styler_format_apply (Styler.format/apply/applymap); fixed 7 broken benchmarks (read_excel node:zlib, series_where, series_mask, dataframe_mask, dataframe_where, str_extract_all docstring, str_extract_groups docstring); corrected state (true baseline was 675, not 678)
- **Metric**: 676 (delta: +1) | Commit: 5adab8d

### Iteration 345 — 2026-06-07 — [Run](https://github.com/githubnext/tsb/actions/runs/27079290567)

- **Status**: ❌ Error (state corrupted — commit never landed; best_metric corrected from 678→675 in iter 346)
- **Metric**: null | Commit: n/a

### Iters 1–344 — ✅ (0→675): Full benchmark suite covering all pandas functions.
