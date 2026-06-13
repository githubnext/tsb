# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-13T08:02:34Z |
| Iteration Count | 351 |
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
- **bun build browser**: `node:zlib` polyfill lacks `inflateRawSync`; `bench_read_excel.ts` must be self-contained (inline ZIP/XML, no zlib).
- **Function naming**: mask/where are operation-first: `maskSeries`, `maskDataFrame`, `whereSeries`, `whereDataFrame`.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)
- Period.contains/diff not yet benchmarked as standalone
- crossJoin (Cartesian product join) benchmark pair
- join (label-based two-DF join with multiple how-variants) benchmark pair
- resample agg() with per-column spec (DataFrameResampler.agg({col: "sum", ...}))

---

## 📊 Iteration History

### Iteration 351 — 2026-06-13 — [Run](https://github.com/githubnext/tsb/actions/runs/27461056868)

- **Status**: ✅ Accepted
- **Change**: Add `resample_ohlc` and `resample_df` benchmark pairs (bench_resample_ohlc.ts/py, bench_resample_df.ts/py)
- **Metric**: 677 (previous best: 676, delta: +1)
- **Commit**: 664158d
- **Notes**: OHLC aggregation (resampleSeries→ohlc) + DataFrame mean resampling (resampleDataFrame→mean). Python compiles OK; bun not in sandbox so CI validates TS.

### Iters 345–350 — ✅/❌ (675→676): join, crossJoin, joinAll added; 7 broken benchmarks fixed (mask/where naming, read_excel, Python docstrings); baseline corrections due to rebases.

### Iters 1–344 — ✅ (0→675): Full benchmark suite covering all pandas functions.
