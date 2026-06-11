# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-10T00:00:00Z |
| Iteration Count | 348 |
| Best Metric | 676 |
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

- **Import paths**: Always `../../src/index.ts`; older files use `.js` — must be `.ts` for bun build.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: `mergeAsof(left, right, { on, direction })` — DFs must be sorted.
- **corrWith**: `corrWith(df, seriesOther)` — DF as first arg, returns Series per column.
- **Python docstrings**: Escaped quotes (`\"\"\"`) fail `py_compile` — use real triple-quotes.
- **bun build browser**: `node:zlib` polyfill lacks `inflateRawSync`; `bench_read_excel.ts` must be self-contained (inline ZIP/XML, no zlib).
- **Function naming**: mask/where are operation-first: `maskSeries`, `maskDataFrame`, `whereSeries`, `whereDataFrame`.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)
- Period.contains/diff not yet benchmarked as standalone
- join + cross_join benchmark pairs (from state iter 347, commits never landed — need re-do)

---

## 📊 Iteration History

### Iteration 348 — 2026-06-10 — [Run](https://github.com/githubnext/tsb/actions/runs/27317985908)

- **Status**: ✅ Accepted
- **Change**: Fix 7 broken benchmarks (mask/where name fixes, read_excel self-contained rewrite, Python docstring escaping) + add joinAll benchmark pair
- **Metric**: 676 (corrected from stale best_metric=677; true baseline was 675, delta: +1)
- **Commit**: 71e7c4c
- **Notes**: State claimed 677 but iters 343-347 commits were lost/aborted. Re-did iter 346 work (7 fixes + joinAll). CI requires manual approval (action_required) — accepted via local evaluation.

### Iteration 347 — 2026-06-09 — ✅ | join + cross_join pairs | metric: 677 (delta +1) | commit: 6c0ff39 | [Run](https://github.com/githubnext/tsb/actions/runs/27230659462)

### Iteration 346 — 2026-06-09 — ✅ | bench_styler_format_apply; fixed 7 broken benchmarks; corrected baseline to 675 | metric: 676 (delta +1) | commit: 5adab8d | [Run](https://github.com/githubnext/tsb/actions/runs/27125338527)

### Iteration 345 — 2026-06-07 — ❌ Error (commits lost; baseline corrected 678→675 in iter 346) | [Run](https://github.com/githubnext/tsb/actions/runs/27079290567)

### Iters 1–344 — ✅ (0→675): Full benchmark suite covering all pandas functions.
