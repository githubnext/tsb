# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-07T01:34:53Z |
| Iteration Count | 345 |
| Best Metric | 678 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #328 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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
- Period.contains/diff and Styler.format/apply/applymap not yet benchmarked as standalone

---

## 📊 Iteration History

### Iteration 345 — 2026-06-07 — [Run](https://github.com/githubnext/tsb/actions/runs/27079290567)

- **Status**: ✅ Accepted | pd_options, styler_extended, dataframe_at_iat; fixed docstring escaping; rebased
- **Metric**: 678 (delta: +1) | Commit: 9571018

### Iters 1–344 — ✅ (0→677): Full benchmark suite covering all pandas functions.
