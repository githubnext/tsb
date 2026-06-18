# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-18T01:55:00Z |
| Iteration Count | 359 |
| Best Metric | 680 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #328 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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
- **bun build browser**: `node:zlib` polyfill lacks `inflateRawSync`; `bench_read_excel.ts` must be self-contained.
- **Function naming**: mask/where are operation-first: `maskSeries`, `maskDataFrame`, `whereSeries`, `whereDataFrame`.
- **Resample API**: Use `resampleSeries(s, "freq")` and `resampleDataFrame(df, "freq")` — Series/DataFrame do NOT have a `.resample()` method.
- **Resample frequencies**: Use base frequencies "H", "D", "MS", "QS", "YS" — NOT "1h".
- **Series constructor**: Use `new Series({ data: Array.from(arr), index: idx })` — NOT `new Series(arr, { index })`.
- **Nullable Series data**: Use `Scalar[]` type and `new Series<Scalar>({ data })` when mixing numbers and nulls — avoids TypeScript generic incompatibility with function signatures expecting `Series<Scalar>`.
- **State file accuracy**: Prior iters 343–358 claimed acceptance but commits were never pushed to branch; actual metric corrected to 675 in iter 359 (real baseline) → 680 (+5).

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)

---

## 📊 Iteration History

### Iteration 359 — 2026-06-18 01:55 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27731053478)
- **Status**: ✅ Accepted
- **Change**: Add 5 pairs: add_prefix_suffix_series, set_axis, series_to_frame, first_last_valid_index, options_system. Corrected state best_metric from 686 (stale/phantom) to 675→680.
- **Metric**: 680 (prev: 675 actual, delta: +5; state corrected from phantom 686)
- **Commit**: 424a089

### Iters 343–358 — ⚠️ State phantom (675 branch, 686 claimed): commits never landed on branch; state corrected in iter 359.

### Iters 1–342 — ✅ (0→675): Full benchmark suite covering all pandas functions.
